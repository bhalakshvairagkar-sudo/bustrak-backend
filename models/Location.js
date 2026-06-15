const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  city_id:         { type: String, required: true, index: true },
  bus_id:          { type: String, required: true, index: true },
  driver_id:       { type: String, default: '' },
  timestamp:       { type: Date, required: true },
  latitude:        { type: Number, required: true },
  longitude:       { type: Number, required: true },
  speed:           { type: Number, default: 0 },
  passenger_count: { type: Number, default: 0 }
}, { timestamps: true });

locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
locationSchema.index({ city_id: 1, bus_id: 1, timestamp: -1 });

module.exports = mongoose.model('Location', locationSchema);