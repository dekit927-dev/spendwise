const { db } = require('../config/db');

const StreakModel = {
  async getStreak(userId) {
    let streak = await db.oneOrNone('SELECT * FROM streaks WHERE user_id = ?', [userId]);
    if (!streak) {
      streak = await db.one(
        `INSERT INTO streaks (user_id, current_streak, longest_streak, total_days_tracked, streak_freezes)
         VALUES (?, 0, 0, 0, 2)
         RETURNING *`,
        [userId]
      );
    }
    return streak;
  },

  async getRecentLogs(userId, days = 30) {
    return await db.any(
      `SELECT * FROM streak_logs 
       WHERE user_id = ? AND activity_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY activity_date DESC`,
      [userId]
    );
  },

  async hasLoggedToday(userId, dateStr) {
    const log = await db.oneOrNone(
      'SELECT id, activity_type FROM streak_logs WHERE user_id = ? AND activity_date = ?',
      [userId, dateStr]
    );
    return !!log;
  },

  async logActivity(userId, activityDate, activityType = 'expense_recorded', notes = '') {
    // Upsert streak log
    await db.none(
      `INSERT INTO streak_logs (user_id, activity_date, activity_type, notes)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, activity_date) 
       DO UPDATE SET activity_type = EXCLUDED.activity_type, notes = EXCLUDED.notes`,
      [userId, activityDate, activityType, notes]
    );

    // Recalculate streak
    return await this.recalculateStreak(userId);
  },

  async recalculateStreak(userId) {
    const logs = await db.any(
      `SELECT activity_date::text as date_str 
       FROM streak_logs 
       WHERE user_id = ? 
       ORDER BY activity_date DESC`,
      [userId]
    );

    if (logs.length === 0) {
      return await db.one(
        'UPDATE streaks SET current_streak = 0, last_activity_date = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? RETURNING *',
        [userId]
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logDates = new Set(logs.map(l => l.date_str.split('T')[0]));

    let currentStreak = 0;
    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split('T')[0];

    // If no entry today, check if yesterday was logged to preserve streak
    if (!logDates.has(todayStr)) {
      checkDate = yesterday;
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (logDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const totalDays = logDates.size;
    const existing = await this.getStreak(userId);
    const longestStreak = Math.max(existing.longest_streak || 0, currentStreak);
    const lastDate = logs[0].date_str.split('T')[0];

    const updated = await db.one(
      `UPDATE streaks 
       SET current_streak = ?, longest_streak = ?, last_activity_date = ?, 
           total_days_tracked = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?
       RETURNING *`,
      [currentStreak, longestStreak, lastDate, totalDays, userId]
    );

    return updated;
  },

  async getBadges(userId) {
    return await db.any(
      'SELECT * FROM milestone_badges WHERE user_id = ? ORDER BY milestone_days ASC',
      [userId]
    );
  },

  async awardBadge(userId, milestoneDays, badgeName, badgeIcon, badgeDesc) {
    return await db.oneOrNone(
      `INSERT INTO milestone_badges (user_id, milestone_days, badge_name, badge_icon, badge_description)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, milestone_days) DO NOTHING
       RETURNING *`,
      [userId, milestoneDays, badgeName, badgeIcon, badgeDesc]
    );
  },

  async useStreakFreeze(userId) {
    const streak = await this.getStreak(userId);
    if ((streak.streak_freezes || 0) <= 0) {
      throw new Error('No streak freezes available.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    await this.logActivity(userId, todayStr, 'streak_freeze_used', 'Protected streak using streak freeze shield!');
    
    return await db.one(
      'UPDATE streaks SET streak_freezes = streak_freezes - 1 WHERE user_id = ? RETURNING *',
      [userId]
    );
  }
};

module.exports = StreakModel;
