const cron = require('node-cron');
const { db } = require('../config/db');
const StreakModel = require('../models/streakModel');
const RecurringModel = require('../models/recurringModel');
const NotificationService = require('./notificationService');
const ReportService = require('./reportService');

const CronService = {
  initScheduledJobs() {
    console.log('[SpendWise] Initializing Node-Cron background schedules...');

    // 1. Daily Evening Streak Reminder (Runs daily at 20:00 / 8:00 PM)
    cron.schedule('0 20 * * *', async () => {
      console.log('[Cron] Running daily evening streak check...');
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const users = await db.any('SELECT id, name FROM users');

        for (const user of users) {
          const hasLogged = await StreakModel.hasLoggedToday(user.id, todayStr);
          if (!hasLogged) {
            const streak = await StreakModel.getStreak(user.id);
            await NotificationService.sendNotification({
              userId: user.id,
              type: 'streak_reminder',
              title: '🔥 Keep Your Streak Alive!',
              message: `You haven't logged your spending today. Don't break your ${streak.current_streak}-day streak! Record your expenses or confirm a Nu. 0 spending day.`,
              link: '/transactions'
            });
          }
        }
      } catch (err) {
        console.error('[Cron] Error in daily streak cron:', err.message);
      }
    });

    // 2. Daily Morning Recurring Bill Reminder (Runs daily at 08:00 AM)
    cron.schedule('0 8 * * *', async () => {
      console.log('[Cron] Running daily recurring bill checks...');
      try {
        const upcomingBills = await RecurringModel.getAllUpcomingDueAcrossUsers(3);
        for (const bill of upcomingBills) {
          const dueDateStr = new Date(bill.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          await NotificationService.sendNotification({
            userId: bill.user_id,
            type: 'recurring_due',
            title: `📅 Upcoming Bill: ${bill.title}`,
            message: `Reminder: ${bill.title} (${bill.amount}) is due on ${dueDateStr}. Ensure your payment account is funded.`,
            link: '/recurring'
          });
        }
      } catch (err) {
        console.error('[Cron] Error in recurring bill cron:', err.message);
      }
    });

    // 3. Monthly Report Auto-Generation (Runs at 00:05 AM on the 1st of every month)
    cron.schedule('5 0 1 * *', async () => {
      console.log('[Cron] Running monthly report generation for all active users...');
      try {
        const today = new Date();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const users = await db.any('SELECT id FROM users');
        for (const user of users) {
          await ReportService.generateMonthlyReport(user.id, prevMonthKey);
        }
      } catch (err) {
        console.error('[Cron] Error in monthly report cron:', err.message);
      }
    });

    console.log('[SpendWise] All cron jobs registered successfully (Daily Streaks @ 20:00, Recurring Bills @ 08:00, Monthly Reports @ 1st 00:05).');
  },

  // Helper to trigger manually for demo/testing
  async triggerAllChecksNow() {
    console.log('[Cron] Manually triggering system checks...');
    const todayStr = new Date().toISOString().split('T')[0];
    const users = await db.any('SELECT id FROM users');
    for (const u of users) {
      const hasLogged = await StreakModel.hasLoggedToday(u.id, todayStr);
      if (!hasLogged) {
        const streak = await StreakModel.getStreak(u.id);
        await NotificationService.sendNotification({
          userId: u.id,
          type: 'streak_reminder',
          title: '🔥 Daily Tracking Reminder',
          message: `Keep your momentum! Record your daily spending or confirm a Nu. 0 spending day to extend your ${streak.current_streak}-day flame.`,
          link: '/transactions'
        });
      }
    }
  }
};

module.exports = CronService;
