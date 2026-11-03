const { db } = require('../config/db');

const BudgetModel = {
  async setBudget({ userId, categoryId = null, month, amount, alertThreshold = 80 }) {
    // Check if budget exists for this user, category, and month
    let existing;
    if (categoryId) {
      existing = await db.oneOrNone(
        'SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category_id = ?',
        [userId, month, categoryId]
      );
    } else {
      existing = await db.oneOrNone(
        'SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category_id IS NULL',
        [userId, month]
      );
    }

    if (existing) {
      return await db.one(
        `UPDATE budgets 
         SET amount = ?, alert_threshold = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? RETURNING *`,
        [amount, alertThreshold, existing.id]
      );
    } else {
      return await db.one(
        `INSERT INTO budgets (user_id, category_id, month, amount, alert_threshold)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`,
        [userId, categoryId || null, month, amount, alertThreshold]
      );
    }
  },

  async delete(id, userId) {
    return await db.none('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);
  },

  async getBudgetsWithSpending(userId, month) {
    // 1. Get all budgets for month
    const budgets = await db.any(
      `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ?
       ORDER BY CASE WHEN b.category_id IS NULL THEN 0 ELSE 1 END, b.amount DESC`,
      [userId, month]
    );

    // 2. Get category spending for month
    const spendingRows = await db.any(
      `SELECT category_id, COALESCE(SUM(amount), 0) as spent
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND TO_CHAR(transaction_date, 'YYYY-MM') = ?
       GROUP BY category_id`,
      [userId, month]
    );

    const spendMap = {};
    let totalExpenseAll = 0;
    spendingRows.forEach(r => {
      const amt = parseFloat(r.spent);
      spendMap[r.category_id] = amt;
      totalExpenseAll += amt;
    });

    // 3. Attach spending stats to budgets
    return budgets.map(b => {
      const budgetAmount = parseFloat(b.amount);
      const spent = b.category_id === null ? totalExpenseAll : (spendMap[b.category_id] || 0);
      const remaining = budgetAmount - spent;
      const percentage = budgetAmount > 0 ? Math.min(Math.round((spent / budgetAmount) * 100), 999) : 0;
      const isExceeded = spent > budgetAmount;
      const isNearLimit = percentage >= (b.alert_threshold || 80) && !isExceeded;

      return {
        ...b,
        budget_amount: budgetAmount,
        spent_amount: spent,
        remaining_amount: remaining,
        percentage_used: percentage,
        is_exceeded: isExceeded,
        is_near_limit: isNearLimit
      };
    });
  },

  async getBudgetSummary(userId, month) {
    const list = await this.getBudgetsWithSpending(userId, month);
    const overall = list.find(b => b.category_id === null);
    const categoryBudgets = list.filter(b => b.category_id !== null);

    return {
      overall,
      categoryBudgets,
      hasExceeded: list.some(b => b.is_exceeded),
      exceededCount: list.filter(b => b.is_exceeded).length
    };
  }
};

module.exports = BudgetModel;
