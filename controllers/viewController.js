const TransactionModel = require('../models/transactionModel');
const StreakModel = require('../models/streakModel');
const BudgetModel = require('../models/budgetModel');
const RecurringModel = require('../models/recurringModel');
const ReportModel = require('../models/reportModel');
const ReportService = require('../services/reportService');
const SuggestionModel = require('../models/suggestionModel');
const SuggestionService = require('../services/suggestionService');
const NotificationModel = require('../models/notificationModel');
const UserModel = require('../models/userModel');
const StreakService = require('../services/streakService');

const ViewController = {
  renderIndex(req, res) {
    if (req.user) {
      return res.redirect('/dashboard');
    }
    res.render('index', {
      pageTitle: 'SpendWise – Smart Personal Finance & Gamified Tracking',
      currentUser: null
    });
  },

  renderLogin(req, res) {
    if (req.user) return res.redirect('/dashboard');
    res.render('login', {
      pageTitle: 'Sign In | SpendWise',
      currentUser: null,
      error: null,
      email: ''
    });
  },

  renderRegister(req, res) {
    if (req.user) return res.redirect('/dashboard');
    res.render('register', {
      pageTitle: 'Create Account | SpendWise',
      currentUser: null,
      error: null,
      formData: {}
    });
  },

  async renderDashboard(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const todayStr = today.toISOString().split('T')[0];

      // 0. Proactively evaluate 24-hour streak inactivity and upcoming bill reminders
      await StreakService.checkAndSend24HourReminder(req.user.id);
      const CronService = require('../services/cronService');
      await CronService.checkUpcomingBillsForUser(req.user.id, 3);

      // 1. Financial stats
      const totals = await TransactionModel.getMonthlyTotals(req.user.id, currentMonthKey);
      const user = await UserModel.findById(req.user.id);
      const currency = user?.currency || 'Nu.';

      // 2. Streaks
      const streak = await StreakModel.getStreak(req.user.id);
      const hasLoggedToday = await StreakModel.hasLoggedToday(req.user.id, todayStr);

      // 3. Recent activity
      const recentTransactions = await TransactionModel.getRecentActivity(req.user.id, 6);

      // 4. Budget summary
      const budgetSummary = await BudgetModel.getBudgetSummary(req.user.id, currentMonthKey);

      // 5. Suggestions
      let latestSuggestions = await SuggestionModel.getByUserAndMonth(req.user.id, currentMonthKey);
      if (latestSuggestions.length === 0) {
        latestSuggestions = await SuggestionService.generateSuggestionsForUser(req.user.id, currentMonthKey);
      }

      // 6. Upcoming recurring bills
      const upcomingBills = await RecurringModel.getUpcomingDue(req.user.id, 3);

      // 7. Categories for quick-add modal
      const categories = await TransactionModel.getCategories();

      // 8. Notifications unread
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      // 9. Real-time calendar data for current month
      const calendarData = await TransactionModel.getMonthCalendarData(req.user.id, currentMonthKey);

      res.render('dashboard', {
        pageTitle: 'Dashboard | SpendWise',
        currentUser: user,
        currency,
        totals,
        streak,
        hasLoggedToday,
        recentTransactions,
        budgetSummary,
        latestSuggestions: latestSuggestions.slice(0, 3),
        upcomingBills,
        categories,
        unreadCount,
        currentMonthKey,
        calendarData
      });
    } catch (err) {
      console.error('[ViewController.renderDashboard] Error:', err);
      res.status(500).render('error', {
        pageTitle: 'Error',
        statusCode: 500,
        message: err.message,
        currentUser: req.user
      });
    }
  },

  async renderTransactions(req, res) {
    try {
      const { type, categoryId, startDate, endDate } = req.query;
      const transactions = await TransactionModel.getAllByUser(req.user.id, {
        type,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        startDate,
        endDate,
        limit: 150
      });

      const categories = await TransactionModel.getCategories();
      const user = await UserModel.findById(req.user.id);
      const streak = await StreakModel.getStreak(req.user.id);
      const todayStr = new Date().toISOString().split('T')[0];
      const hasLoggedToday = await StreakModel.hasLoggedToday(req.user.id, todayStr);
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('transactions', {
        pageTitle: 'Income & Expenses | SpendWise',
        currentUser: user,
        currency: user.currency || 'Nu.',
        transactions,
        categories,
        streak,
        hasLoggedToday,
        unreadCount,
        query: req.query
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderStreaks(req, res) {
    try {
      const streak = await StreakModel.getStreak(req.user.id);
      const badges = await StreakModel.getBadges(req.user.id);
      const logs = await StreakModel.getRecentLogs(req.user.id, 30);
      const todayStr = new Date().toISOString().split('T')[0];
      const hasLoggedToday = await StreakModel.hasLoggedToday(req.user.id, todayStr);
      const user = await UserModel.findById(req.user.id);
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('streaks', {
        pageTitle: 'Daily Streaks & Milestones | SpendWise',
        currentUser: user,
        streak,
        badges,
        logs,
        hasLoggedToday,
        unreadCount
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderAnalytics(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;

      const user = await UserModel.findById(req.user.id);
      const totals = await TransactionModel.getMonthlyTotals(req.user.id, month);
      const categories = await TransactionModel.getCategories();
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('analytics', {
        pageTitle: 'Spending Analytics | SpendWise',
        currentUser: user,
        currency: user.currency || 'Nu.',
        month,
        totals,
        categories,
        unreadCount
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderBudgets(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;

      const user = await UserModel.findById(req.user.id);
      const budgets = await BudgetModel.getBudgetsWithSpending(req.user.id, month);
      const categories = await TransactionModel.getCategories('expense');
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('budgets', {
        pageTitle: 'Budget Management | SpendWise',
        currentUser: user,
        currency: user.currency || 'Nu.',
        month,
        budgets,
        categories,
        unreadCount,
        query: req.query
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderRecurring(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      const recurringItems = await RecurringModel.getAllByUser(req.user.id);
      const categories = await TransactionModel.getCategories('expense');
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('recurring', {
        pageTitle: 'Recurring Expenses & Bills | SpendWise',
        currentUser: user,
        currency: user.currency || 'Nu.',
        recurringItems,
        categories,
        unreadCount
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderMonthlyReports(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      const today = new Date();
      const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const defaultMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || defaultMonth;

      let report = await ReportModel.getByUserAndMonth(req.user.id, month);
      if (!report) {
        report = await ReportService.generateMonthlyReport(req.user.id, month);
      }

      const allReports = await ReportModel.getAllByUser(req.user.id);
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('monthly-reports', {
        pageTitle: 'End-of-Month Reports | SpendWise',
        currentUser: user,
        currency: user.currency || 'Nu.',
        currentReport: report,
        allReports,
        month,
        unreadCount
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderSuggestions(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;

      let suggestions = await SuggestionModel.getByUserAndMonth(req.user.id, month);
      if (suggestions.length === 0) {
        suggestions = await SuggestionService.generateSuggestionsForUser(req.user.id, month);
      }

      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('suggestions', {
        pageTitle: 'Personalized Next-Month Suggestions | SpendWise',
        currentUser: user,
        currency: user.currency || 'Nu.',
        suggestions,
        month,
        unreadCount
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderNotifications(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      const notifications = await NotificationModel.getAllByUser(req.user.id, { limit: 50 });
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('notifications', {
        pageTitle: 'Notifications Center | SpendWise',
        currentUser: user,
        notifications,
        unreadCount
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  },

  async renderProfile(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      const streak = await StreakModel.getStreak(req.user.id);
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.render('profile', {
        pageTitle: 'My Profile & Settings | SpendWise',
        currentUser: user,
        streak,
        unreadCount,
        query: req.query
      });
    } catch (err) {
      res.status(500).render('error', { pageTitle: 'Error', statusCode: 500, message: err.message, currentUser: req.user });
    }
  }
};

module.exports = ViewController;
