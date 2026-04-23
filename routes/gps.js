const express  = require('express');
const router   = express.Router();
const Location = require('../models/Location');

// Predefined route waypoints for BUS_001 (lat/lng pairs)
const ROUTE_WAYPOINTS = {
  BUS_001: [
    { lat: 18.5204, lng: 73.8567 }, // Pune Station
    { lat: 18.5308, lng: 73.8474 }, // FC Road
    { lat: 18.5626, lng: 73.8169 }, // Hinjewadi Phase 1
  ]
};

// POST /api/gps — receive location from Android app
router.post('/gps', async (req, res) => {
  try {
    const { bus_id, timestamp, latitude, longitude, speed } = req.body;

    if (!bus_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const location = new Location({
      bus_id,
      timestamp: new Date(timestamp),
      latitude,
      longitude,
      speed: speed || 0
    });

    await location.save();
    res.status(201).json({ status: 'ok' });

  } catch (err) {
    console.error('GPS save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/bus/:id/location — live location for dashboard
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
      bus_id:    latest.bus_id,
      latitude:  latest.latitude,
      longitude: latest.longitude,
      speed:     latest.speed,
      timestamp: latest.timestamp,
      eta_minutes:  eta,
      is_deviated:  isDeviated
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Intelligence helpers ────────────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;  // Earth radius in km
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

  // Find the next unvisited waypoint (closest ahead)
  const destination = waypoints[waypoints.length - 1];
  const distanceKm  = haversineDistance(
    location.latitude, location.longitude,
    destination.lat,   destination.lng
  );
  const speedKmh  = location.speed;
  const etaHours  = distanceKm / speedKmh;
  return Math.round(etaHours * 60); // Return minutes
}

function detectDeviation(location, waypoints, thresholdKm = 0.15) {
  if (!waypoints.length) return false;

  // Find minimum distance to any waypoint on the route
  const minDist = Math.min(...waypoints.map(wp =>
    haversineDistance(location.latitude, location.longitude, wp.lat, wp.lng)
  ));

  return minDist > thresholdKm; // True if > 150m off route
}

module.exports = router;