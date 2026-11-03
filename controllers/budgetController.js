const BudgetModel = require('../models/budgetModel');

const BudgetController = {
  async getBudgets(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;

      const budgets = await BudgetModel.getBudgetsWithSpending(req.user.id, month);
      const summary = await BudgetModel.getBudgetSummary(req.user.id, month);

      res.json({ success: true, month, budgets, summary });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async setBudget(req, res) {
    try {
      const { category_id, month, amount, alert_threshold } = req.body;
      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0 || !month) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(400).json({ success: false, message: 'Valid month and positive budget amount are required.' });
        }
        return res.redirect('/budgets?error=Invalid+budget+amount');
      }

      const budget = await BudgetModel.setBudget({
        userId: req.user.id,
        categoryId: category_id ? parseInt(category_id, 10) : null,
        month,
        amount: parsedAmount,
        alertThreshold: alert_threshold ? parseInt(alert_threshold, 10) : 80
      });

      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Budget configured successfully', budget });
      }

      res.redirect('/budgets?success=1');
    } catch (err) {
      console.error('[BudgetController.setBudget] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/budgets?error=' + encodeURIComponent(err.message));
    }
  },

  async deleteBudget(req, res) {
    try {
      await BudgetModel.delete(req.params.id, req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Budget removed.' });
      }
      res.redirect('/budgets?deleted=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/budgets?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = BudgetController;
