// index.js – NextUp backend (Render / Node / Express)

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

// --- Basic setup -------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 3000;

// Postgres connection (Render DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : undefined,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper: base URL (so booking_url is correct)
function getBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.get('host')}`;
}

// Helper: generate shop id + admin secret
function makeShopId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${slug || 'shop'}-${rand}`;
}

function makeAdminSecret() {
  return crypto.randomBytes(16).toString('hex');
}

// --- Root --------------------------------------------------------------------

app.get('/', (req, res) => {
  res.send('NextUp backend is running.');
});

// --- Signup page (frontend) --------------------------------------------------

app.get('/signup', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.send(`
    <html>
      <head>
        <title>NextUp Signup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            background: radial-gradient(circle at top, #20232b, #050608);
            color: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: rgba(9, 10, 14, 0.95);
            border-radius: 20px;
            padding: 24px 28px 20px;
            box-shadow: 0 18px 55px rgba(0, 0, 0, 0.75);
            width: 100%;
            max-width: 420px;
            border: 1px solid rgba(255, 255, 255, 0.03);
          }
          .logo {
            font-weight: 700;
            font-size: 18px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .logo span {
            display: inline-block;
            width: 18px;
            height: 18px;
            border-radius: 999px;
            border: 2px solid #4f8cff;
            border-top-color: transparent;
            border-right-color: transparent;
            transform: rotate(45deg);
            margin-right: 6px;
            position: relative;
            top: 2px;
          }
          h1 {
            font-size: 22px;
            margin: 4px 0 2px 0;
          }
          .subtitle {
            font-size: 13px;
            color: #a0a4ae;
            margin-bottom: 18px;
          }
          label {
            display: block;
            font-size: 13px;
            margin-bottom: 4px;
          }
          input {
            width: 100%;
            box-sizing: border-box;
            border-radius: 10px;
            border: 1px solid #353742;
            background: #101119;
            color: #f5f5f5;
            padding: 9px 11px;
            font-size: 14px;
            margin-bottom: 12px;
            outline: none;
          }
          input:focus {
            border-color: #4f8cff;
            box-shadow: 0 0 0 1px rgba(79,140,255,0.4);
          }
          button {
            width: 100%;
            border-radius: 11px;
            border: none;
            padding: 11px 0;
            font-size: 15px;
            font-weight: 600;
            background: #4f8cff;
            color: #f5f5f5;
            cursor: pointer;
            margin-top: 6px;
          }
          button:hover {
            background: #3f74d1;
          }
          .note {
            margin-top: 14px;
            font-size: 11px;
            color: #80838c;
          }
          .result {
            margin-top: 14px;
            font-size: 12px;
            border-radius: 12px;
            padding: 10px 12px;
            background: rgba(16, 112, 67, 0.18);
            border: 1px solid rgba(30, 190, 114, 0.35);
            color: #ccf5db;
            display: none;
          }
          .result code {
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 12px;
          }
          .error {
            margin-top: 10px;
            font-size: 12px;
            color: #ff7b8b;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo"><span></span>NEXTUP</div>
          <h1>Barbershop signup</h1>
          <div class="subtitle">
            Create your shop ID and admin secret. Paste these into the NextUp iPad app to connect.
          </div>
          <form id="signup-form">
            <label>Shop name</label>
            <input name="name" placeholder="Gallari Barbershop" required />
            <label>Owner email</label>
            <input name="email" type="email" placeholder="you@example.com" required />
            <button type="submit">Create My Shop</button>
          </form>
          <div id="error" class="error"></div>
          <div id="result" class="result"></div>
          <div class="note">
            This page is just for shop owners. Clients will use your public booking link.
          </div>
        </div>

        <script>
          const form = document.getElementById('signup-form');
          const resultBox = document.getElementById('result');
          const errorBox = document.getElementById('error');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorBox.style.display = 'none';
            resultBox.style.display = 'none';

            const name = form.elements['name'].value.trim();
            const email = form.elements['email'].value.trim();

            if (!name || !email) {
              errorBox.textContent = 'Please fill in both fields.';
              errorBox.style.display = 'block';
              return;
            }

            try {
              const resp = await fetch('${baseUrl}/api/shops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ownerEmail: email })
              });

              if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(txt || 'Request failed');
              }

              const data = await resp.json();
              resultBox.innerHTML =
                '<strong>Shop created successfully!</strong><br/><br/>' +
                'Shop ID: <code>' + data.shop_id + '</code><br/>' +
                'Admin Secret: <code>' + data.admin_secret + '</code><br/><br/>' +
                'Booking link: <code>${baseUrl}/book/' + data.shop_id + '</code><br/><br/>' +
                'Save these — you will need them to log into the NextUp app.';
              resultBox.style.display = 'block';
            } catch (err) {
              errorBox.textContent = 'Error: ' + err.message;
              errorBox.style.display = 'block';
            }
          });
        </script>
      </body>
    </html>
  `);
});

