const jwt = require('jsonwebtoken');
const City = require('../models/City');

const JWT_SECRET = process.env.JWT_SECRET || 'bustrak_secret_2026';

const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    if (decoded.role === 'CITY_ADMIN') {
      const city = await City.findOne({ city_id: decoded.city_id });
      if (!city || city.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'City account suspended' });
      }
      req.city = city;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const verifySuperAdmin = (req, res, next) => {
  if (req.admin?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

const verifyDriver = (req, res, next) => {
  try {
    const token = req.headers['x-driver-token'];
    if (!token) return res.status(401).json({ error: 'No driver token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.driver = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid driver token' });
  }
};

module.exports = { verifyAdmin, verifySuperAdmin, verifyDriver, JWT_SECRET };