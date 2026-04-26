const express  = require('express');
const router   = express.Router();
const Location = require('../models/Location');

const ROUTE_WAYPOINTS = {
  BUS_001: [
    { lat: 18.5204, lng: 73.8567 },
    { lat: 18.5308, lng: 73.8474 },
    { lat: 18.5626, lng: 73.8169 },
  ]
};

// POST /api/gps — receive location from Android app
router.post('/gps', async (req, res) => {
  try {
    const { bus_id, timestamp, latitude, longitude, speed, passenger_count } = req.body;
    if (!bus_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const location = new Location({
      bus_id,
      timestamp:       new Date(timestamp),
      latitude,
      longitude,
      speed:           speed || 0,
      passenger_count: passenger_count || 0
    });
    await location.save();

    // ⚡ Emit to all connected dashboards instantly via WebSocket
    const io = req.app.get('io');
    if (io) {
      const waypoints  = ROUTE_WAYPOINTS[bus_id] || [];
      const eta        = calculateETA(location, waypoints);
      const isDeviated = detectDeviation(location, waypoints);
      io.emit('busUpdate', {
        bus_id:          location.bus_id,
        latitude:        location.latitude,
        longitude:       location.longitude,
        speed:           location.speed,
        passenger_count: location.passenger_count || 0,
        timestamp:       location.timestamp,
        eta_minutes:     eta,
        is_deviated:     isDeviated
      });
    }

    res.status(201).json({ status: 'ok' });
  } catch (err) {
    console.error('GPS save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/bus/:id/location — single bus location
router.get('/bus/:id/location', async (req, res) => {
  try {
    const latest = await Location
      .findOne({ bus_id: req.params.id })
      .sort({ timestamp: -1 });

    if (!latest) return res.status(404).json({ error: 'Bus not found' });

    const waypoints  = ROUTE_WAYPOINTS[req.params.id] || [];
    const eta        = calculateETA(latest, waypoints);
    const isDeviated = detectDeviation(latest, waypoints);

    res.json({
      bus_id:          latest.bus_id,
      latitude:        latest.latitude,
      longitude:       latest.longitude,
      speed:           latest.speed,
      passenger_count: latest.passenger_count || 0,
      timestamp:       latest.timestamp,
      eta_minutes:     eta,
      is_deviated:     isDeviated
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/buses — ALL active buses (updated in last 2 minutes)
router.get('/buses', async (req, res) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const activeBuses = await Location.aggregate([
      { $match: { timestamp: { $gte: twoMinutesAgo } } },
      { $sort: { timestamp: -1 } },
      { $group: {
          _id:             '$bus_id',
          bus_id:          { $first: '$bus_id' },
          latitude:        { $first: '$latitude' },
          longitude:       { $first: '$longitude' },
          speed:           { $first: '$speed' },
          passenger_count: { $first: '$passenger_count' },
          timestamp:       { $first: '$timestamp' }
      }}
    ]);

    const result = activeBuses.map(bus => {
      const waypoints = ROUTE_WAYPOINTS[bus.bus_id] || [];
      return {
        ...bus,
        passenger_count: bus.passenger_count || 0,
        eta_minutes:     calculateETA(bus, waypoints),
        is_deviated:     detectDeviation(bus, waypoints)
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── helpers ─────────────────────────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function toRad(deg) { return deg * Math.PI / 180; }

function calculateETA(location, waypoints) {
  if (!waypoints.length || location.speed < 1) return null;
  const destination = waypoints[waypoints.length - 1];
  const distanceKm  = haversineDistance(
    location.latitude, location.longitude,
    destination.lat,   destination.lng
  );
  return Math.round((distanceKm / location.speed) * 60);
}

function detectDeviation(location, waypoints, thresholdKm = 0.15) {
  if (!waypoints.length) return false;
  const minDist = Math.min(...waypoints.map(wp =>
    haversineDistance(location.latitude, location.longitude, wp.lat, wp.lng)
  ));
  return minDist > thresholdKm;
}

module.exports = router;