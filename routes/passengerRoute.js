/**
 * backend/passengerRoute.js
 * 
 * Add this route to your existing BusTrak Node.js/Express backend.
 * 
 * What this does:
 *   POST /api/passenger-data  -> receives count from YOLO script every 2 mins
 *                                saves to MongoDB stops_demand collection
 *                                returns confirmation
 * 
 *   GET  /api/passenger-data/latest -> dashboard polls this every 30 seconds
 *                                      returns latest count per stop
 * 
 * Your existing BusTrak backend is at:
 *   https://bustrak-backend.onrender.com
 * 
 * How to add to your existing server.js / app.js:
 *   const passengerRoute = require('./passengerRoute');
 *   app.use('/api', passengerRoute);
 */

const express = require('express');
const router  = express.Router();

/**
 * You already have mongoose connected in your existing backend.
 * This schema goes into the stops_demand collection in MongoDB Atlas.
 * 
 * If you already have a StopDemand model, skip the schema definition
 * and just require your existing model instead.
 */
const mongoose = require('mongoose');

const StopDemandSchema = new mongoose.Schema({
  // Stop identity
  stopId:       { type: String, required: true },
  stopName:     { type: String, required: true },

  // Bus identity
  routeId:      { type: String, required: true },
  busId:        { type: String, required: true },

  // Passenger count from YOLO
  count:        { type: Number, required: true },  // rounded integer
  avgCount:     { type: Number, required: true },  // exact float average
  sampleFrames: { type: Number, default: 30 },     // frames averaged over

  // GPS coordinates of the stop
  latitude:     { type: Number, required: true },
  longitude:    { type: Number, required: true },

  // Source tells dashboard how to display this count
  // "CAMERA" = from YOLO script
  // "MANUAL" = from your existing Android app
  source:       { type: String, default: 'CAMERA', enum: ['CAMERA', 'MANUAL'] },

  // When this reading was taken
  timestamp:    { type: Number, required: true },  // Unix timestamp from Python
  createdAt:    { type: Date,   default: Date.now },
});

// Index on stopId + createdAt so latest-per-stop query is fast
StopDemandSchema.index({ stopId: 1, createdAt: -1 });

// Use existing model if already registered, otherwise create it
const StopDemand = mongoose.models.StopDemand ||
                   mongoose.model('StopDemand', StopDemandSchema);


// ── POST /api/passenger-data ──────────────────────────────────────────────────
/**
 * Receives passenger count from your YOLO Python script (data/store.py).
 * Called every 2 minutes by BusTrakSender.
 * 
 * Expected body:
 * {
 *   "stopId":       "PUNE_STN",
 *   "stopName":     "Pune Station",
 *   "routeId":      "R1",
 *   "busId":        "BUS_42",
 *   "count":        14,
 *   "avgCount":     13.7,
 *   "sampleFrames": 30,
 *   "latitude":     18.5204,
 *   "longitude":    73.8567,
 *   "source":       "CAMERA",
 *   "timestamp":    1718000000.0
 * }
 */
router.post('/passenger-data', async (req, res) => {
  try {
    const {
      stopId, stopName,
      routeId, busId,
      count, avgCount, sampleFrames,
      latitude, longitude,
      source, timestamp
    } = req.body;

    // Basic validation - reject if required fields missing
    if (!stopId || !routeId || !busId || count === undefined ||
        latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error:   'Missing required fields: stopId, routeId, busId, count, latitude, longitude'
      });
    }

    // Save to MongoDB stops_demand collection
    const record = new StopDemand({
      stopId,
      stopName:     stopName     || stopId,
      routeId,
      busId,
      count:        Math.round(count),
      avgCount:     avgCount     || count,
      sampleFrames: sampleFrames || 30,
      latitude,
      longitude,
      source:       source       || 'CAMERA',
      timestamp:    timestamp    || Date.now() / 1000,
    });

    await record.save();

    console.log(
      `[passenger-data] CAMERA count saved: ` +
      `stop=${stopId} count=${count} bus=${busId}`
    );

    return res.status(201).json({
      success: true,
      message: 'Passenger count saved',
      data: {
        id:       record._id,
        stopId:   record.stopId,
        count:    record.count,
        source:   record.source,
        savedAt:  record.createdAt,
      }
    });

  } catch (err) {
    console.error('[passenger-data] POST error:', err.message);
    return res.status(500).json({
      success: false,
      error:   'Server error saving passenger count'
    });
  }
});


// ── GET /api/passenger-data/latest ───────────────────────────────────────────
/**
 * Called by your Leaflet dashboard every 30 seconds.
 * Returns the most recent count for each stop.
 * Dashboard uses source field to show CAMERA badge vs manual count.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "stopId":    "PUNE_STN",
 *       "stopName":  "Pune Station",
 *       "count":     14,
 *       "source":    "CAMERA",
 *       "latitude":  18.5204,
 *       "longitude": 73.8567,
 *       "updatedAt": "2026-06-16T10:30:00.000Z"
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/passenger-data/latest', async (req, res) => {
  try {
    // Get the 3 most recent records (one per stop)
    // Uses the stopId + createdAt index for fast lookup
    const stops = ['PUNE_STN', 'FC_ROAD', 'HINJEWADI1'];

    const results = await Promise.all(
      stops.map(stopId =>
        StopDemand
          .findOne({ stopId })
          .sort({ createdAt: -1 })   // most recent first
          .select('stopId stopName count avgCount source latitude longitude createdAt')
          .lean()
      )
    );

    // Filter out stops with no data yet
    const data = results
      .filter(r => r !== null)
      .map(r => ({
        stopId:    r.stopId,
        stopName:  r.stopName,
        count:     r.count,
        avgCount:  r.avgCount,
        source:    r.source,
        latitude:  r.latitude,
        longitude: r.longitude,
        updatedAt: r.createdAt,
      }));

    return res.json({ success: true, data });

  } catch (err) {
    console.error('[passenger-data] GET error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Server error fetching latest counts'
    });
  }
});


// ── GET /api/passenger-data/history/:stopId ───────────────────────────────────
/**
 * Optional: returns last 24 hours of counts for one stop.
 * Useful for the demand heatmap on your dashboard.
 * 
 * Example: GET /api/passenger-data/history/PUNE_STN
 */
router.get('/passenger-data/history/:stopId', async (req, res) => {
  try {
    const { stopId } = req.params;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours

    const records = await StopDemand
      .find({ stopId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .select('count avgCount source timestamp createdAt')
      .lean();

    return res.json({ success: true, stopId, data: records });

  } catch (err) {
    console.error('[passenger-data] history error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Server error fetching history'
    });
  }
});


module.exports = router;