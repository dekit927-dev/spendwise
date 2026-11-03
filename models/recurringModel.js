const { db } = require('../config/db');

const RecurringModel = {
  async create({ userId, title, categoryId, amount, frequency = 'monthly', billingDay, nextDueDate, paymentMethod = 'Mobile Banking', notes = '' }) {
    return await db.one(
      `INSERT INTO recurring_expenses 
        (user_id, title, category_id, amount, frequency, billing_day, next_due_date, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [userId, title, categoryId || null, amount, frequency, billingDay, nextDueDate, paymentMethod, notes]
    );
  },

  async getAllByUser(userId) {
    return await db.any(
      `SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM recurring_expenses r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.next_due_date ASC, r.title ASC`,
      [userId]
    );
  },

  async findById(id, userId) {
    return await db.oneOrNone(
      `SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM recurring_expenses r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.id = ? AND r.user_id = ?`,
      [id, userId]
    );
  },

  async update(id, userId, { title, categoryId, amount, frequency, billingDay, nextDueDate, paymentMethod, isActive, notes }) {
    return await db.one(
      `UPDATE recurring_expenses
       SET title = ?, category_id = ?, amount = ?, frequency = ?, 
           billing_day = ?, next_due_date = ?, payment_method = ?, is_active = ?, notes = ?
       WHERE id = ? AND user_id = ?
       RETURNING *`,
      [title, categoryId || null, amount, frequency, billingDay, nextDueDate, paymentMethod, isActive, notes, id, userId]
    );
  },

  async toggleActive(id, userId) {
    return await db.one(
      `UPDATE recurring_expenses
       SET is_active = NOT is_active
       WHERE id = ? AND user_id = ?
       RETURNING *`,
      [id, userId]
    );
  },

  async delete(id, userId) {
    return await db.none('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?', [id, userId]);
  },

  async getUpcomingDue(userId, daysAhead = 3) {
    return await db.any(
      `SELECT r.*, c.name as category_name
       FROM recurring_expenses r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ? 
         AND r.is_active = TRUE 
         AND r.next_due_date >= CURRENT_DATE 
         AND r.next_due_date <= CURRENT_DATE + (INTERVAL '1 day' * ?)
       ORDER BY r.next_due_date ASC`,
      [userId, daysAhead]
    );
  },

  async getAllUpcomingDueAcrossUsers(daysAhead = 3) {
    return await db.any(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM recurring_expenses r
       JOIN users u ON r.user_id = u.id
       WHERE r.is_active = TRUE 
         AND r.next_due_date >= CURRENT_DATE 
         AND r.next_due_date <= CURRENT_DATE + (INTERVAL '1 day' * ?)`,
      [daysAhead]
    );
  }
};

module.exports = RecurringModel;
