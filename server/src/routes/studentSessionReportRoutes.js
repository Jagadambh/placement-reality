const express = require('express');
const router = express.Router();
const {
  submitStudentSessionReport,
  getStudentSessionReports,
} = require('../controllers/studentSessionReportController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitStudentSessionReport);
router.get('/:collegeId', getStudentSessionReports);

module.exports = router;
