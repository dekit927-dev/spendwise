const { db } = require('../config/db');

const ReportModel = {
  async saveReport({
    userId,
    month,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    highestCategoryId,
    highestCategoryName,
    highestCategoryAmount,
    exceededBudgetsJson,
    reportSummary
  }) {
    return await db.one(
      `INSERT INTO monthly_reports 
        (user_id, month, total_income, total_expense, net_savings, savings_rate, 
         highest_category_id, highest_category_name, highest_category_amount, 
         exceeded_budgets_json, report_summary, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, month) 
       DO UPDATE SET 
         total_income = EXCLUDED.total_income,
         total_expense = EXCLUDED.total_expense,
         net_savings = EXCLUDED.net_savings,
         savings_rate = EXCLUDED.savings_rate,
         highest_category_id = EXCLUDED.highest_category_id,
         highest_category_name = EXCLUDED.highest_category_name,
         highest_category_amount = EXCLUDED.highest_category_amount,
         exceeded_budgets_json = EXCLUDED.exceeded_budgets_json,
         report_summary = EXCLUDED.report_summary,
         generated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        month,
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        highestCategoryId || null,
        highestCategoryName,
        highestCategoryAmount,
        exceededBudgetsJson,
        reportSummary
      ]
    );
  },

  async getByUserAndMonth(userId, month) {
    return await db.oneOrNone(
      `SELECT r.*, c.icon as highest_category_icon, c.color as highest_category_color
       FROM monthly_reports r
       LEFT JOIN categories c ON r.highest_category_id = c.id
       WHERE r.user_id = ? AND r.month = ?`,
      [userId, month]
    );
  },

  async getAllByUser(userId) {
    return await db.any(
      `SELECT r.*, c.icon as highest_category_icon, c.color as highest_category_color
       FROM monthly_reports r
       LEFT JOIN categories c ON r.highest_category_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.month DESC`,
      [userId]
    );
  }
};

module.exports = ReportModel;
