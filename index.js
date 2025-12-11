// index.js
// Simple NextUp backend: shop signup, customer booking page, and API for the iPad app.

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

// Let Express read form fields & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- In-memory data (for now) ---
// This will reset when Render restarts. Later we'll move to Postgres.

const shops = [];      // { id, name, ownerName, email, createdAt }
const bookings = [];   // { id, shopId, clientName, clientPhone, barberName, serviceName, isoDateTime, notes }

// --- Helpers ---

function generateId(prefix) {
  return (
    prefix +
    "_" +
    Math.random().toString(36).substring(2, 8) +
    Math.random().toString(36).substring(2, 6)
  );
}

function htmlPage({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root {
    --bg: #050510;
    --card: #111322;
    --accent: #4f46e5;
    --accent-soft: rgba(79,70,229,0.08);
    --border: rgba(255,255,255,0.06);
    --text-main: #f9fafb;
    --text-muted: #9ca3af;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    background: radial-gradient(circle at top, #1f2933 0, #020617 55%);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .shell {
    width: 100%;
    max-width: 420px;
  }
  .card {
    background: var(--card);
    border-radius: 24px;
    border: 1px solid var(--border);
    padding: 24px 22px 20px;
    box-shadow:
      0 22px 60px rgba(0,0,0,0.55),
      0 0 0 1px rgba(148,163,184,0.02);
  }
  h1 {
    font-size: 1.3rem;
    margin: 0 0 4px;
    letter-spacing: 0.03em;
  }
  .subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 8px;
  }
  label {
    font-size: 0.78rem;
    color: var(--text-muted);
    display: block;
    margin-bottom: 4px;
  }
  input, textarea, select {
    width: 100%;
    border-radius: 999px;
    border: 1px solid rgba(148,163,184,0.45);
    background: rgba(15,23,42,0.85);
    color: var(--text-main);
    font-size: 0.85rem;
    padding: 10px 13px;
    outline: none;
  }
  textarea {
    border-radius: 14px;
    resize: vertical;
    min-height: 70px;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px rgba(79,70,229,0.5);
  }
  button {
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #f9fafb;
    font-weight: 600;
    font-size: 0.9rem;
    padding: 11px 18px;
    cursor: pointer;
    margin-top: 4px;
  }
  button:hover {
    filter: brightness(1.08);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(15,23,42,0.95);
    border: 1px solid rgba(148,163,184,0.3);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-bottom: 10px;
  }
  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #22c55e;
  }
  .small {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 8px;
  }
  .field-group {
    display: flex;
    gap: 8px;
  }
  .field-group > div { flex: 1; }
  .message {
    font-size: 0.8rem;
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(22,163,74,0.08);
    border: 1px solid rgba(22,163,74,0.3);
    color: #bbf7d0;
    margin-bottom: 8px;
  }
  .message.error {
    background: rgba(220,38,38,0.08);
    border-color: rgba(220,38,38,0.4);
    color: #fecaca;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.75rem;
    padding: 3px 6px;
    border-radius: 999px;
    background: rgba(15,23,42,0.9);
    border: 1px dashed rgba(148,163,184,0.5);
  }
  a {
    color: #a5b4fc;
  }
</style>
</head>
<body>
  <div class="shell">
    <div class="card">
      ${body}
    </div>
  </div>
</body>
</html>`;
}

// --- Signup pages ---

function signupFormHTML(message) {
  return htmlPage({
    title: "NextUp · Shop Signup",
    body: `
      <div class="pill">
        <span class="pill-dot"></span>
        <span>Step 1 · Shop setup</span>
      </div>
      <h1>Set up your shop</h1>
      <div class="subtitle">Create your NextUp link so customers can book online.</div>
      ${message ? `<div class="message error">${message}</div>` : ""}
      <form method="POST" action="/signup">
        <div>
          <label>Shop name</label>
          <input name="shopName" placeholder="Gallari Barbershop" required />
        </div>
        <div>
          <label>Owner name (optional)</label>
          <input name="ownerName" placeholder="Your name" />
        </div>
        <div>
          <label>Contact email</label>
          <input name="email" type="email" placeholder="shop@email.com" required />
        </div>
        <div>
          <label>City (optional)</label>
          <input name="city" placeholder="Laredo, TX" />
        </div>
        <button type="submit">Create my booking link</button>
        <div class="small">
          You’ll get a unique URL for your shop right after this step.
        </div>
      </form>
    `
  });
}

function signupSuccessHTML(shop, adminSecret, bookingUrl, apiUrl) {
  return htmlPage({
    title: "NextUp · Shop Ready",
    body: `
      <div class="pill">
        <span class="pill-dot"></span>
        <span>Step 2 · Connected</span>
      </div>
      <h1>Your shop is ready</h1>
      <div class="subtitle">Share this link so customers can book online.</div>
      <div class="message">
        ✅ <strong>${shop.name}</strong> is now set up on NextUp.
      </div>

      <div style="margin-bottom: 10px;">
        <label>Your customer booking link</label>
        <div class="small" style="margin-top:4px; margin-bottom:4px;">Share on Instagram, text, or show as QR in the shop.</div>
        <code>${bookingUrl}</code>
      </div>

      <div style="margin-bottom: 10px;">
        <label>Your shop ID</label>
        <div class="small" style="margin-top:4px; margin-bottom:4px;">Paste this into the iPad app under the Cloud tab.</div>
        <code>${shop.id}</code>
      </div>

      <div style="margin-bottom: 10px;">
        <label>Admin secret</label>
        <div class="small" style="margin-top:4px; margin-bottom:4px;">Keep this private. Paste into the Cloud tab as the admin secret.</div>
        <code>${adminSecret}</code>
      </div>

      <div style="margin-bottom: 10px;">
        <label>iPad app API endpoint</label>
        <div class="small" style="margin-top:4px; margin-bottom:4px;">This is what the NextUp app uses to import bookings.</div>
        <code>${apiUrl}</code>
      </div>

      <div class="small" style="margin-top:12px;">
        Next steps:<br/>
        1️⃣ Paste Shop ID + Admin secret into the <strong>Cloud</strong> tab in the NextUp iPad app.<br/>
        2️⃣ Turn on “Enable cloud sync”.<br/>
        3️⃣ Use this booking link wherever your clients find you.
      </div>

      <div class="small" style="margin-top:14px;">
        Want to add another shop? <a href="/signup">Set up another shop</a>.
      </div>
    `
  });
}

// --- Booking page ---

function bookingFormHTML(shop, message) {
  return htmlPage({
    title: `Book · ${shop.name} · NextUp`,
    body: `
      <div class="pill">
        <span class="pill-dot"></span>
        <span>Booking · ${shop.name}</span>
      </div>
      <h1>Book your spot</h1>
      <div class="subtitle">Fill this out and you’ll show up in the shop’s NextUp queue.</div>
      ${message ? `<div class="message">${message}</div>` : ""}
      <form method="POST" action="/book/${shop.id}">
        <div>
          <label>Full name</label>
          <input name="clientName" placeholder="Your name" required />
        </div>
        <div>
          <label>Phone number</label>
          <input name="clientPhone" placeholder="(555) 123-4567" required />
        </div>
        <div class="field-group">
          <div>
            <label>Preferred barber (optional)</label>
            <input name="barberName" placeholder="Any / Mike / Alex" />
          </div>
          <div>
            <label>Service</label>
            <input name="serviceName" placeholder="Regular cut, Fade, etc." required />
          </div>
        </div>
        <div class="field-group">
          <div>
            <label>Date</label>
            <input name="date" type="date" required />
          </div>
          <div>
            <label>Time</label>
            <input name="time" type="time" required />
          </div>
        </div>
        <div>
          <label>Notes (optional)</label>
          <textarea name="notes" placeholder="Any special request?"></textarea>
        </div>
        <button type="submit">Request booking</button>
        <div class="small">
          You’ll see your name appear on the shop’s NextUp screen when they approve you.
        </div>
      </form>
    `
  });
}

function bookingThanksHTML(shop) {
  return htmlPage({
    title: `Booked · ${shop.name} · NextUp`,
    body: `
      <div class="pill">
        <span class="pill-dot"></span>
        <span>Booking received</span>
      </div>
      <h1>Thanks, you’re in.</h1>
      <div class="subtitle">
        Your request was sent to <strong>${shop.name}</strong>. They’ll see you in their NextUp queue.
      </div>
      <div class="message">
        ✅ You can safely close this page now.
      </div>
      <div class="small">
        Need another booking at this shop?
        <a href="/book/${shop.id}">Book again</a>.
      </div>
    `
  });
}

// --- Routes ---

// Redirect root → signup for now
app.get("/", (req, res) => {
  res.redirect("/signup");
});

// Show signup form
app.get("/signup", (req, res) => {
  res.send(signupFormHTML(null));
});

// Handle signup submit
app.post("/signup", (req, res) => {
  const { shopName, ownerName, email, city } = req.body;

  if (!shopName || !email) {
    return res.send(
      signupFormHTML("Please fill in at least shop name and contact email.")
    );
  }

  const id = generateId("shop");
  const adminSecret = generateId("secret");

  const shop = {
    id,
    name: shopName,
    ownerName: ownerName || "",
    email,
    city: city || "",
    createdAt: new Date().toISOString()
  };

  shops.push(shop);

  const host = req.get("host");
  const protocol = req.protocol;
  const bookingUrl = `${protocol}://${host}/book/${id}`;
  const apiUrl = `${protocol}://${host}/api/shops/${id}/bookings`;

  res.send(signupSuccessHTML(shop, adminSecret, bookingUrl, apiUrl));
});

