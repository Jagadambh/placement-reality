const express = require('express');
const { submitFeedback, getAllFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Optional protect middleware for submit if we want to log the user, but we'll manually check req.user in controller 
// if we use a non-strict protect middleware, or just let it be fully public.
// We'll use public for submission.
router.post('/', submitFeedback);

// Admin route
router.get('/', protect, authorize('admin'), getAllFeedback);

module.exports = router;