// --- API: create shop --------------------------------------------------------

app.post('/api/shops', async (req, res) => {
  try {
    const { name, ownerEmail } = req.body;

    if (!name || !ownerEmail) {
      return res.status(400).json({ error: 'name and ownerEmail are required' });
    }

    const shopId = makeShopId(name);
    const adminSecret = makeAdminSecret();

    const result = await pool.query(
      `INSERT INTO shops (shop_id, name, owner_email, admin_secret, subscription_status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING shop_id, name, owner_email, admin_secret, subscription_status`,
      [shopId, name, ownerEmail, adminSecret, 'active']  // default "active" for now
    );

    const shop = result.rows[0];
    res.json({
      shop_id: shop.shop_id,
      name: shop.name,
      owner_email: shop.owner_email,
      admin_secret: shop.admin_secret,
      subscription_status: shop.subscription_status
    });
  } catch (err) {
    console.error('Error creating shop', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- API: list shops ---------------------------------------------------------

app.get('/api/shops', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT shop_id, name, owner_email, subscription_status, created_at FROM shops ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing shops', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- API: shop config for app ------------------------------------------------

app.get('/api/shops/:shopId/config', async (req, res) => {
  const { shopId } = req.params;
  try {
    const result = await pool.query(
      'SELECT shop_id, name, owner_email, subscription_status FROM shops WHERE shop_id = $1',
      [shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const shop = result.rows[0];
    const base = getBaseUrl(req);

    res.json({
      shop_id: shop.shop_id,
      name: shop.name,
      owner_email: shop.owner_email,
      subscription_status: shop.subscription_status,
      booking_url: `${base}/book/${shop.shop_id}`
    });
  } catch (err) {
    console.error('Error getting shop config', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- API: bookings list for app ---------------------------------------------

app.get('/api/shops/:shopId/bookings', async (req, res) => {
  const { shopId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id,
              shop_id,
              client_name,
              client_phone,
              barber_name,
              service_name,
              notes,
              status,
              is_walk_in,
              time_iso
       FROM bookings
       WHERE shop_id = $1
       ORDER BY time_iso ASC`,
      [shopId]
    );
    // The app expects an array of JSON objects
    res.json(result.rows.map(row => ({
      id: row.id,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      barberName: row.barber_name,
      serviceName: row.service_name,
      notes: row.notes,
      status: row.status || 'waiting',
      isWalkIn: row.is_walk_in || false,
      timeIso: row.time_iso
    })));
  } catch (err) {
    console.error('Error listing bookings', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// (Optional) API to create booking programmatically (not used yet by form)
app.post('/api/shops/:shopId/bookings', async (req, res) => {
  const { shopId } = req.params;
  const {
    clientName,
    clientPhone,
    barberName,
    serviceName,
    notes,
    status = 'waiting',
    isWalkIn = false,
    timeIso
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO bookings
         (shop_id, client_name, client_phone, barber_name, service_name, notes, status, is_walk_in, time_iso)
       VALUES
         ($1,      $2,          $3,          $4,          $5,          $6,    $7,     $8,        $9)`,
      [shopId, clientName, clientPhone, barberName, serviceName, notes, status, isWalkIn, timeIso]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error creating booking', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Public booking page -----------------------------------------------------

app.get('/book/:shopId', async (req, res) => {
  const { shopId } = req.params;
  const baseUrl = getBaseUrl(req);

  try {
    const result = await pool.query(
      'SELECT shop_id, name, subscription_status FROM shops WHERE shop_id = $1',
      [shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Shop not found – NextUp</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", sans-serif;
                background: #0f1012;
                color: #f5f5f5;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .card {
                background: #181a1f;
                border-radius: 16px;
                padding: 24px 28px;
                box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6);
                max-width: 420px;
                text-align: center;
              }
              .title {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
              }
              .subtitle {
                font-size: 14px;
                color: #b0b3b8;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">Shop not found</div>
              <div class="subtitle">
                This booking link is not active. Ask your barber to re-create it from the NextUp signup page.
              </div>
            </div>
          </body>
        </html>
      `);
    }

    const shop = result.rows[0];

    // For now, allow booking even if subscription_status is "pending" / "active" / whatever
    // Later you can restrict this if you want.

    res.send(`
      <html>
        <head>
          <title>Book with ${shop.name} – NextUp</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", sans-serif;
              background: radial-gradient(circle at top, #20232b, #050608);
              color: #f5f5f5;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .card {
              background: rgba(9, 10, 14, 0.96);
              border-radius: 20px;
              padding: 24px 28px;
              box-shadow: 0 18px 55px rgba(0, 0, 0, 0.75);
              max-width: 480px;
              width: 100%;
              border: 1px solid rgba(255, 255, 255, 0.04);
            }
            h1 {
              font-size: 22px;
              margin: 0 0 6px 0;
            }
            p {
              margin: 0 0 16px 0;
              color: #b0b3b8;
              font-size: 14px;
            }
            label {
              display: block;
              font-size: 13px;
              margin-bottom: 4px;
            }
            input, textarea {
              width: 100%;
              box-sizing: border-box;
              border-radius: 10px;
              border: 1px solid #343843;
              padding: 9px 11px;
              background: #101119;
              color: #f5f5f5;
              font-size: 14px;
              margin-bottom: 12px;
              outline: none;
            }
            input:focus, textarea:focus {
              border-color: #4f8cff;
              box-shadow: 0 0 0 1px rgba(79,140,255,0.4);
            }
            button {
              width: 100%;
              border-radius: 11px;
              border: none;
              padding: 11px 0;
              font-size: 15px;
              font-weight: 600;
              background: #4f8cff;
              color: #f5f5f5;
              cursor: pointer;
              margin-top: 4px;
            }
            button:hover {
              background: #3f74d1;
            }
            .note {
              margin-top: 10px;
              font-size: 11px;
              color: #8c909b;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${shop.name}</h1>
            <p>Request your spot with NextUp. Your barber will confirm the time.</p>
            <form>
              <label>Full name</label>
              <input name="name" placeholder="Your name" required />
              <label>Phone</label>
              <input name="phone" type="tel" placeholder="(555) 123-4567" required />
              <label>Service</label>
              <input name="service" placeholder="Haircut, beard, etc." />
              <label>Preferred date & time</label>
              <input name="time" type="datetime-local" />
              <label>Notes (optional)</label>
              <textarea name="notes" rows="3" placeholder="Anything your barber should know?"></textarea>
              <button type="submit">Request booking</button>
              <div class="note">
                This is a demo form for NextUp. In a later version we’ll show a success screen here.
              </div>
            </form>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error in /book route', err);
    res.status(500).send('Server error');
  }
});

// --- Start server ------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`NextUp backend listening on port ${PORT}`);
});