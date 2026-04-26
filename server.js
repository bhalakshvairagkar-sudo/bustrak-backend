require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const gpsRoutes  = require('./routes/gps');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible inside routes
app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// Routes
app.use('/api', gpsRoutes);

// Socket.io connections
io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id);
  });
});

// Connect and start
const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3000;

console.log('Starting server...');
console.log('MONGO_URI exists:', !!MONGO_URI);
console.log('PORT:', PORT);

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not set!');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });