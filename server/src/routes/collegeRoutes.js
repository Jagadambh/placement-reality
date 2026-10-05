const express = require('express');
const router = express.Router();
const {
  getColleges,
  getTop50PrivateColleges,
  getCollegeBySlug,
  createCollege,
  updateCollege,
  getCollegeDepartments,
  getCollegeSeasons,
  submitUnlistedCollege,
  classifyInstitution,
  getCollegeDiscoveryStatus,
  triggerCollegeDiscovery,
} = require('../controllers/collegeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.get('/', getColleges);
router.get('/top-50-private', getTop50PrivateColleges);
router.get('/:id/discovery-status', getCollegeDiscoveryStatus);
router.post('/:id/discover-placements', triggerCollegeDiscovery);
router.get('/:slugOrId', getCollegeBySlug);
router.get('/:id/departments', getCollegeDepartments);
router.get('/:id/seasons', getCollegeSeasons);

// Community / Student submission of newly established or unlisted colleges
router.post('/submit-unlisted', submitUnlistedCollege);

// Moderator and Admin institutional classification
router.put('/:id/classify', protect, authorize('admin', 'moderator'), classifyInstitution);

// Admin-only creation and modification
router.post('/', protect, authorize('admin'), createCollege);
router.put('/:id', protect, authorize('admin'), updateCollege);

module.exports = router;
