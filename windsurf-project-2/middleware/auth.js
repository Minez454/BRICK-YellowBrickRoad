const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const agencyAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Check if user is agency staff
    const Agency = require('../models/Agency');
    const agency = await Agency.findOne({ 
      'staff.user': user._id,
      'staff.user': user._id
    });

    if (!agency) {
      return res.status(403).json({ error: 'Access denied. Agency staff required.' });
    }

    req.user = user;
    req.agency = agency;
    next();
  } catch (error) {
    console.error('Agency auth error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { auth, agencyAuth };
