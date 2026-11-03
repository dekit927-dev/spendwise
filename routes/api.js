const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const transactionRoutes = require('./transactionRoutes');
const streakRoutes = require('./streakRoutes');
const budgetRoutes = require('./budgetRoutes');
const recurringRoutes = require('./recurringRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportRoutes = require('./reportRoutes');
const suggestionRoutes = require('./suggestionRoutes');
const notificationRoutes = require('./notificationRoutes');
const AuthMiddleware = require('../middleware/authMiddleware');
const TransactionModel = require('../models/transactionModel');

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SpendWise Smart Finance API',
    timestamp: new Date().toISOString()
  });
});

router.get('/calendar', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);
    const data = await TransactionModel.getMonthCalendarData(req.user.id, month);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[API /calendar] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/streaks', streakRoutes);
router.use('/budgets', budgetRoutes);
router.use('/recurring', recurringRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/suggestions', suggestionRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
