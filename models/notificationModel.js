const { db } = require('../config/db');

const NotificationModel = {
  async create({ userId, type, title, message, link = null }) {
    return await db.one(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read)
       VALUES (?, ?, ?, ?, ?, FALSE)
       RETURNING *`,
      [userId, type, title, message, link]
    );
  },

  async getAllByUser(userId, { limit = 30, unreadOnly = false } = {}) {
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (unreadOnly) {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return await db.any(sql, params);
  },

  async getUnreadCount(userId) {
    const res = await db.oneOrNone(
      'SELECT COUNT(id) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return parseInt(res?.count || 0, 10);
  },

  async markAsRead(id, userId) {
    return await db.one(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ? RETURNING *',
      [id, userId]
    );
  },

  async markAllAsRead(userId) {
    return await db.none(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
  },

  async delete(id, userId) {
    return await db.none('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
  }
};

module.exports = NotificationModel;
