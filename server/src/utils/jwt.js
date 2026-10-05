const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'super_secure_placement_reality_jwt_secret_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'super_secure_placement_reality_jwt_secret_key_2026'
  );
};

module.exports = {
  signToken,
  verifyToken,
};
