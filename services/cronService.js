const cron = require('node-cron');
const { db } = require('../config/db');
const StreakService = require('./streakService');
const RecurringModel = require('../models/recurringModel');
const NotificationService = require('./notificationService');
const ReportService = require('./reportService');

const CronService = {
  initScheduledJobs() {
    console.log('[SpendWise] Initializing Node-Cron background schedules...');

    // 1. Regular 24-Hour Streak & Income/Expense Reminder (Runs every 30 minutes while active)
    cron.schedule('*/30 * * * *', async () => {
      console.log('[Cron] Checking 24-hour streak and income/expense reminders for all users...');
      try {
        await StreakService.checkAllUsersFor24HourReminders();
      } catch (err) {
        console.error('[Cron] Error in 24-hour streak cron:', err.message);
      }
    });

    // 2. Daily Evening Streak Check (Runs daily at 20:00 / 8:00 PM)
    cron.schedule('0 20 * * *', async () => {
      console.log('[Cron] Running daily evening streak check...');
      try {
        await StreakService.checkAllUsersFor24HourReminders();
      } catch (err) {
        console.error('[Cron] Error in daily streak cron:', err.message);
      }
    });

    // 3. Daily Morning Recurring Bill Reminder (Runs daily at 08:00 AM)
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

    // 4. Monthly Report Auto-Generation (Runs at 00:05 AM on the 1st of every month)
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

    // 5. Initial check on server startup / container wake-up (after 5 seconds)
    setTimeout(async () => {
      try {
        console.log('[SpendWise] Running initial 24-hour streak & income/expense reminder check on startup...');
        await StreakService.checkAllUsersFor24HourReminders();
      } catch (err) {
        console.error('[SpendWise] Error in startup streak check:', err.message);
      }
    }, 5000);

    console.log('[SpendWise] All cron jobs registered successfully (Every 30m 24h reminders, Daily Streaks @ 20:00, Recurring Bills @ 08:00, Monthly Reports @ 1st 00:05).');
  },

  // Helper to trigger manually for demo/testing
  async triggerAllChecksNow() {
    console.log('[Cron] Manually triggering system checks...');
    await StreakService.checkAllUsersFor24HourReminders();
  }
};

module.exports = CronService;
