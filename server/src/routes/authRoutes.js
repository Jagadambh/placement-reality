const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updateProfile,
  submitStudentIdProof,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/submit-id-proof', protect, upload.single('idProofDocument'), submitStudentIdProof);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/verify-email', verifyEmail);

module.exports = router;
