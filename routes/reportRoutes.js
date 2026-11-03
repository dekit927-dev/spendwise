const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', ReportController.getReports);
router.get('/:month', ReportController.getReportByMonth);
router.post('/generate', ReportController.generateReport);

module.exports = router;
