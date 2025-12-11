// index.js
// NextUp backend – shop signup, customer booking, simple web dashboard
// for managing barbers & services, plus APIs for the iPad app.

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

// Let Express read form fields & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =====================
// In-memory data (for now)
// =====================
//
// NOTE: This all resets if Render restarts.
// Later we’ll move to a real database.
// ---------------------

/**
 * @typedef {Object} Barber
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} name
 * @property {number} durationMinutes
 * @property {number} price
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} Shop
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} [ownerName]
 * @property {string} [city]
 * @property {string} adminSecret
 * @property {string} createdAt
 * @property {Barber[]} barbers
 * @property {Service[]} services
 */

 /** @type {Shop[]} */
const shops = [];

/**
 * Bookings are separate so they don’t vanish when config changes
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} shopId
 * @property {string} clientName
 * @property {string} clientPhone
 * @property {string|null} barberName
 * @property {string} serviceName
 * @property {string} isoDateTime
 * @property {string|null} notes
 */

/** @type {Booking[]} */
const bookings = [];

// =====================
// Helpers
// =====================

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
    --bg: #050505;
    --card: #0f0f10;
    --border: #2a2a2a;
    --accent: #ffffff;
    --accent-soft: #1a1a1a;
    --text-main: #f5f5f5;
    --text-muted: #9b9b9b;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    background: var(--bg);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .shell {
    width: 100%;
    max-width: 480px;
  }

  .card {
    background: var(--card);
    border-radius: 20px;
    border: 1px solid var(--border);
    padding: 22px 20px 18px;
  }

  h1 {
    font-size: 1.35rem;
    margin: 0 0 4px;
    letter-spacing: 0.02em;
  }

  h2 {
    font-size: 0.95rem;
    margin: 16px 0 4px;
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

  input,
  textarea,
  select {
    width: 100%;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #050505;
    color: var(--text-main);
    font-size: 0.85rem;
    padding: 9px 12px;
    outline: none;
  }

  textarea {
    border-radius: 12px;
    resize: vertical;
    min-height: 70px;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: var(--accent);
  }

  button {
    border-radius: 999px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #000;
    font-weight: 600;
    font-size: 0.9rem;
    padding: 10px 16px;
    cursor: pointer;
    margin-top: 4px;
  }

  button:hover {
    filter: brightness(0.95);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--accent-soft);
    border: 1px solid var(--border);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #ffffff;
  }

  .small {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 8px;
  }

  .message {
    font-size: 0.78rem;
    padding: 7px 10px;
    border-radius: 999px;
    background: #080808;
    border: 1px solid #3a3a3a;
    color: var(--text-main);
    margin-bottom: 8px;
  }

  .message.error {
    border-color: #ff4b4b;
    color: #ffb3b3;
  }

  .field-group {
    display: flex;
    gap: 8px;
  }

  .field-group > div {
    flex: 1;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 999px;
    background: #050505;
    border: 1px solid var(--border);
    display: inline-block;
  }

  a {
    color: var(--accent);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  .muted {
    color: var(--text-muted);
  }

  .chip {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--text-muted);
  }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 16px 0;
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

// Seed some default barbers/services for a new shop
function defaultBarbers() {
  return [
    { id: generateId("barber"), name: "Any barber" },
    { id: generateId("barber"), name: "Chair 1" },
    { id: generateId("barber"), name: "Chair 2" }
  ];
}

function defaultServices() {
  return [
    {
      id: generateId("svc"),
      name: "Regular cut",
      durationMinutes: 30,
      price: 25,
      isActive: true
    },
    {
      id: generateId("svc"),
      name: "Fade & beard",
      durationMinutes: 45,
      price: 35,
      isActive: true
    },
    {
      id: generateId("svc"),
      name: "Beard trim",
      durationMinutes: 20,
      price: 15,
      isActive: true
    }
  ];
}

function findShop(shopId) {
  return shops.find((s) => s.id === shopId);
}

// =====================
// Signup pages
// =====================

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

