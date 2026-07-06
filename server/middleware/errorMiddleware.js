// ─── 404 Not Found ─────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ─── Global Error Handler ───────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal server error';

  // Mongoose: Invalid ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid resource ID format.';
  }

  // Mongoose: Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.length > 1 ? messages.join('. ') : messages[0];
  }

  // MongoDB: Duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const value = err.keyValue?.[field] || '';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" already exists. Please use a different value.`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please login again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please login again.';
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large. Maximum allowed size is 10MB.';
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files. Maximum allowed is 10.';
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field. Check upload configuration.';
  }

  // Axios/Network errors
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'External service unavailable. Please try again later.';
  }

  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`\n❌ [${statusCode}] ${req.method} ${req.originalUrl}`);
    console.error(`   Message: ${message}`);
    if (err.stack) console.error(`   Stack: ${err.stack.split('\n')[1]?.trim()}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = { notFound, errorHandler };
