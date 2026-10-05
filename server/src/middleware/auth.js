const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { sendError } = require('../utils/responseHelper');

const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return sendError(res, 'Authentication token missing. Please log in.', 401);
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return sendError(res, 'User session invalid or user has been deleted.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Your session has expired. Please log in again.', 401);
    }
    return sendError(res, 'Invalid authentication token.', 401);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Ignore invalid token for optional auth
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth };

