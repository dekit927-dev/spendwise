const StreakModel = require('../models/streakModel');
const NotificationService = require('./notificationService');

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

    // Check milestones
    await this.checkMilestones(userId, updatedStreak.current_streak);

    return updatedStreak;
  },

  async confirmZeroSpending(userId, notes = 'Confirmed Nu. 0 spending today!') {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedStreak = await StreakModel.logActivity(userId, todayStr, 'zero_spending_confirmed', notes);

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
  }
};

module.exports = StreakService;
