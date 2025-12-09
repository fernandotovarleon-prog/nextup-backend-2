// server.js
// NextUp backend with simple SaaS signup (Phase 1) + admin config endpoint

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- DATABASE SETUP ----------

// Connect to PostgreSQL using DATABASE_URL from Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
    ? { rejectUnauthorized: false }
    : false
});

// Create 'shops' table if it doesn't exist
async function initDb() {
  const sql = `
    CREATE TABLE IF NOT EXISTS shops (
      id SERIAL PRIMARY KEY,
      shop_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      admin_secret TEXT NOT NULL,
      subscription_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await pool.query(sql);
  console.log("✅ shops table ready");
}

initDb().catch(err => {
  console.error("Error initializing database:", err);
});

// Helper to slugify shop name into a shop_id
function makeShopId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- HEALTH CHECK ----------

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "ok", uptime: process.uptime() });
  } catch (err) {
    console.error("Health DB error:", err);
    res.status(500).json({ status: "error", db: "error" });
  }
});

// ---------- SIMPLE SAAS SIGNUP ----------

// POST /api/shops/signup
// Body: { shopName: string, ownerEmail: string }
app.post("/api/shops/signup", async (req, res) => {
  const { shopName, ownerEmail } = req.body || {};

  if (!shopName || !ownerEmail) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const shopId = makeShopId(shopName);
  const adminSecret = crypto.randomBytes(16).toString("hex");

  try {
    const insertSql = `
      INSERT INTO shops (shop_id, name, owner_email, admin_secret, subscription_status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING shop_id, name, owner_email, admin_secret, subscription_status, created_at
    `;
    const result = await pool.query(insertSql, [
      shopId,
      shopName,
      ownerEmail,
      adminSecret
    ]);

    const row = result.rows[0];

    res.json({
      ok: true,
      shopId: row.shop_id,
      shopName: row.name,
      ownerEmail: row.owner_email,
      adminSecret: row.admin_secret,
      subscriptionStatus: row.subscription_status,
      createdAt: row.created_at
    });
  } catch (err) {
    console.error("Error inserting shop:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "shop_id_exists",
        shopId
      });
    }

    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/shops
// Simple list of all shops
app.get("/api/shops", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT shop_id, name, owner_email, subscription_status, created_at FROM shops ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error listing shops:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---------- ADMIN CONFIG ENDPOINT ----------
// GET /api/shops/:shopId/config?adminSecret=...
// Used by the iPad app to log in as a shop admin.

app.get("/api/shops/:shopId/config", async (req, res) => {
  const shopId = req.params.shopId;
  const adminSecret = req.query.adminSecret;

  if (!adminSecret) {
    return res.status(400).json({ error: "missing_admin_secret" });
  }

  try {
    const result = await pool.query(
      "SELECT shop_id, name, subscription_status, admin_secret FROM shops WHERE shop_id = $1",
      [shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "shop_not_found" });
    }

    const row = result.rows[0];

    if (row.admin_secret !== adminSecret) {
      return res.status(401).json({ error: "invalid_admin_secret" });
    }

    res.json({
      ok: true,
      shopId: row.shop_id,
      shopName: row.name,
      subscriptionStatus: row.subscription_status
    });
  } catch (err) {
    console.error("Error in admin config:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---------- DEMO IN-MEMORY DATA (still here for testing) ----------

const demoShops = {
  "demo-shop": {
    id: "demo-shop",
    name: "NextUp Demo Shop",
    barbers: [
      { id: "b1", name: "Alex" },
      { id: "b2", name: "Jay" }
    ],
    services: [
      { id: "s1", name: "Regular Cut", durationMinutes: 30, price: 25 },
      { id: "s2", name: "Fade & Beard", durationMinutes: 45, price: 40 }
    ]
  }
};

const demoAppointments = {
  "demo-shop": [
    {
      id: "a1",
      clientName: "John Doe",
      clientPhone: "555-123-4567",
      barberId: "b1",
      serviceId: "s1",
      dateISO: "2025-01-01T15:00:00Z",
      isWalkIn: false,
      status: "waiting"
    }
  ]
};

app.get("/shops/:shopId/config", (req, res) => {
  const shop = demoShops[req.params.shopId];
  if (!shop) return res.status(404).json({ error: "Shop not found" });
  res.json(shop);
});

app.get("/shops/:shopId/appointments", (req, res) => {
  res.json(demoAppointments[req.params.shopId] || []);
});

app.post("/shops/:shopId/appointments", (req, res) => {
  const shopId = req.params.shopId;
  const shop = demoShops[shopId];
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const { clientName, clientPhone, barberId, serviceId, dateISO, isWalkIn } = req.body;

  const newAppt = {
    id: "a_" + Date.now(),
    clientName,
    clientPhone,
    barberId,
    serviceId,
    dateISO,
    isWalkIn: !!isWalkIn,
    status: "waiting"
  };

  if (!demoAppointments[shopId]) demoAppointments[shopId] = [];
  demoAppointments[shopId].push(newAppt);

  res.status(201).json(newAppt);
});

// ---------- START SERVER ----------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NextUp backend running on port ${PORT}`);
});