function signupSuccessHTML(shop, bookingUrl, apiUrl, dashboardUrl) {
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
        <code>${shop.adminSecret}</code>
      </div>

      <div style="margin-bottom: 10px;">
        <label>iPad app API endpoint</label>
        <div class="small" style="margin-top:4px; margin-bottom:4px;">This is what the NextUp app uses to import bookings.</div>
        <code>${apiUrl}</code>
      </div>

      <div style="margin-bottom: 10px;">
        <label>Manage barbers & services</label>
        <div class="small" style="margin-top:4px; margin-bottom:4px;">
          Go here to edit barbers, services, prices and durations.
        </div>
        <code>${dashboardUrl}</code>
      </div>

      <div class="small" style="margin-top:12px;">
        Next steps:<br/>
        1️⃣ Paste Shop ID + Admin secret into the <strong>Cloud</strong> tab in the NextUp iPad app.<br/>
        2️⃣ Turn on “Enable cloud sync”.<br/>
        3️⃣ Use this booking link wherever your clients find you.<br/>
        4️⃣ Use the dashboard link to manage barbers & services.
      </div>

      <div class="small" style="margin-top:14px;">
        Want to add another shop? <a href="/signup">Set up another shop</a>.
      </div>
    `
  });
}

// =====================
// Booking pages
// =====================

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
            <label>Preferred barber</label>
            <select name="barberName">
              <option value="">Any barber</option>
              ${shop.barbers
                .map(
                  (b) =>
                    `<option value="${b.name.replace(
                      /"/g,
                      "&quot;"
                    )}">${b.name}</option>`
                )
                .join("")}
            </select>
          </div>
          <div>
            <label>Service</label>
            <select name="serviceName" required>
              ${shop.services
                .filter((s) => s.isActive)
                .map(
                  (s) =>
                    `<option value="${s.name.replace(
                      /"/g,
                      "&quot;"
                    )}">${s.name}</option>`
                )
                .join("")}
            </select>
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

// =====================
// Dashboard pages (barbers & services)
// =====================

function dashboardLoginHTML(message) {
  return htmlPage({
    title: "NextUp · Owner Login",
    body: `
      <div class="pill">
        <span class="pill-dot"></span>
        <span>Owner dashboard</span>
      </div>
      <h1>Manage your shop</h1>
      <div class="subtitle">Log in to edit barbers and services.</div>
      ${message ? `<div class="message error">${message}</div>` : ""}
      <form method="POST" action="/dashboard">
        <div>
          <label>Contact email</label>
          <input name="email" type="email" placeholder="shop@email.com" required />
        </div>
        <div>
          <label>Shop ID</label>
          <input name="shopId" placeholder="shop_xxx..." required />
        </div>
        <div>
          <label>Admin secret</label>
          <input name="adminSecret" placeholder="secret_xxx..." required />
        </div>
        <button type="submit">Open dashboard</button>
        <div class="small">
          You’ll find Shop ID and Admin secret on your signup success page.
        </div>
      </form>
    `
  });
}

