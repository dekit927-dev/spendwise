const TransactionModel = require('../models/transactionModel');
const BudgetModel = require('../models/budgetModel');
const SuggestionModel = require('../models/suggestionModel');
const RecurringModel = require('../models/recurringModel');

const SuggestionService = {
  async generateSuggestionsForUser(userId, targetMonth = null) {
    // targetMonth defaults to current month or previous month
    const today = new Date();
    const currYear = today.getFullYear();
    const currMonth = String(today.getMonth() + 1).padStart(2, '0');
    const month = targetMonth || `${currYear}-${currMonth}`;

    // Calculate previous month key
    const [yStr, mStr] = month.split('-');
    const mNum = parseInt(mStr, 10);
    const yNum = parseInt(yStr, 10);
    const prevMonthDate = new Date(yNum, mNum - 2, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // 1. Fetch spending for current and previous month
    const currentCats = await TransactionModel.getCategorySpending(userId, month);
    const prevCats = await TransactionModel.getCategorySpending(userId, prevMonthKey);

    const prevCatMap = {};
    let prevTotal = 0;
    prevCats.forEach(c => {
      prevCatMap[c.category_name] = parseFloat(c.total_amount);
      prevTotal += parseFloat(c.total_amount);
    });

    let currentTotal = 0;
    currentCats.forEach(c => {
      currentTotal += parseFloat(c.total_amount);
    });

    const monthlyTotals = await TransactionModel.getMonthlyTotals(userId, month);
    const budgetsWithSpending = await BudgetModel.getBudgetsWithSpending(userId, month);
    const recurringList = await RecurringModel.getAllByUser(userId);

    const suggestions = [];

    // Rule 1: Category spending increase by >= 15%
    for (const cat of currentCats) {
      const currentAmt = parseFloat(cat.total_amount);
      const prevAmt = prevCatMap[cat.category_name] || 0;

      if (prevAmt > 0) {
        const increaseRatio = (currentAmt - prevAmt) / prevAmt;
        if (increaseRatio >= 0.15) {
          const pctStr = Math.round(increaseRatio * 100);
          const targetCut = Math.round(currentAmt * 0.10);
          suggestions.push({
            rule_key: 'category_increase',
            title: `Optimize ${cat.category_name} Spending`,
            current_pattern: `${cat.category_name} spending increased by ${pctStr}% compared to last month (${currentAmt.toLocaleString()} spent vs ${prevAmt.toLocaleString()}).`,
            suggestion_text: `Reduce ${cat.category_name} expenses by 10% in the upcoming month. Small habits like home-cooked meals or mindful shopping can save you ~${targetCut.toLocaleString()}.`,
            action_type: 'expense_cut',
            potential_saving: targetCut
          });
        }
      }
    }

    // Rule 2: Exceeded budgets
    for (const b of budgetsWithSpending) {
      if (b.is_exceeded) {
        const exceededBy = Math.round(b.spent_amount - b.budget_amount);
        const name = b.category_name || 'Overall Monthly';
        suggestions.push({
          rule_key: 'shopping_budget_exceeded',
          title: `${name} Exceeded Budget Limit`,
          current_pattern: `${name} reached ${b.spent_amount.toLocaleString()} against a limit of ${b.budget_amount.toLocaleString()} (exceeded by ${exceededBy.toLocaleString()}).`,
          suggestion_text: `Set a tighter limit for ${name} and implement a 48-hour cooling-off rule for non-essential purchases before swiping or tapping pay.`,
          action_type: 'budget_adjust',
          potential_saving: exceededBy
        });
      }
    }

    // Rule 3: Transportation expenses proportion
    const transportCat = currentCats.find(c => c.category_name.toLowerCase().includes('transport'));
    if (transportCat && currentTotal > 0) {
      const transportAmt = parseFloat(transportCat.total_amount);
      const ratio = transportAmt / currentTotal;
      if (ratio >= 0.12 && transportAmt >= 500) {
        const potentialSave = Math.round(transportAmt * 0.20);
        suggestions.push({
          rule_key: 'transport_high',
          title: 'Transportation Cost Optimization',
          current_pattern: `Transport makes up ${Math.round(ratio * 100)}% of your expenses (${transportAmt.toLocaleString()} spent).`,
          suggestion_text: `Consider more economical options such as campus shuttles, shared rides, or consolidating errand trips to save approximately ${potentialSave.toLocaleString()}.`,
          action_type: 'expense_cut',
          potential_saving: potentialSave
        });
      }
    }

    // Rule 4: Consistent savings / positive balance
    if (monthlyTotals.total_income > 0) {
      const savingsRate = (monthlyTotals.net_savings / monthlyTotals.total_income) * 100;
      if (savingsRate >= 15) {
        suggestions.push({
          rule_key: 'consistent_savings',
          title: 'Outstanding Savings Momentum',
          current_pattern: `Consistent savings achieved: ${monthlyTotals.net_savings.toLocaleString()} retained (${Math.round(savingsRate)}% savings rate).`,
          suggestion_text: `Maintain your current savings habit! Transfer this surplus into a dedicated emergency fund or term deposit to earn compounding returns.`,
          action_type: 'savings_plan',
          potential_saving: monthlyTotals.net_savings
        });
      }
    }

    // Rule 5: Recurring bills review
    if (recurringList.length >= 3) {
      const recTotal = recurringList.reduce((acc, r) => acc + (r.is_active ? parseFloat(r.amount) : 0), 0);
      suggestions.push({
        rule_key: 'subscription_audit',
        title: 'Subscription & Recurring Audit',
        current_pattern: `You have ${recurringList.length} active recurring commitments totaling ${recTotal.toLocaleString()} per billing cycle.`,
        suggestion_text: `Audit recurring subscriptions. Canceling just one underutilized entertainment or cloud service could save you significant money annually.`,
        action_type: 'expense_cut',
        potential_saving: Math.round(recTotal * 0.15)
      });
    }

    // If no suggestions triggered yet, provide general best-practice suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        rule_key: 'general_healthy_habit',
        title: 'Maintain Healthy Financial Tracking',
        current_pattern: 'Your spending pattern is balanced with no severe spikes detected.',
        suggestion_text: 'Continue logging daily transactions and set category budgets to build wealth step by step.',
        action_type: 'savings_plan',
        potential_saving: 500
      });
    }

    // Clear old suggestions for month and persist new ones
    await SuggestionModel.clearMonthSuggestions(userId, month);
    return await SuggestionModel.saveSuggestions(userId, month, suggestions);
  }
};

module.exports = SuggestionService;
