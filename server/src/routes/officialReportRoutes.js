const express = require('express');
const router = express.Router();
const {
  getOfficialReports,
  getReportById,
  scanCollegeWebsite,
  triggerReportExtraction,
  reviewOfficialReport,
  reviewReportMetric,
  getPublicOverview,
  getDiscoveryLogs,
  downloadReportDocument,
} = require('../controllers/officialReportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

// Public endpoints
router.get('/', getOfficialReports);
router.get('/public-overview', getPublicOverview);
router.get('/overview', getPublicOverview);
router.get('/discovery-logs', getDiscoveryLogs);
router.get('/:id/download', downloadReportDocument);
router.get('/:id', getReportById);

// Protected Moderator / Admin endpoints
router.post('/scan/:collegeId', protect, authorize('moderator', 'admin'), scanCollegeWebsite);
router.post('/:id/extract', protect, authorize('moderator', 'admin'), triggerReportExtraction);
router.put('/:id/review', protect, authorize('moderator', 'admin'), reviewOfficialReport);
router.put('/metrics/:metricId/review', protect, authorize('moderator', 'admin'), reviewReportMetric);

module.exports = router;
