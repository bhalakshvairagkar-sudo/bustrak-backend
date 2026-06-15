const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const City = require('../models/City');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const { JWT_SECRET } = require('../middleware/auth');

// City Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await Admin.findByIdAndUpdate(admin._id, { last_login: new Date() });
    const token = jwt.sign({
      admin_id: admin._id,
      email: admin.email,
      role: admin.role,
      city_id: admin.city_id,
      name: admin.name
    }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: admin.role, city_id: admin.city_id, name: admin.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Login from Android app
router.post('/driver/login', async (req, res) => {
  try {
    const { city_id, employee_id, password } = req.body;
    const driver = await Driver.findOne({
      city_id: city_id.toUpperCase(),
      employee_id
    });
    if (!driver) {
      return res.status(401).json({ error: 'Driver not found' });
    }
    const valid = await bcrypt.compare(password, driver.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    if (driver.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Account deactivated' });
    }
    const token = jwt.sign({
      driver_id: driver.driver_id,
      city_id: driver.city_id,
      name: driver.name,
      bus_id: driver.assigned_bus,
      route_id: driver.assigned_route
    }, JWT_SECRET, { expiresIn: '24h' });
    await Driver.findByIdAndUpdate(driver._id, { status: 'ON_DUTY' });
    res.json({
      token,
      driver_id: driver.driver_id,
      name: driver.name,
      city_id: driver.city_id,
      bus_id: driver.assigned_bus,
      route_id: driver.assigned_route
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new city
router.post('/city/register', async (req, res) => {
  try {
    const { city_name, state, admin_email,
            admin_password, admin_name, plan } = req.body;
    const city_id = city_name.toUpperCase()
      .replace(/\s+/g, '_').substring(0, 20);
    const exists = await City.findOne({ city_id });
    if (exists) {
      return res.status(400).json({ error: 'City already registered' });
    }
    const hashedPassword = await bcrypt.hash(admin_password, 10);
    const city = new City({
      city_id, city_name, state,
      admin_email, admin_password: hashedPassword,
      plan: plan || 'TRIAL'
    });
    await city.save();
    const admin = new Admin({
      email: admin_email,
      password: hashedPassword,
      role: 'CITY_ADMIN',
      city_id,
      name: admin_name
    });
    await admin.save();
    res.status(201).json({
      message: 'City registered successfully',
      city_id, city_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;