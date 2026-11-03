const bcrypt = require('bcryptjs');
const { db } = require('./db');

async function seedDatabase() {
  console.log('[SpendWise] Seeding demo data for SpendWise...');
  try {
    // 1. Create or get demo user
    const existingUser = await db.oneOrNone('SELECT id FROM users WHERE email = ?', ['demo@spendwise.bt']);
    let userId;

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const inserted = await db.one(
        `INSERT INTO users (name, email, password, currency, monthly_income, avatar)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        ['Deki Tshomo', 'demo@spendwise.bt', hashedPassword, 'Nu.', 25000.00, '/images/logo.svg']
      );
      userId = inserted.id;
      console.log(`[SpendWise] Created demo user (id: ${userId})`);
    } else {
      userId = existingUser.id;
      console.log(`[SpendWise] Found existing demo user (id: ${userId})`);
    }

    // 2. Fetch category IDs
    const categories = await db.any('SELECT id, name, type FROM categories');
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c.id; });

    // 3. Clear existing user transactions to ensure clean seed state
    await db.none('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM budgets WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM recurring_expenses WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM streak_logs WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM milestone_badges WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM monthly_reports WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM personalized_suggestions WHERE user_id = ?', [userId]);
    await db.none('DELETE FROM notifications WHERE user_id = ?', [userId]);

    // 4. Insert Income & Expense Transactions for Current/Previous Month
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const monthKey = `${currentYear}-${currentMonth}`;

    // Helper date builder
    const getDateStr = (dayOffset) => {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      return d.toISOString().split('T')[0];
    };

    // Salary Income
    await db.none(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date, payment_method)
       VALUES (?, ?, 'income', 25000.00, 'Monthly Salary Deposit', ?, 'Bank Transfer')`,
      [userId, catMap['Salary'] || null, getDateStr(25)]
    );

    // Side Gig Income
    await db.none(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date, payment_method)
       VALUES (?, ?, 'income', 3500.00, 'Web Development Freelance Project', ?, 'Mobile Banking')`,
      [userId, catMap['Freelance / Side Gig'] || null, getDateStr(12)]
    );

    // Expenses totaling ~ Nu. 18,000
    const sampleExpenses = [
      { cat: 'Food & Dining', amount: 1200.00, desc: 'Weekend Dinner & Groceries', offset: 0, method: 'Mobile Banking' },
      { cat: 'Transportation', amount: 350.00, desc: 'Taxi commute to Sherubtse Campus', offset: 1, method: 'Cash' },
      { cat: 'Food & Dining', amount: 450.00, desc: 'Cafeteria lunch & snacks', offset: 1, method: 'Mobile Banking' },
      { cat: 'Shopping', amount: 3850.00, desc: 'Winter jacket & boots (exceeded budget)', offset: 2, method: 'Mobile Banking' },
      { cat: 'Food & Dining', amount: 980.00, desc: 'Weekly vegetable & grocery market', offset: 3, method: 'Cash' },
      { cat: 'Bills & Utilities', amount: 2200.00, desc: 'Apartment Electricity & Water', offset: 4, method: 'Mobile Banking' },
      { cat: 'Entertainment', amount: 800.00, desc: 'Movies & board game night', offset: 5, method: 'Mobile Banking' },
      { cat: 'Health & Medical', amount: 1100.00, desc: 'Prescription pharmacy & vitamins', offset: 6, method: 'Cash' },
      { cat: 'Food & Dining', amount: 1650.00, desc: 'Family celebration meal', offset: 7, method: 'Mobile Banking' },
      { cat: 'Transportation', amount: 850.00, desc: 'Monthly bus pass & cab fare', offset: 10, method: 'Mobile Banking' },
      { cat: 'Education', amount: 1500.00, desc: 'Data Science & Back-End textbooks', offset: 14, method: 'Mobile Banking' },
      { cat: 'Food & Dining', amount: 2120.00, desc: 'Monthly kitchen pantry restock', offset: 18, method: 'Mobile Banking' },
      { cat: 'Personal Care', amount: 950.00, desc: 'Haircut & skincare essentials', offset: 20, method: 'Cash' }
    ];

    for (const exp of sampleExpenses) {
      await db.none(
        `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date, payment_method)
         VALUES (?, ?, 'expense', ?, ?, ?, ?)`,
        [userId, catMap[exp.cat] || null, exp.amount, exp.desc, getDateStr(exp.offset), exp.method]
      );
    }

    // 5. Streaks & Logs (7-day active streak)
    await db.none('DELETE FROM streaks WHERE user_id = ?', [userId]);
    await db.none(
      `INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date, total_days_tracked, streak_freezes)
       VALUES (?, 7, 14, ?, 28, 2)`,
      [userId, getDateStr(0)]
    );

    for (let day = 0; day <= 6; day++) {
      const actType = day === 3 ? 'zero_spending_confirmed' : 'expense_recorded';
      const note = day === 3 ? 'Zero spending confirmed! Disciplined no-spend day.' : 'Logged daily spending activity.';
      await db.none(
        `INSERT INTO streak_logs (user_id, activity_date, activity_type, notes)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id, activity_date) DO UPDATE SET activity_type = EXCLUDED.activity_type`,
        [userId, getDateStr(day), actType, note]
      );
    }

    // Milestone Badge (7 days)
    await db.none(
      `INSERT INTO milestone_badges (user_id, milestone_days, badge_name, badge_icon, badge_description, achieved_at)
       VALUES (?, 7, '7-Day Streak Pioneer', 'fa-fire-flame-curved', 'Maintained 7 consecutive days of active financial tracking!', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, milestone_days) DO NOTHING`,
      [userId]
    );

    // 6. Budgets
    const budgetsData = [
      { cat: null, amount: 20000.00, alert: 85 }, // Overall limit
      { cat: 'Food & Dining', amount: 6500.00, alert: 80 },
      { cat: 'Shopping', amount: 3000.00, alert: 80 }, // will show exceeded! (3,850 spent)
      { cat: 'Transportation', amount: 2500.00, alert: 80 },
      { cat: 'Bills & Utilities', amount: 3500.00, alert: 80 },
      { cat: 'Entertainment', amount: 1500.00, alert: 80 }
    ];

    for (const b of budgetsData) {
      await db.none(
        `INSERT INTO budgets (user_id, category_id, month, amount, alert_threshold)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, b.cat ? catMap[b.cat] : null, monthKey, b.amount, b.alert]
      );
    }

    // 7. Recurring Expenses
    const recurringList = [
      { title: 'High-Speed Home Fiber WiFi', cat: 'Bills & Utilities', amount: 1099.00, day: 2, due: getDateStr(-2), method: 'Mobile Banking' },
      { title: 'Spotify Premium Family', cat: 'Entertainment', amount: 349.00, day: 15, due: getDateStr(-15), method: 'Bank Transfer' },
      { title: 'Cloud Storage & Student Software Pack', cat: 'Education', amount: 499.00, day: 25, due: getDateStr(-5), method: 'Mobile Banking' }
    ];

    for (const rec of recurringList) {
      await db.none(
        `INSERT INTO recurring_expenses (user_id, title, category_id, amount, frequency, billing_day, next_due_date, payment_method, is_active)
         VALUES (?, ?, ?, ?, 'monthly', ?, ?, ?, TRUE)`,
        [userId, rec.title, catMap[rec.cat] || null, rec.amount, rec.day, rec.due, rec.method]
      );
    }

    // 8. End-of-Month Report (e.g., for last month)
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthName = prevDate.toLocaleString('default', { month: 'long' });

    await db.none(
      `INSERT INTO monthly_reports (user_id, month, total_income, total_expense, net_savings, savings_rate, highest_category_id, highest_category_name, highest_category_amount, exceeded_budgets_json, report_summary)
       VALUES (?, ?, 25000.00, 18000.00, 7000.00, 28.00, ?, 'Food & Dining', 6400.00, ?, ?)
       ON CONFLICT (user_id, month) DO NOTHING`,
      [
        userId,
        prevMonthKey,
        catMap['Food & Dining'] || null,
        JSON.stringify([{ category: 'Shopping', budget: 3000, spent: 3850, exceededBy: 850 }]),
        `In ${prevMonthName}, you earned Nu. 25,000.00 and spent Nu. 18,000.00, retaining Nu. 7,000.00 (28% savings rate). Your top expense was Food & Dining. Shopping exceeded its budget by Nu. 850.00.`
      ]
    );

    // 9. Personalized Suggestions for Next Month (matches requirements)
    const suggestionsList = [
      {
        rule: 'food_increase',
        title: 'Optimize Food & Dining Expenses',
        pattern: 'Food spending increased by 20% compared to previous cycle (Nu. 6,400 spent).',
        text: 'Reduce dining out by 10% through home meal prep 2 extra days weekly to save an estimated Nu. 640.',
        action: 'expense_cut',
        saving: 640.00
      },
      {
        rule: 'shopping_budget_exceeded',
        title: 'Shopping Budget Exceeded Limit',
        pattern: 'Shopping reached Nu. 3,850.00 against a Nu. 3,000.00 budget (exceeded by 28.3%).',
        text: 'Set a lower shopping budget or introduce a 48-hour cooling-off rule for non-essential purchases.',
        action: 'budget_adjust',
        saving: 850.00
      },
      {
        rule: 'transport_high',
        title: 'Transportation Cost Optimization',
        pattern: 'Transport expenses are high during peak weekday class schedules.',
        text: 'Consider more economical transport options such as shared college shuttles or carpooling to save Nu. 400.',
        action: 'expense_cut',
        saving: 400.00
      },
      {
        rule: 'consistent_savings',
        title: 'Outstanding Savings Habit',
        pattern: 'Consistent positive net balance: Nu. 7,000.00 saved (28% of total monthly income).',
        text: 'Maintain your current savings habit! Transfer Nu. 5,000 directly into your high-yield emergency savings fund.',
        action: 'savings_plan',
        saving: 7000.00
      }
    ];

    for (const s of suggestionsList) {
      await db.none(
        `INSERT INTO personalized_suggestions (user_id, month, rule_key, title, current_pattern, suggestion_text, action_type, potential_saving)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, monthKey, s.rule, s.title, s.pattern, s.text, s.action, s.saving]
      );
    }

    // 10. Real-Time Notifications
    const notificationsList = [
      {
        type: 'streak_milestone',
        title: '🔥 Streak Milestone Achieved!',
        message: "You've maintained your spending-tracking streak for 7 consecutive days! Keep going!",
        link: '/streaks'
      },
      {
        type: 'budget_warning',
        title: '⚠️ Shopping Budget Exceeded',
        message: 'Your Shopping spending (Nu. 3,850) has exceeded the monthly limit of Nu. 3,000 by Nu. 850.',
        link: '/budgets'
      },
      {
        type: 'recurring_due',
        title: '📅 Upcoming Bill Reminder',
        message: 'WiFi Internet Bill of Nu. 1,099 is due in 2 days.',
        link: '/recurring'
      },
      {
        type: 'monthly_report',
        title: '📊 Monthly Spending Report Ready',
        message: `Your ${prevMonthName} spending report is ready! You spent Nu. 18,000 this month.`,
        link: '/reports'
      },
      {
        type: 'streak_reminder',
        title: '⏰ Daily Tracking Reminder',
        message: "Don't break your 7-day flame! Record today's spending or confirm a Nu. 0 spending day.",
        link: '/transactions'
      }
    ];

    for (const notif of notificationsList) {
      await db.none(
        `INSERT INTO notifications (user_id, type, title, message, link, is_read)
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [userId, notif.type, notif.title, notif.message, notif.link]
      );
    }

    console.log('[SpendWise] Database seeded successfully with demo user, transactions, streaks, budgets, reports, and suggestions!');
  } catch (err) {
    console.error('[SpendWise] Seeding error:', err.message);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
