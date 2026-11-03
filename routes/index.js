const express = require('express');
const router = express.Router();
const ViewController = require('../controllers/viewController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const apiRouter = require('./api');
const authRoutes = require('./authRoutes');
const transactionRoutes = require('./transactionRoutes');
const streakRoutes = require('./streakRoutes');
const budgetRoutes = require('./budgetRoutes');
const recurringRoutes = require('./recurringRoutes');
const reportRoutes = require('./reportRoutes');
const suggestionRoutes = require('./suggestionRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount REST API
router.use('/api', apiRouter);

// Mount Auth Form actions (login, register, logout, profile update)
router.use('/auth', authRoutes);

// Public View Routes
router.get('/', optionalAuth, ViewController.renderIndex);
router.get('/login', optionalAuth, ViewController.renderLogin);
router.get('/register', optionalAuth, ViewController.renderRegister);

// Protected View Routes & Form Handlers
router.get('/dashboard', authenticate, ViewController.renderDashboard);

// Transactions (Page View & Form Submissions)
router.get('/transactions', authenticate, ViewController.renderTransactions);
router.use('/transactions', transactionRoutes);

// Streaks (Page View & Form Submissions)
router.get('/streaks', authenticate, ViewController.renderStreaks);
router.use('/streaks', streakRoutes);

// Analytics
router.get('/analytics', authenticate, ViewController.renderAnalytics);

// Budgets (Page View & Form Submissions)
router.get('/budgets', authenticate, ViewController.renderBudgets);
router.use('/budgets', budgetRoutes);

// Recurring Expenses (Page View & Form Submissions)
router.get('/recurring', authenticate, ViewController.renderRecurring);
router.use('/recurring', recurringRoutes);

// Reports (Page View & Form Submissions)
router.get('/reports', authenticate, ViewController.renderMonthlyReports);
router.get('/monthly-reports', authenticate, ViewController.renderMonthlyReports);
router.use('/reports', reportRoutes);

// Suggestions (Page View & Form Submissions)
router.get('/suggestions', authenticate, ViewController.renderSuggestions);
router.use('/suggestions', suggestionRoutes);

// Notifications (Page View & Form Submissions)
router.get('/notifications', authenticate, ViewController.renderNotifications);
router.use('/notifications', notificationRoutes);

// Profile
router.get('/profile', authenticate, ViewController.renderProfile);

module.exports = router;
