const { sendError } = require('../utils/responseHelper');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
        403
      );
    }
    next();
  };
};

module.exports = { authorize };
