const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after a few minutes.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 login/register attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 mins
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI query limit reached for your session. Please pause for a moment.',
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
};
