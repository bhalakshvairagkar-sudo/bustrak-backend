const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');
const { verifyAdmin } = require('../middleware/auth');

// Add driver
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, employee_id, phone,
            password, assigned_bus, assigned_route } = req.body;
    const city = req.city;
    const driverCount = await Driver.countDocuments({
      city_id: req.admin.city_id
    });
    if (driverCount >= city.max_drivers) {
      return res.status(400).json({
        error: `Driver limit reached (${city.max_drivers}). Upgrade plan.`
      });
    }
    const driver_id = `${req.admin.city_id}_DRV_${Date.now()}`;
    const hashedPwd = await bcrypt.hash(password, 10);
    const driver = new Driver({
      driver_id,
      city_id: req.admin.city_id,
      name, employee_id, phone,
      password: hashedPwd,
      assigned_bus, assigned_route
    });
    await driver.save();
    res.status(201).json({
      message: 'Driver created',
      driver_id, employee_id
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all drivers
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const drivers = await Driver.find(
      { city_id: req.admin.city_id },
      { password: 0 }
    ).sort({ name: 1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update driver
router.patch('/:driver_id', verifyAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    await Driver.findOneAndUpdate(
      { driver_id: req.params.driver_id, city_id: req.admin.city_id },
      updates
    );
    res.json({ message: 'Driver updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete driver
router.delete('/:driver_id', verifyAdmin, async (req, res) => {
  try {
    await Driver.findOneAndUpdate(
      { driver_id: req.params.driver_id, city_id: req.admin.city_id },
      { status: 'INACTIVE' }
    );
    res.json({ message: 'Driver deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;