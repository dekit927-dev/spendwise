const { db } = require('../config/db');

const TransactionModel = {
  async create({ userId, categoryId, type, amount, description, transactionDate, paymentMethod = 'Mobile Banking', receiptUrl = null, isZeroSpending = false }) {
    return await db.one(
      `INSERT INTO transactions 
        (user_id, category_id, type, amount, description, transaction_date, payment_method, receipt_url, is_zero_spending_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [userId, categoryId || null, type, amount, description, transactionDate, paymentMethod, receiptUrl, isZeroSpending]
    );
  },

  async findById(id, userId) {
    return await db.oneOrNone(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, userId]
    );
  },

  async update(id, userId, { categoryId, type, amount, description, transactionDate, paymentMethod, receiptUrl }) {
    return await db.one(
      `UPDATE transactions
       SET category_id = ?, type = ?, amount = ?, description = ?, 
           transaction_date = ?, payment_method = ?, receipt_url = COALESCE(?, receipt_url), updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?
       RETURNING *`,
      [categoryId || null, type, amount, description, transactionDate, paymentMethod, receiptUrl, id, userId]
    );
  },

  async delete(id, userId) {
    return await db.none('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
  },

  async getAllByUser(userId, { type, categoryId, startDate, endDate, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (type) {
      params.push(type);
      sql += ` AND t.type = ?`;
    }
    if (categoryId) {
      params.push(categoryId);
      sql += ` AND t.category_id = ?`;
    }
    if (startDate) {
      params.push(startDate);
      sql += ` AND t.transaction_date >= ?`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND t.transaction_date <= ?`;
    }

    sql += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await db.any(sql, params);
  },

  async getMonthlyTotals(userId, month) {
    // month format: 'YYYY-MM'
    const res = await db.oneOrNone(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions
       WHERE user_id = ? AND TO_CHAR(transaction_date, 'YYYY-MM') = ?`,
      [userId, month]
    );
    return {
      total_income: parseFloat(res?.total_income || 0),
      total_expense: parseFloat(res?.total_expense || 0),
      net_savings: parseFloat(res?.total_income || 0) - parseFloat(res?.total_expense || 0)
    };
  },

  async getCategorySpending(userId, month) {
    return await db.any(
      `SELECT 
        c.id as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.icon, 'fa-tag') as category_icon,
        COALESCE(c.color, '#6B7280') as category_color,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND TO_CHAR(t.transaction_date, 'YYYY-MM') = ?
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total_amount DESC`,
      [userId, month]
    );
  },

  async getDailySpendingTrends(userId, month) {
    return await db.any(
      `SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM-DD') as day,
        COALESCE(SUM(amount), 0) as total_amount
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND TO_CHAR(transaction_date, 'YYYY-MM') = ?
       GROUP BY TO_CHAR(transaction_date, 'YYYY-MM-DD')
       ORDER BY day ASC`,
      [userId, month]
    );
  },

  async getRecentActivity(userId, limit = 5) {
    return await db.any(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
  },

  async getCategories(type = null) {
    if (type) {
      return await db.any('SELECT * FROM categories WHERE type = ? ORDER BY name ASC', [type]);
    }
    return await db.any('SELECT * FROM categories ORDER BY type ASC, name ASC');
  },

  async getMonthCalendarData(userId, month) {
    // month format: 'YYYY-MM'
    const transactions = await db.any(
      `SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.payment_method,
        t.is_zero_spending_day,
        TO_CHAR(t.transaction_date, 'YYYY-MM-DD') as date_str,
        c.id as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.icon, 'fa-wallet') as category_icon,
        COALESCE(c.color, '#10B981') as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND TO_CHAR(t.transaction_date, 'YYYY-MM') = ?
       ORDER BY t.transaction_date ASC, t.id ASC`,
      [userId, month]
    );

    const daysMap = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      const d = t.date_str;
      if (!daysMap[d]) {
        daysMap[d] = {
          date: d,
          income: 0,
          expense: 0,
          hasZeroSpending: false,
          transactions: []
        };
      }
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        daysMap[d].income += amt;
        totalIncome += amt;
      } else {
        daysMap[d].expense += amt;
        totalExpense += amt;
      }
      if (t.is_zero_spending_day) {
        daysMap[d].hasZeroSpending = true;
      }
      daysMap[d].transactions.push(t);
    });

    return {
      month,
      days: daysMap,
      monthlyTotals: {
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense
      }
    };
  }
};

module.exports = TransactionModel;
