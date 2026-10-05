const express = require('express');
const router = express.Router();
const { compareColleges } = require('../controllers/comparisonController');

router.post('/', compareColleges);

module.exports = router;
