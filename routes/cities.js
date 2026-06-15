const express = require('express');
const router = express.Router();
const City = require('../models/City');
const Driver = require('../models/Driver');
const Location = require('../models/Location');
const { verifyAdmin, verifySuperAdmin } = require('../middleware/auth');

// Get my city info
router.get('/my-city', verifyAdmin, async (req, res) => {
  try {
    const city = await City.findOne(
      { city_id: req.admin.city_id },
      { admin_password: 0 }
    );
    if (!city) return res.status(404).json({ error: 'City not found' });
    res.json(city);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all active buses for my city
router.get('/my-city/buses', verifyAdmin, async (req, res) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const buses = await Location.aggregate([
      { $match: {
          city_id: req.admin.city_id,
          timestamp: { $gte: twoMinutesAgo }
      }},
      { $sort: { timestamp: -1 } },
      { $group: {
          _id: '$bus_id',
          bus_id:          { $first: '$bus_id' },
          city_id:         { $first: '$city_id' },
          latitude:        { $first: '$latitude' },
          longitude:       { $first: '$longitude' },
          speed:           { $first: '$speed' },
          timestamp:       { $first: '$timestamp' },
          passenger_count: { $first: '$passenger_count' }
      }}
    ]);
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// City stats
router.get('/my-city/stats', verifyAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [activeBuses, totalReadings, drivers] = await Promise.all([
      Location.aggregate([
        { $match: {
            city_id: req.admin.city_id,
            timestamp: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
        }},
        { $group: { _id: '$bus_id' } },
        { $count: 'count' }
      ]),
      Location.countDocuments({
        city_id: req.admin.city_id,
        timestamp: { $gte: today }
      }),
      Driver.countDocuments({
        city_id: req.admin.city_id,
        status: 'ON_DUTY'
      })
    ]);
    res.json({
      active_buses: activeBuses[0]?.count || 0,
      gps_readings_today: totalReadings,
      drivers_on_duty: drivers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add route to city
router.post('/my-city/routes', verifyAdmin, async (req, res) => {
  try {
    const { route_name, waypoints } = req.body;
    const route_id = `${req.admin.city_id}_ROUTE_${Date.now()}`;
    await City.findOneAndUpdate(
      { city_id: req.admin.city_id },
      { $push: { routes: { route_id, route_name, waypoints } } }
    );
    res.status(201).json({ message: 'Route added', route_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Superadmin: get all cities
router.get('/all', verifyAdmin, verifySuperAdmin, async (req, res) => {
  try {
    const cities = await City.find(
      {}, { admin_password: 0 }
    ).sort({ createdAt: -1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Superadmin: suspend/activate city
router.patch('/status/:city_id',
  verifyAdmin, verifySuperAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;
      await City.findOneAndUpdate(
        { city_id: req.params.city_id }, { status }
      );
      res.json({ message: `City ${status}` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;