const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const shops = {
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

const appointments = {
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

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/shops/:shopId/config", (req, res) => {
  const shop = shops[req.params.shopId];
  if (!shop) return res.status(404).json({ error: "Shop not found" });
  res.json(shop);
});

app.get("/shops/:shopId/appointments", (req, res) => {
  res.json(appointments[req.params.shopId] || []);
});

app.post("/shops/:shopId/appointments", (req, res) => {
  const shopId = req.params.shopId;
  const shop = shops[shopId];
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

  if (!appointments[shopId]) appointments[shopId] = [];
  appointments[shopId].push(newAppt);

  res.status(201).json(newAppt);
});

app.listen(PORT, () => {
  console.log(`NextUp backend running on port ${PORT}`);
});