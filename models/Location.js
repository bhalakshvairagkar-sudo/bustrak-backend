const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  bus_id:    { type: String, required: true, index: true },
  timestamp: { type: Date,   required: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed:     { type: Number, default: 0 }
}, { timestamps: true });

// TTL: auto-delete records older than 24 hours to save space
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Location', locationSchema);