// Show booking form for a shop
app.get("/book/:shopId", (req, res) => {
  const shopId = req.params.shopId;
  const shop = shops.find((s) => s.id === shopId);

  if (!shop) {
    return res
      .status(404)
      .send(
        htmlPage({
          title: "Shop not found",
          body: `
            <h1>Shop not found</h1>
            <div class="subtitle">
              This booking link is not active. Ask your barber to re-create it from the NextUp setup page.
            </div>
          `
        })
      );
  }

  res.send(bookingFormHTML(shop, null));
});

// Handle booking submit
app.post("/book/:shopId", (req, res) => {
  const shopId = req.params.shopId;
  const shop = shops.find((s) => s.id === shopId);

  if (!shop) {
    return res
      .status(404)
      .send(
        htmlPage({
          title: "Shop not found",
          body: `<h1>Shop not found</h1>`
        })
      );
  }

  const {
    clientName,
    clientPhone,
    barberName,
    serviceName,
    date,
    time,
    notes
  } = req.body;

  if (!clientName || !clientPhone || !serviceName || !date || !time) {
    return res.send(
      bookingFormHTML(shop, "Please fill in name, phone, service, date, and time.")
    );
  }

  let isoDateTime;
  try {
    // Expect date as YYYY-MM-DD and time as HH:MM
    const combined = `${date}T${time}:00`;
    isoDateTime = new Date(combined).toISOString();
  } catch (e) {
    isoDateTime = new Date().toISOString();
  }

  const booking = {
    id: generateId("bk"),
    shopId,
    clientName,
    clientPhone,
    barberName: barberName || null,
    serviceName,
    isoDateTime,
    notes: notes || null
  };

  bookings.push(booking);

  res.send(bookingThanksHTML(shop));
});

// API for iPad app – list bookings for a shop
app.get("/api/shops/:shopId/bookings", (req, res) => {
  const shopId = req.params.shopId;
  const shopBookings = bookings.filter((b) => b.shopId === shopId);

  res.json(
    shopBookings.map((b) => ({
      id: b.id,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      barberName: b.barberName,
      serviceName: b.serviceName,
      isoDateTime: b.isoDateTime,
      notes: b.notes
    }))
  );
});

// Simple healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true, shops: shops.length, bookings: bookings.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`NextUp backend listening on port ${PORT}`);
});