function dashboardShopHTML(shop, message) {
  return htmlPage({
    title: `Dashboard · ${shop.name}`,
    body: `
      <div class="pill">
        <span class="pill-dot"></span>
        <span>Dashboard · ${shop.name}</span>
      </div>
      <h1>Barbers & services</h1>
      <div class="subtitle">These changes will feed into your NextUp app and booking link.</div>
      ${message ? `<div class="message">${message}</div>` : ""}

      <div style="margin-bottom:12px;">
        <div class="row">
          <span class="muted">Shop ID:</span>
          <code>${shop.id}</code>
        </div>
        <div class="row">
          <span class="muted">Admin secret:</span>
          <code>${shop.adminSecret}</code>
        </div>
      </div>

      <h2 style="font-size:0.9rem; margin-top:6px;">Barbers</h2>
      <div class="small" style="margin-bottom:6px;">
        These names appear in the app and on your booking page.
      </div>
      ${
        shop.barbers.length === 0
          ? `<div class="small muted">No barbers yet. Add your first barber below.</div>`
          : shop.barbers
              .map(
                (b) => `
        <form method="POST" action="/dashboard/shops/${shop.id}/barbers/delete" style="margin:0; padding:4px 0; display:flex; align-items:center; gap:8px;">
          <input type="hidden" name="barberId" value="${b.id}" />
          <span style="flex:1;">${b.name}</span>
          <button type="submit" style="background:#111827; border-radius:999px; padding:4px 10px; font-size:0.75rem;">Remove</button>
        </form>
      `
              )
              .join("")
      }

      <form method="POST" action="/dashboard/shops/${shop.id}/barbers/add" style="margin-top:8px;">
        <label>Add barber</label>
        <div class="field-group">
          <div>
            <input name="name" placeholder="New barber name" required />
          </div>
        </div>
        <button type="submit">Add barber</button>
      </form>

      <hr style="margin:18px 0; border:none; border-top:1px solid rgba(148,163,184,0.2);" />

      <h2 style="font-size:0.9rem; margin-top:0;">Services</h2>
      <div class="small" style="margin-bottom:6px;">
        Active services appear in the customer form and the app.
      </div>
      ${
        shop.services.length === 0
          ? `<div class="small muted">No services yet. Add your first service below.</div>`
          : shop.services
              .map(
                (s) => `
        <form method="POST" action="/dashboard/shops/${shop.id}/services/update" style="margin:0; padding:4px 0;">
          <input type="hidden" name="serviceId" value="${s.id}" />
          <div class="row">
            <strong>${s.name}</strong>
            <span class="chip">${s.isActive ? "Active" : "Hidden"}</span>
          </div>
          <div class="row">
            <span class="muted">Duration</span>
            <input name="durationMinutes" value="${s.durationMinutes}" style="max-width:80px;" />
          </div>
          <div class="row">
            <span class="muted">Price</span>
            <input name="price" value="${s.price}" style="max-width:80px;" />
          </div>
          <div class="row">
            <span class="muted">Status</span>
            <select name="isActive" style="max-width:120px;">
              <option value="true"${s.isActive ? " selected" : ""}>Active</option>
              <option value="false"${!s.isActive ? " selected" : ""}>Hidden</option>
            </select>
          </div>
          <div class="row" style="margin-top:4px;">
            <button type="submit">Save changes</button>
            <form method="POST" action="/dashboard/shops/${shop.id}/services/delete">
              <input type="hidden" name="serviceId" value="${s.id}" />
            </form>
          </div>
        </form>
      `
              )
              .join("")
      }

      <form method="POST" action="/dashboard/shops/${shop.id}/services/add" style="margin-top:8px;">
        <label>Add service</label>
        <div class="field-group">
          <div>
            <input name="name" placeholder="Service name" required />
          </div>
          <div>
            <input name="durationMinutes" placeholder="Minutes" />
          </div>
        </div>
        <div class="field-group">
          <div>
            <input name="price" placeholder="Price" />
          </div>
          <div>
            <select name="isActive">
              <option value="true" selected>Active</option>
              <option value="false">Hidden</option>
            </select>
          </div>
        </div>
        <button type="submit">Add service</button>
      </form>

      <div class="small" style="margin-top:12px;">
        Changes here will be reflected in your iPad app and booking form (after the app syncs).
      </div>
    `
  });
}

