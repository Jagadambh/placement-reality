const express = require('express');
const router = express.Router();
const {
  getAdvertisedVsReality,
  getPlacementDashboard,
  getHistoricalTrends,
  compareSessions,
  savePlacementRecord,
  importOfficialPlacementRecord,
  verifyPlacementRecord,
  getPendingPlacementRecords,
} = require('../controllers/placementController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.get('/:collegeId/advertised-vs-reality', getAdvertisedVsReality);
router.get('/:collegeId/compare-sessions', compareSessions);
router.get('/:collegeId/seasons/:seasonId', getPlacementDashboard);
router.get('/:collegeId/history', getHistoricalTrends);
router.post('/records', protect, authorize('admin', 'moderator'), savePlacementRecord);
router.post('/import-official', protect, authorize('admin'), importOfficialPlacementRecord);
router.get('/pending-records', protect, authorize('admin', 'moderator'), getPendingPlacementRecords);
router.put('/records/:id/verify', protect, authorize('admin', 'moderator'), verifyPlacementRecord);

module.exports = router;

