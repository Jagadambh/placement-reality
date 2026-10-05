const express = require('express');
const router = express.Router();
const { getRoiColleges, calculateRoiSimulation } = require('../controllers/roiController');

router.get('/colleges', getRoiColleges);
router.post('/simulate', calculateRoiSimulation);

module.exports = router;
