const { sendError } = require('../utils/responseHelper');

const errorHandler = (err, req, res, next) => {
  console.error('[Application Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return sendError(res, messages.join(', '), 400, err.errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `A record with that ${field} already exists.`, 409);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return sendError(res, `Resource not found with specified identifier: ${err.value}`, 404);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'Uploaded document exceeds maximum allowed size (5MB).', 400);
    }
    return sendError(res, `File upload error: ${err.message}`, 400);
  }

  return sendError(res, err.message || 'Internal server error occurred.', err.statusCode || 500);
};

module.exports = errorHandler;