function marketingPageHTML() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>NextUp · Smart queue for barbershops</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    :root {
      --bg: #050505;
      --fg: #f5f5f5;
      --muted: #a1a1a1;
      --card: #0b0b0c;
      --border: #262626;
      --pill: #111111;
      --accent: #ffffff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
      background: radial-gradient(circle at top, #111111 0, #050505 60%);
      color: var(--fg);
      display: flex;
      justify-content: center;
      padding: 32px 16px;
    }

    .shell {
      width: 100%;
      max-width: 960px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      gap: 24px;
      align-items: center;
    }

    @media (max-width: 768px) {
      .hero {
        grid-template-columns: 1fr;
      }
    }

    .logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .logo-mark {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 600;
      background: #050505;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--pill);
      border: 1px solid var(--border);
      font-size: 0.7rem;
      color: var(--muted);
      margin-bottom: 10px;
    }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--accent);
    }

    h1 {
      font-size: 2.1rem;
      letter-spacing: 0.02em;
      margin: 0 0 8px;
    }

    .hero-subtitle {
      font-size: 0.95rem;
      color: var(--muted);
      max-width: 26rem;
      margin-bottom: 16px;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
    }

    .btn {
      border-radius: 999px;
      border: 1px solid var(--accent);
      padding: 10px 18px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: var(--accent);
      color: #000;
    }

    .btn-ghost {
      background: transparent;
      color: var(--fg);
    }

    .hero-note {
      font-size: 0.75rem;
      color: var(--muted);
    }

    .card {
      background: rgba(11,11,12,0.95);
      border-radius: 18px;
      border: 1px solid var(--border);
      padding: 18px 16px;
    }

    .card-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .card-big {
      font-size: 0.95rem;
      margin-bottom: 6px;
    }

    .card-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8rem;
      color: var(--muted);
    }

    .card-list li {
      margin-bottom: 4px;
    }

    .section-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 10px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 1rem;
    }

    .section-header p {
      margin: 0;
      font-size: 0.78rem;
      color: var(--muted);
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    @media (max-width: 768px) {
      .grid-3 {
        grid-template-columns: 1fr;
      }
    }

    .feature-card {
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 12px 11px;
      font-size: 0.8rem;
    }

    .feature-title {
      font-size: 0.82rem;
      margin-bottom: 4px;
    }

    .feature-text {
      color: var(--muted);
      font-size: 0.78rem;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      font-size: 0.8rem;
    }

    @media (max-width: 768px) {
      .steps {
        grid-template-columns: 1fr;
      }
    }

    .step-pill {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .footer {
      font-size: 0.75rem;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 8px;
      border-top: 1px solid var(--border);
      padding-top: 10px;
      margin-top: 4px;
    }

    a.text-link {
      color: var(--fg);
      text-decoration: none;
      border-bottom: 1px solid rgba(255,255,255,0.16);
      padding-bottom: 1px;
    }

    a.text-link:hover {
      border-bottom-color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="shell">

    <!-- HERO -->
    <section class="hero">
      <div>
        <div class="logo-row">
          <div class="logo-mark">N</div>
          <div style="font-size:0.82rem; color:var(--muted); letter-spacing:0.16em; text-transform:uppercase;">
            NextUp · Barber Queue
          </div>
        </div>
        <div class="pill">
          <span class="pill-dot"></span>
          <span>Built for barbershops</span>
        </div>
        <h1>Queue smarter. Cut faster.</h1>
        <p class="hero-subtitle">
          NextUp keeps your chairs full, your TV board clean, and your customers in the loop — all from one iPad.
        </p>
        <div class="hero-actions">
          <a href="/signup" class="btn btn-primary">
            Get started for your shop
          </a>
          <a href="/dashboard" class="btn btn-ghost">
            Owner login
          </a>
        </div>
        <p class="hero-note">
          No long setup. Shops get a booking link, admin dashboard, and in-shop display in minutes.
        </p>
      </div>

      <div class="card">
        <div class="card-title">Live in-shop view</div>
        <div class="card-big">What your iPad + TV can show:</div>
        <ul class="card-list">
          <li>• Current and next clients per barber</li>
          <li>• Walk-ins and appointments in one queue</li>
          <li>• QR code so clients can book from their phone</li>
          <li>• Simple status: waiting · in chair · done</li>
        </ul>
      </div>
    </section>

    <!-- FEATURES -->
    <section>
      <div class="section-header">
        <div>
          <div class="section-title">Why NextUp</div>
          <h2>Made for barbers, not spreadsheets.</h2>
        </div>
        <p>NextUp replaces the whiteboard, the sticky notes, and the “who’s next?” arguments.</p>
      </div>

      <div class="grid-3">
        <div class="feature-card">
          <div class="feature-title">Fast shop setup</div>
          <div class="feature-text">
            Create your shop once. Get a booking link, dashboard, and TV-ready queue without hiring a developer.
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-title">Online + walk-ins together</div>
          <div class="feature-text">
            Customers can book from your link while walk-ins are added from the iPad. Everyone lands in the same queue.
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-title">TV-mode built in</div>
          <div class="feature-text">
            Mirror your iPad to a TV and show a clean “who’s next” board with your logo and colors.
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section>
      <div class="section-header">
        <div>
          <div class="section-title">How it works</div>
          <h2>Three simple steps to go live.</h2>
        </div>
      </div>

      <div class="steps">
        <div>
          <div class="step-pill">Step 1</div>
          <p><strong>Create your shop</strong> on the web with your name, email, and basic details. We give you a shop ID and admin key.</p>
        </div>
        <div>
          <div class="step-pill">Step 2</div>
          <p><strong>Connect the iPad app</strong> by pasting your shop ID and key into the Cloud tab. Your barbers and services sync in.</p>
        </div>
        <div>
          <div class="step-pill">Step 3</div>
          <p><strong>Share your booking link</strong> on Instagram, Google, or by QR code in the shop. New bookings appear right in NextUp.</p>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <span>NextUp · Barber Queue</span>
      <span>
        <a href="/signup" class="text-link">Set up a shop</a>
        &nbsp;&middot;&nbsp;
        <a href="/dashboard" class="text-link">Owner login</a>
      </span>
    </footer>

  </div>
</body>
</html>`;
}

// =====================
// Routes
// =====================

// Root → marketing homepage
app.get("/", (req, res) => {
  res.send(marketingPageHTML());
});

// ----- Signup -----

app.get("/signup", (req, res) => {
  res.send(signupFormHTML(null));
});

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
    adminSecret,
    createdAt: new Date().toISOString(),
    barbers: defaultBarbers(),
    services: defaultServices()
  };

  shops.push(shop);

  const host = req.get("host");
  const protocol = req.protocol;
  const bookingUrl = `${protocol}://${host}/book/${id}`;
  const apiUrl = `${protocol}://${host}/api/shops/${id}/bookings`;
  const dashboardUrl = `${protocol}://${host}/dashboard/shops/${id}`;

  res.send(signupSuccessHTML(shop, bookingUrl, apiUrl, dashboardUrl));
});

// ----- Customer booking -----

app.get("/book/:shopId", (req, res) => {
  const shop = findShop(req.params.shopId);
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

app.post("/book/:shopId", (req, res) => {
  const shop = findShop(req.params.shopId);
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
    const combined = `${date}T${time}:00`;
    isoDateTime = new Date(combined).toISOString();
  } catch (e) {
    isoDateTime = new Date().toISOString();
  }

  const booking = {
    id: generateId("bk"),
    shopId: shop.id,
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

// ----- Owner dashboard -----

app.get("/dashboard", (req, res) => {
  res.send(dashboardLoginHTML(null));
});

app.post("/dashboard", (req, res) => {
  const { email, shopId, adminSecret } = req.body;

  const shop = shops.find(
    (s) => s.id === shopId && s.email === email && s.adminSecret === adminSecret
  );

  if (!shop) {
    return res.send(
      dashboardLoginHTML("We couldn't find a shop with that combination. Check your email, Shop ID and Admin secret.")
    );
  }

  res.redirect(`/dashboard/shops/${shop.id}`);
});

app.get("/dashboard/shops/:shopId", (req, res) => {
  const shop = findShop(req.params.shopId);
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

  res.send(dashboardShopHTML(shop, null));
});

// Add barber
app.post("/dashboard/shops/:shopId/barbers/add", (req, res) => {
  const shop = findShop(req.params.shopId);
  if (!shop) return res.redirect("/dashboard");

  const { name } = req.body;
  if (name && name.trim().length > 0) {
    shop.barbers.push({
      id: generateId("barber"),
      name: name.trim()
    });
  }

  res.redirect(`/dashboard/shops/${shop.id}`);
});

// Delete barber
app.post("/dashboard/shops/:shopId/barbers/delete", (req, res) => {
  const shop = findShop(req.params.shopId);
  if (!shop) return res.redirect("/dashboard");

  const { barberId } = req.body;
  shop.barbers = shop.barbers.filter((b) => b.id !== barberId);

  res.redirect(`/dashboard/shops/${shop.id}`);
});

// Add service
app.post("/dashboard/shops/:shopId/services/add", (req, res) => {
  const shop = findShop(req.params.shopId);
  if (!shop) return res.redirect("/dashboard");

  const { name, durationMinutes, price, isActive } = req.body;
  if (!name || !name.trim()) {
    return res.redirect(`/dashboard/shops/${shop.id}`);
  }

  const duration = parseInt(durationMinutes, 10) || 30;
  const numericPrice = parseFloat(price) || 25;

  shop.services.push({
    id: generateId("svc"),
    name: name.trim(),
    durationMinutes: duration,
    price: numericPrice,
    isActive: isActive === "false" ? false : true
  });

  res.redirect(`/dashboard/shops/${shop.id}`);
});

// Update service (duration/price/status)
app.post("/dashboard/shops/:shopId/services/update", (req, res) => {
  const shop = findShop(req.params.shopId);
  if (!shop) return res.redirect("/dashboard");

  const { serviceId, durationMinutes, price, isActive } = req.body;
  const svc = shop.services.find((s) => s.id === serviceId);
  if (svc) {
    const duration = parseInt(durationMinutes, 10);
    const numericPrice = parseFloat(price);
    if (!isNaN(duration)) svc.durationMinutes = duration;
    if (!isNaN(numericPrice)) svc.price = numericPrice;
    svc.isActive = isActive === "false" ? false : true;
  }

  res.redirect(`/dashboard/shops/${shop.id}`);
});

// (Optional) delete service could be added similar to barbers/delete

// =====================
// API endpoints for the iPad app
// =====================

// Bookings for a shop
app.get("/api/shops/:shopId/bookings", (req, res) => {
  const shopId = req.params.shopId;
  const shop = findShop(shopId);
  if (!shop) {
    return res.status(404).json({ error: "Shop not found" });
  }

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

// Config for a shop: barbers & services
app.get("/api/shops/:shopId/config", (req, res) => {
  const shopId = req.params.shopId;
  const shop = findShop(shopId);
  if (!shop) {
    return res.status(404).json({ error: "Shop not found" });
  }

  res.json({
    shopId: shop.id,
    name: shop.name,
    barbers: shop.barbers,
    services: shop.services
  });
});

// Healthcheck
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    shops: shops.length,
    bookings: bookings.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`NextUp backend listening on port ${PORT}`);
});