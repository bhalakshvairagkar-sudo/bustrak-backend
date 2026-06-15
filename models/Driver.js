const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driver_id:      { type: String, required: true, unique: true },
  city_id:        { type: String, required: true, index: true },
  name:           { type: String, required: true },
  employee_id:    { type: String, required: true },
  phone:          { type: String, required: true },
  password:       { type: String, required: true },
  assigned_bus:   { type: String, default: '' },
  assigned_route: { type: String, default: '' },
  status: {
    type: String,
    enum: ['ACTIVE','ON_DUTY','OFF_DUTY','INACTIVE'],
    default: 'ACTIVE'
  },
  license_number:    { type: String, default: '' },
  joining_date:      { type: Date, default: Date.now },
  total_trips:       { type: Number, default: 0 },
  total_distance_km: { type: Number, default: 0 },
  performance_score: { type: Number, default: 100 },
  fcm_token:         { type: String, default: '' }
}, { timestamps: true });

driverSchema.index({ city_id: 1, employee_id: 1 }, { unique: true });

module.exports = mongoose.model('Driver', driverSchema);