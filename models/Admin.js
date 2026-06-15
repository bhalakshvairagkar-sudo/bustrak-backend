const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['SUPERADMIN','CITY_ADMIN'],
    default: 'CITY_ADMIN'
  },
  city_id:    { type: String, default: null },
  name:       { type: String, required: true },
  last_login: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);