const express = require('express');
const router = express.Router();
const {
  uploadOfficialReport,
  getCollegeReports,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../middleware/upload');

router.post('/upload', protect, authorize('admin', 'moderator'), upload.single('reportDocument'), uploadOfficialReport);
router.get('/college/:collegeId', getCollegeReports);

module.exports = router;
