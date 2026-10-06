const express = require('express');
const router = express.Router();
const {
  submitOffer,
  getMyOffers,
  getCollegePublicOffers,
  verifyOffer,
  unpublishOffer,
  deleteOffer,
} = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../middleware/upload');

// Student endpoints
router.post('/', protect, upload.single('supportingDocument'), submitOffer);
router.get('/my-offers', protect, getMyOffers);

// Public verified offers (strictly anonymized)
router.get('/college/:collegeId', getCollegePublicOffers);

// Lifecycle actions: Unpublish and Soft Delete
router.put('/:id/unpublish', protect, unpublishOffer);
router.delete('/:id', protect, deleteOffer);

// Moderator & Admin verification
router.put('/:id/verify', protect, authorize('moderator', 'admin'), verifyOffer);

module.exports = router;
