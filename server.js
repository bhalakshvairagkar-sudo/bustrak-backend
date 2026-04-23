require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const gpsRoutes = require('./routes/gps');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));
app.use('/api', gpsRoutes);

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

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
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });