const express = require('express');
const { submitFeedback, getAllFeedback, getFeedbackStats } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.get('/stats', getFeedbackStats);
router.post('/', submitFeedback);

// Admin route
router.get('/', protect, authorize('admin'), getAllFeedback);

module.exports = router;
