const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Protect: verify JWT access token ─────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized. Please login.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'agrirent_secret_key_123');
    const user = await User.findById(decoded.id).select('-password -refreshToken -verificationToken -resetPasswordToken');

    if (!user) {
      res.status(401);
      return next(new Error('User not found. Please login again.'));
    }

    if (user.isSuspended) {
      res.status(403);
      return next(new Error(`Account suspended: ${user.suspendReason || 'Contact support.'}`));
    }

    if (!user.isActive) {
      res.status(403);
      return next(new Error('Account deactivated. Contact admin.'));
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Session expired. Please login again.'));
    }
    return next(new Error('Invalid authentication token. Please login again.'));
  }
};

// ─── Optional protect: attaches user if token valid, allows guests through ─────
const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'agrirent_secret_key_123');
    req.user = await User.findById(decoded.id).select('-password -refreshToken');
    if (req.user?.isSuspended || !req.user?.isActive) req.user = null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

// ─── Authorize: check user role ────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(
        `Access denied. This resource requires [${roles.join(' or ')}] role. Your role: [${req.user?.role || 'Guest'}].`
      ));
    }
    next();
  };
};

module.exports = { protect, optionalProtect, authorize };
