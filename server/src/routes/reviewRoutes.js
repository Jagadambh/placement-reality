const express = require('express');
const router = express.Router();
const {
  getCollegeReviews,
  submitReview,
  reportReview,
  moderateReview,
} = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.get('/college/:collegeId', getCollegeReviews);
router.post('/', optionalAuth, submitReview);
router.post('/:id/report', reportReview);
router.put('/:id/moderate', protect, authorize('moderator', 'admin'), moderateReview);

module.exports = router;
