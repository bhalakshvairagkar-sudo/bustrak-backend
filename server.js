require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
const gpsRoutes = require('./routes/gps');

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120 })); // 120 req/min per IP

// Routes
app.use('/api', gpsRoutes);

// Connect and start
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bustrak')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 3000, () =>
      console.log('Server running on port 3000'));
  })
  .catch(err => console.error('DB error:', err));