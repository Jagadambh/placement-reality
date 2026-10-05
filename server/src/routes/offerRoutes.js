const express = require('express');
const router = express.Router();
const {
  submitOffer,
  getMyOffers,
  getCollegePublicOffers,
  verifyOffer,
} = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../middleware/upload');

// Student endpoints
router.post('/', protect, upload.single('supportingDocument'), submitOffer);
router.get('/my-offers', protect, getMyOffers);

// Public verified offers (strictly anonymized)
router.get('/college/:collegeId', getCollegePublicOffers);

// Moderator & Admin verification
router.put('/:id/verify', protect, authorize('moderator', 'admin'), verifyOffer);

module.exports = router;
