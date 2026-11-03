const TransactionModel = require('../models/transactionModel');
const StreakService = require('../services/streakService');
const NotificationService = require('./../services/notificationService');
const BudgetModel = require('../models/budgetModel');
const UserModel = require('../models/userModel');

const TransactionController = {
  async getTransactions(req, res) {
    try {
      const { type, categoryId, startDate, endDate, limit, offset } = req.query;
      const transactions = await TransactionModel.getAllByUser(req.user.id, {
        type,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        startDate,
        endDate,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0
      });

      res.json({ success: true, count: transactions.length, transactions });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getTransaction(req, res) {
    try {
      const transaction = await TransactionModel.findById(req.params.id, req.user.id);
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }
      res.json({ success: true, transaction });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createTransaction(req, res) {
    try {
      const { category_id, type, amount, description, transaction_date, payment_method } = req.body;
      const parsedAmount = parseFloat(amount);

      if (!type || isNaN(parsedAmount) || parsedAmount < 0 || !description || !transaction_date) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(400).json({ success: false, message: 'Invalid transaction inputs.' });
        }
        return res.redirect('/transactions?error=Invalid+inputs');
      }

      const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const newTx = await TransactionModel.create({
        userId: req.user.id,
        categoryId: category_id ? parseInt(category_id, 10) : null,
        type,
        amount: parsedAmount,
        description,
        transactionDate: transaction_date,
        paymentMethod: payment_method || 'Mobile Banking',
        receiptUrl
      });

      // 1. Maintain Daily Tracking Streak
      await StreakService.recordDailyActivity(
        req.user.id,
        type === 'income' ? 'income_recorded' : 'expense_recorded',
        `Logged ${type}: ${description} (${parsedAmount})`
      );

      // 2. Automated Alerts for Expenses
      if (type === 'expense') {
        const user = await UserModel.findById(req.user.id);
        const currency = user?.currency || 'Nu.';
        const monthKey = transaction_date.substring(0, 7);

        // A. Unusual / Unusually High Expense Detection
        const monthlyIncome = parseFloat(user?.monthly_income || 0);
        const highThreshold = monthlyIncome > 0 ? monthlyIncome * 0.40 : 5000;

        if (parsedAmount >= highThreshold) {
          await NotificationService.sendNotification({
            userId: req.user.id,
            type: 'unusual_expense',
            title: '⚠️ Unusual High Expense Detected',
            message: `A single expense of ${currency} ${parsedAmount.toLocaleString()} was logged for "${description}". Please verify this transaction.`,
            link: '/transactions'
          });
        }

        // B. Budget Limit Warnings
        const budgets = await BudgetModel.getBudgetsWithSpending(req.user.id, monthKey);
        for (const b of budgets) {
          if (b.category_id === (category_id ? parseInt(category_id, 10) : null) || b.category_id === null) {
            if (b.is_exceeded) {
              await NotificationService.sendNotification({
                userId: req.user.id,
                type: 'budget_warning',
                title: `🚨 Budget Exceeded: ${b.category_name || 'Overall Monthly'}`,
                message: `You have spent ${currency} ${b.spent_amount.toLocaleString()} exceeding your budget of ${currency} ${b.budget_amount.toLocaleString()} by ${currency} ${(b.spent_amount - b.budget_amount).toLocaleString()}!`,
                link: '/budgets'
              });
            } else if (b.is_near_limit) {
              await NotificationService.sendNotification({
                userId: req.user.id,
                type: 'budget_warning',
                title: `⚠️ Budget Warning: ${b.category_name || 'Overall Monthly'}`,
                message: `You have reached ${b.percentage_used}% of your ${b.category_name || 'Overall'} budget (${currency} ${b.spent_amount.toLocaleString()} / ${currency} ${b.budget_amount.toLocaleString()}).`,
                link: '/budgets'
              });
            }
          }
        }
      }

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(201).json({ success: true, transaction: newTx });
      }

      res.redirect('/transactions?success=1');
    } catch (err) {
      console.error('[TransactionController.createTransaction] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/transactions?error=' + encodeURIComponent(err.message));
    }
  },

  async updateTransaction(req, res) {
    try {
      const { category_id, type, amount, description, transaction_date, payment_method } = req.body;
      const receiptUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      const updated = await TransactionModel.update(req.params.id, req.user.id, {
        categoryId: category_id ? parseInt(category_id, 10) : null,
        type,
        amount: parseFloat(amount),
        description,
        transactionDate: transaction_date,
        paymentMethod: payment_method,
        receiptUrl
      });

      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, transaction: updated });
      }

      res.redirect('/transactions?updated=1');
    } catch (err) {
      console.error('[TransactionController.updateTransaction] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/transactions?error=' + encodeURIComponent(err.message));
    }
  },

  async deleteTransaction(req, res) {
    try {
      await TransactionModel.delete(req.params.id, req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Transaction deleted.' });
      }
      res.redirect('/transactions?deleted=1');
    } catch (err) {
      console.error('[TransactionController.deleteTransaction] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/transactions?error=' + encodeURIComponent(err.message));
    }
  },

  async confirmZeroSpending(req, res) {
    try {
      const { notes } = req.body;
      const updatedStreak = await StreakService.confirmZeroSpending(req.user.id, notes);

      if (req.originalUrl.startsWith('/api/')) {
        return res.json({
          success: true,
          message: 'Zero-spending day logged successfully! Streak continued.',
          streak: updatedStreak
        });
      }

      res.redirect('/streaks?zero_confirmed=1');
    } catch (err) {
      console.error('[TransactionController.confirmZeroSpending] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/streaks?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = TransactionController;
