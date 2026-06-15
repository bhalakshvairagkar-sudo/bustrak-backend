Set-Content server.js -Encoding UTF8 -Value 'require("dotenv").config();
const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");

const gpsRoutes    = require("./routes/gps");
const authRoutes   = require("./routes/auth");
const cityRoutes   = require("./routes/cities");
const driverRoutes = require("./routes/drivers");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });

app.set("io", io);
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60000, max: 200 }));

app.use("/api",         gpsRoutes);
app.use("/api/auth",    authRoutes);
app.use("/api/cities",  cityRoutes);
app.use("/api/drivers", driverRoutes);

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.on("disconnect", () => console.log("Dashboard disconnected:", socket.id));
});

const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3000;

console.log("Starting server...");
console.log("MONGO_URI exists:", !!MONGO_URI);

if (!MONGO_URI) { console.error("ERROR: MONGO_URI not set!"); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log("Server running on port " + PORT));
  })
  .catch(err => { console.error("MongoDB error:", err.message); process.exit(1); });'