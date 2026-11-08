const { db } = require('../config/db');
const StreakModel = require('../models/streakModel');
const NotificationService = require('./notificationService');
const NotificationModel = require('../models/notificationModel');

const MILESTONES = [
  { days: 7, name: '7-Day Streak Pioneer', icon: 'fa-fire-flame-curved', desc: "Maintained 7 consecutive days of active financial tracking!" },
  { days: 14, name: 'Fortnight Financial Hero', icon: 'fa-shield-halved', desc: "2 full weeks of disciplined daily habit building!" },
  { days: 30, name: '30-Day Budget Master', icon: 'fa-crown', desc: "A full month of consistent daily financial tracking!" },
  { days: 60, name: '60-Day Habit Champion', icon: 'fa-medal', desc: "2 full months of unstoppable financial discipline!" },
  { days: 100, name: 'Centurion of Wealth', icon: 'fa-gem', desc: "100 consecutive days of mastery over your spending!" }
];

const StreakService = {
  async recordDailyActivity(userId, activityType = 'expense_recorded', notes = '') {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedStreak = await StreakModel.logActivity(userId, todayStr, activityType, notes);

    // Auto-resolve any pending streak reminder dispatches since user logged activity today
    await db.none(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1 AND type = 'streak_reminder' AND is_read = FALSE`,
      [userId]
    ).catch(() => {});
    await NotificationService.sendUnreadCountUpdate(userId);

    // Check milestones
    await this.checkMilestones(userId, updatedStreak.current_streak);

    return updatedStreak;
  },

  async confirmZeroSpending(userId, notes = 'Confirmed Nu. 0 spending today!') {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedStreak = await StreakModel.logActivity(userId, todayStr, 'zero_spending_confirmed', notes);

    // Auto-resolve any pending streak reminder dispatches
    await db.none(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1 AND type = 'streak_reminder' AND is_read = FALSE`,
      [userId]
    ).catch(() => {});
    await NotificationService.sendUnreadCountUpdate(userId);

    // Milestone check
    await this.checkMilestones(userId, updatedStreak.current_streak);

    // Also send an encouraging real-time notification
    await NotificationService.sendNotification({
      userId,
      type: 'zero_spending',
      title: '🌟 Zero-Spending Day Logged!',
      message: `Bravo! You confirmed zero expenses today. Your streak is now active at ${updatedStreak.current_streak} days.`,
      link: '/streaks'
    });

    return updatedStreak;
  },

  async checkMilestones(userId, currentStreak) {
    for (const m of MILESTONES) {
      if (currentStreak >= m.days) {
        const awarded = await StreakModel.awardBadge(userId, m.days, m.name, m.icon, m.desc);
        if (awarded) {
          // Send notification and celebrate!
          const msg = `You've maintained your spending-tracking streak for ${m.days} consecutive days! Keep going!`;
          await NotificationService.sendNotification({
            userId,
            type: 'streak_milestone',
            title: `🔥 ${m.name} Unlocked!`,
            message: msg,
            link: '/streaks'
          });

          NotificationService.emitMilestoneCelebration(userId, {
            milestoneDays: m.days,
            badgeName: m.name,
            badgeIcon: m.icon,
            message: msg
          });
        }
      }
    }
  },

  /**
   * Evaluates if a user has not recorded any income or expense in the last 24 hours.
   * If 24 hours have elapsed without any activity, dispatches a persistent reminder notification.
   */
  async checkAndSend24HourReminder(userId) {
    try {
      const now = Date.now();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Check if user already recorded activity today
      const hasLoggedToday = await StreakModel.hasLoggedToday(userId, todayStr);
      if (hasLoggedToday) {
        // User is up-to-date today; mark any lingering streak reminder as read
        await db.none(
          `UPDATE notifications 
           SET is_read = TRUE 
           WHERE user_id = $1 AND type = 'streak_reminder' AND is_read = FALSE`,
          [userId]
        ).catch(() => {});
        return false;
      }

      // 2. Query user's latest recorded transaction or streak log
      const activityRes = await db.oneOrNone(
        `SELECT MAX(act_time) as last_time FROM (
           SELECT created_at as act_time FROM transactions WHERE user_id = $1
           UNION ALL
           SELECT created_at as act_time FROM streak_logs WHERE user_id = $1
         ) combined`,
        [userId]
      );

      let lastActivityTime = activityRes?.last_time ? new Date(activityRes.last_time).getTime() : null;
      if (!lastActivityTime) {
        const user = await db.oneOrNone('SELECT created_at FROM users WHERE id = $1', [userId]);
        lastActivityTime = user?.created_at ? new Date(user.created_at).getTime() : (now - twentyFourHoursMs);
      }

      // 3. Has it been at least 24 hours since their last recorded transaction or streak log?
      const isPast24Hours = (now - lastActivityTime) >= twentyFourHoursMs;
      if (!isPast24Hours) {
        return false;
      }

      // 4. Check if we already sent a streak reminder in the last 24 hours to prevent spam
      const lastReminder = await db.oneOrNone(
        `SELECT created_at FROM notifications 
         WHERE user_id = $1 AND type = 'streak_reminder'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (lastReminder) {
        const lastReminderTime = new Date(lastReminder.created_at).getTime();
        if ((now - lastReminderTime) < twentyFourHoursMs) {
          return false;
        }
      }

      // 5. Send the 24-hour reminder notification!
      const streak = await StreakModel.getStreak(userId);
      const currentStreak = streak ? (streak.current_streak || 0) : 0;
      const streakMsg = currentStreak > 0
        ? ` Protect your ${currentStreak}-day habit streak!`
        : ` Keep your momentum going and extend your streak today!`;

      await NotificationService.sendNotification({
        userId,
        type: 'streak_reminder',
        title: '🔥 Record Your Daily Income & Expenses',
        message: `You haven't recorded any income or expenses in the last 24 hours.${streakMsg} Log your daily transactions or confirm Nu. 0 spending today to maintain your streak.`,
        link: '/transactions'
      });

      console.log(`[StreakService] 24-hour reminder successfully sent to user ${userId}`);
      return true;
    } catch (err) {
      console.error('[StreakService.checkAndSend24HourReminder] Error:', err.message);
      return false;
    }
  },

  /**
   * Checks all users in the system and triggers 24h reminders if inactive.
   */
  async checkAllUsersFor24HourReminders() {
    try {
      const users = await db.any('SELECT id FROM users');
      for (const u of users) {
        await this.checkAndSend24HourReminder(u.id);
      }
    } catch (err) {
      console.error('[StreakService.checkAllUsersFor24HourReminders] Error:', err.message);
    }
  }
};

module.exports = StreakService;
