const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  city_id: {
    type: String, required: true,
    unique: true, uppercase: true, trim: true
  },
  city_name:      { type: String, required: true },
  state:          { type: String, required: true },
  country:        { type: String, default: 'India' },
  admin_email:    { type: String, required: true, unique: true },
  admin_password: { type: String, required: true },
  plan: {
    type: String,
    enum: ['TRIAL','STARTER','STANDARD','PROFESSIONAL','ENTERPRISE'],
    default: 'TRIAL'
  },
  status: {
    type: String,
    enum: ['ACTIVE','INACTIVE','SUSPENDED'],
    default: 'ACTIVE'
  },
  max_buses:   { type: Number, default: 10 },
  max_drivers: { type: Number, default: 15 },
  subscription_start: { type: Date, default: Date.now },
  subscription_end: {
    type: Date,
    default: () => new Date(Date.now() + 90*24*60*60*1000)
  },
  routes: [{
    route_id:   String,
    route_name: String,
    waypoints: [{
      stop_name: String,
      latitude:  Number,
      longitude: Number,
      sequence:  Number
    }]
  }],
  settings: {
    deviation_threshold_meters: { type: Number, default: 150 },
    gps_interval_seconds:       { type: Number, default: 7 },
    timezone:                   { type: String, default: 'Asia/Kolkata' }
  },
  logo_url:      { type: String, default: '' },
  primary_color: { type: String, default: '#2563eb' }
}, { timestamps: true });

module.exports = mongoose.model('City', citySchema);