const TransactionModel = require('../models/transactionModel');
const BudgetModel = require('../models/budgetModel');
const ReportModel = require('../models/reportModel');
const UserModel = require('../models/userModel');
const NotificationService = require('./notificationService');
const SuggestionService = require('./suggestionService');

const ReportService = {
  async generateMonthlyReport(userId, targetMonth = null) {
    const today = new Date();
    let month = targetMonth;
    if (!month) {
      // Default to previous month if not specified
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    }

    const [yStr, mStr] = month.split('-');
    const monthDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // 1. Calculate totals
    const totals = await TransactionModel.getMonthlyTotals(userId, month);
    const categories = await TransactionModel.getCategorySpending(userId, month);
    const budgetsWithSpending = await BudgetModel.getBudgetsWithSpending(userId, month);
    const user = await UserModel.findById(userId);
    const currency = user?.currency || 'Nu.';

    // 2. Identify highest spending category
    let highestCat = null;
    if (categories.length > 0) {
      highestCat = categories[0];
    }

    // 3. Identify exceeded budgets
    const exceededBudgets = budgetsWithSpending
      .filter(b => b.is_exceeded)
      .map(b => ({
        category: b.category_name || 'Overall Monthly Budget',
        budget: b.budget_amount,
        spent: b.spent_amount,
        exceededBy: b.spent_amount - b.budget_amount
      }));

    // 4. Savings rate
    const savingsRate = totals.total_income > 0 
      ? Math.max(0, Math.round((totals.net_savings / totals.total_income) * 100))
      : 0;

    // 5. Generate descriptive summary
    let summary = `In ${monthName}, you recorded ${currency} ${totals.total_income.toLocaleString()} in income and ${currency} ${totals.total_expense.toLocaleString()} in expenses, leaving a net balance of ${currency} ${totals.net_savings.toLocaleString()} (${savingsRate}% savings rate).`;

    if (highestCat) {
      summary += ` Your highest expenditure was in ${highestCat.category_name} (${currency} ${parseFloat(highestCat.total_amount).toLocaleString()}).`;
    }

    if (exceededBudgets.length > 0) {
      summary += ` Noticeable budget overruns occurred in: ${exceededBudgets.map(e => e.category).join(', ')}.`;
    } else {
      summary += ` Outstanding discipline: all spending stayed within configured budget thresholds!`;
    }

    // 6. Save report
    const report = await ReportModel.saveReport({
      userId,
      month,
      totalIncome: totals.total_income,
      totalExpense: totals.total_expense,
      netSavings: totals.net_savings,
      savingsRate,
      highestCategoryId: highestCat ? highestCat.category_id : null,
      highestCategoryName: highestCat ? highestCat.category_name : 'N/A',
      highestCategoryAmount: highestCat ? parseFloat(highestCat.total_amount) : 0,
      exceededBudgetsJson: JSON.stringify(exceededBudgets),
      reportSummary: summary
    });

    // 7. Generate matching next-month suggestions!
    await SuggestionService.generateSuggestionsForUser(userId, month);

    // 8. Send notification
    await NotificationService.sendNotification({
      userId,
      type: 'monthly_report',
      title: `📊 ${monthName} Spending Report Ready`,
      message: `Your ${monthDate.toLocaleString('default', { month: 'long' })} spending report is ready! You spent ${currency} ${totals.total_expense.toLocaleString()} this month.`,
      link: `/reports?month=${month}`
    });

    return report;
  }
};

module.exports = ReportService;
