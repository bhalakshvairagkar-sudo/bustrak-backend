require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const gpsRoutes    = require('./routes/gps');
const authRoutes   = require('./routes/auth');
const cityRoutes   = require('./routes/cities');
const driverRoutes = require('./routes/drivers');
const passengerRoute = require('./routes/passengerRoute');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:  process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in all route files via req.app.get('io')
app.set('io', io);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin:  process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api',         gpsRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/cities',  cityRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api', passengerRoute);

app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date() })
);

// ── Socket.IO ─────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Dashboard connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id);
  });
});

// ── Database + Start ──────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3000;

console.log('Starting BusTrak backend...');
console.log('MONGO_URI exists:', !!MONGO_URI);

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI not set!');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });