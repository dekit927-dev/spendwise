const { db } = require('../config/db');

const SuggestionModel = {
  async saveSuggestions(userId, month, suggestions) {
    const saved = [];
    for (const s of suggestions) {
      const row = await db.one(
        `INSERT INTO personalized_suggestions 
          (user_id, month, rule_key, title, current_pattern, suggestion_text, action_type, potential_saving)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [userId, month, s.rule_key, s.title, s.current_pattern, s.suggestion_text, s.action_type || 'general', s.potential_saving || 0]
      );
      saved.push(row);
    }
    return saved;
  },

  async getByUserAndMonth(userId, month) {
    return await db.any(
      `SELECT * FROM personalized_suggestions 
       WHERE user_id = ? AND month = ?
       ORDER BY potential_saving DESC, created_at DESC`,
      [userId, month]
    );
  },

  async getLatestByUser(userId, limit = 6) {
    return await db.any(
      `SELECT * FROM personalized_suggestions 
       WHERE user_id = ?
       ORDER BY created_at DESC, potential_saving DESC
       LIMIT ?`,
      [userId, limit]
    );
  },

  async markApplied(id, userId) {
    return await db.one(
      `UPDATE personalized_suggestions 
       SET is_applied = TRUE 
       WHERE id = ? AND user_id = ?
       RETURNING *`,
      [id, userId]
    );
  },

  async clearMonthSuggestions(userId, month) {
    return await db.none(
      'DELETE FROM personalized_suggestions WHERE user_id = ? AND month = ?',
      [userId, month]
    );
  }
};

module.exports = SuggestionModel;
