const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/data', AnalyticsController.getAnalyticsData);

module.exports = router;
