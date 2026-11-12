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
      console.log('[Cron] Checking 24-hour streak and upcoming bill reminders for all users...');
      try {
        await StreakService.checkAllUsersFor24HourReminders();
        await this.checkUpcomingBillsAcrossUsers(3);
      } catch (err) {
        console.error('[Cron] Error in 30-min background cron:', err.message);
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
        await this.checkUpcomingBillsAcrossUsers(3);
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
        console.log('[SpendWise] Running initial 24-hour streak & upcoming bill reminder check on startup...');
        await StreakService.checkAllUsersFor24HourReminders();
        await this.checkUpcomingBillsAcrossUsers(3);
      } catch (err) {
        console.error('[SpendWise] Error in startup check:', err.message);
      }
    }, 5000);

    console.log('[SpendWise] All cron jobs registered successfully (Every 30m checks, Recurring Bills @ 08:00, Monthly Reports @ 1st 00:05).');
  },

  /**
   * Checks recurring bills due in next N days across all users and sends notifications
   */
  async checkUpcomingBillsAcrossUsers(daysAhead = 3) {
    try {
      const upcomingBills = await RecurringModel.getAllUpcomingDueAcrossUsers(daysAhead);
      for (const bill of upcomingBills) {
        // Prevent duplicate alerts on the same day for the same bill
        const existing = await db.oneOrNone(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND type = 'recurring_due' AND title LIKE $2 AND created_at >= CURRENT_DATE`,
          [bill.user_id, `%${bill.title}%`]
        );
        if (!existing) {
          const dueDateStr = new Date(bill.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          await NotificationService.sendNotification({
            userId: bill.user_id,
            type: 'recurring_due',
            title: `📅 Upcoming Bill: ${bill.title}`,
            message: `Reminder: ${bill.title} (${parseFloat(bill.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}) is due on ${dueDateStr}. Ensure your payment account is funded.`,
            link: '/recurring'
          });
        }
      }
    } catch (err) {
      console.error('[Cron] Error checking upcoming bills across users:', err.message);
    }
  },

  /**
   * Proactively checks upcoming bills for a single user upon dashboard access
   */
  async checkUpcomingBillsForUser(userId, daysAhead = 3) {
    try {
      const upcomingBills = await RecurringModel.getUpcomingDue(userId, daysAhead);
      for (const bill of upcomingBills) {
        const existing = await db.oneOrNone(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND type = 'recurring_due' AND title LIKE $2 AND created_at >= CURRENT_DATE`,
          [userId, `%${bill.title}%`]
        );
        if (!existing) {
          const dueDateStr = new Date(bill.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          await NotificationService.sendNotification({
            userId,
            type: 'recurring_due',
            title: `📅 Upcoming Bill: ${bill.title}`,
            message: `Reminder: ${bill.title} (${parseFloat(bill.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}) is due on ${dueDateStr}. Ensure your payment account is funded.`,
            link: '/recurring'
          });
        }
      }
    } catch (err) {
      console.error('[Cron] Error checking upcoming bills for user:', err.message);
    }
  },

  // Helper to trigger manually for demo/testing
  async triggerAllChecksNow() {
    console.log('[Cron] Manually triggering system checks...');
    await StreakService.checkAllUsersFor24HourReminders();
    await this.checkUpcomingBillsAcrossUsers(3);
  }
};

module.exports = CronService;
