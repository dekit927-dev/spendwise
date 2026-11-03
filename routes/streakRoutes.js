const express = require('express');
const router = express.Router();
const StreakController = require('../controllers/streakController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/status', StreakController.getStreakDetails);
router.post('/confirm-zero', StreakController.confirmZeroSpending);
router.post('/use-freeze', StreakController.useFreeze);

module.exports = router;
