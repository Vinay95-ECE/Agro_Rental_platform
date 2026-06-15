const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token in header or cookie
const protect = async (req, res, next) => {
  let token;

  // Read token from authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'agrirent_secret_key_123');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized, user not found'));
    }
    next();
  } catch (error) {
    res.status(401);
    return next(new Error('Not authorized, token signature invalid'));
  }
};

// Check if user has specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Role [${req.user ? req.user.role : 'Guest'}] is not authorized to access this resource`));
    }
    next();
  };
};

module.exports = { protect, authorize };
