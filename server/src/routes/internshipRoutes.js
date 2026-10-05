const express = require('express');
const router = express.Router();
const {
  getInternships,
  submitInternship,
  getInternshipAnalytics,
  getMyInternships,
  getInternshipVerificationQueue,
  verifyInternship,
} = require('../controllers/internshipController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../middleware/upload');

router.get('/', getInternships);
router.post('/', protect, upload.single('verificationDocument'), submitInternship);
router.get('/my-internships', protect, getMyInternships);
router.get('/queue', protect, authorize('admin', 'moderator'), getInternshipVerificationQueue);
router.put('/:id/verify', protect, authorize('admin', 'moderator'), verifyInternship);
router.get('/analytics/:collegeId', getInternshipAnalytics);

module.exports = router;

