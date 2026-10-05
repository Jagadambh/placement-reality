const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getAuditLogs,
  getOfferVerificationQueue,
  getReviewModerationQueue,
  getStudentVerificationsQueue,
  getUsers,
  updateUserRole,
  verifyStudentAffiliation,
} = require('../controllers/adminController');
const {
  getInternshipVerificationQueue,
  verifyInternship,
} = require('../controllers/internshipController');
const {
  getPendingPlacementRecords,
  verifyPlacementRecord,
  importOfficialPlacementRecord,
} = require('../controllers/placementController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.use(protect);
router.use(authorize('admin', 'moderator'));

router.get('/overview', getAdminOverview);
router.get('/audit-logs', getAuditLogs);
router.get('/offers/queue', getOfferVerificationQueue);
router.get('/internships/queue', getInternshipVerificationQueue);
router.put('/internships/:id/verify', verifyInternship);
router.get('/official-imports/queue', getPendingPlacementRecords);
router.put('/official-imports/:id/verify', verifyPlacementRecord);
router.post('/official-imports', authorize('admin'), importOfficialPlacementRecord);
router.get('/reviews/queue', getReviewModerationQueue);
router.get('/verifications/queue', getStudentVerificationsQueue);
router.get('/users', authorize('admin'), getUsers);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
router.put('/users/:id/verify-college', verifyStudentAffiliation);

module.exports = router;

