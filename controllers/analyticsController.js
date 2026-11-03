const TransactionModel = require('../models/transactionModel');
const BudgetModel = require('../models/budgetModel');
const { db } = require('../config/db');

const AnalyticsController = {
  async getAnalyticsData(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;

      // 1. Category Breakdown
      const categorySpending = await TransactionModel.getCategorySpending(req.user.id, month);

      // 2. Daily Trends
      const dailyTrends = await TransactionModel.getDailySpendingTrends(req.user.id, month);

      // 3. Monthly Comparison (Last 6 Months)
      const monthlyComparison = await db.any(
        `SELECT 
          TO_CHAR(transaction_date, 'YYYY-MM') as month,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE user_id = ? AND transaction_date >= CURRENT_DATE - INTERVAL '6 months'
         GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
         ORDER BY month ASC`,
        [req.user.id]
      );

      // 4. Budget Progress
      const budgets = await BudgetModel.getBudgetsWithSpending(req.user.id, month);

      // 5. Month Totals
      const totals = await TransactionModel.getMonthlyTotals(req.user.id, month);

      res.json({
        success: true,
        month,
        totals,
        categoryBreakdown: categorySpending,
        dailyTrends,
        monthlyComparison,
        budgetProgress: budgets
      });
    } catch (err) {
      console.error('[AnalyticsController.getAnalyticsData] Error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = AnalyticsController;
