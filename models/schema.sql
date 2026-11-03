-- SpendWise Database Schema (PostgreSQL & Standard SQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  currency VARCHAR(20) DEFAULT 'Nu.',
  monthly_income DECIMAL(12, 2) DEFAULT 0.00,
  avatar VARCHAR(255) DEFAULT '/images/logo.svg',
  phone_number VARCHAR(50) NULL,
  cid_number VARCHAR(50) NULL,
  dzongkhag VARCHAR(100) NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  verification_code VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'expense', -- 'expense' or 'income'
  icon VARCHAR(50) DEFAULT 'fa-tag',
  color VARCHAR(50) DEFAULT '#10B981',
  is_default BOOLEAN DEFAULT TRUE,
  user_id INT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL, -- 'income' or 'expense'
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Mobile Banking',
  receipt_url VARCHAR(255) NULL,
  is_zero_spending_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streaks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE NULL,
  total_days_tracked INT DEFAULT 0,
  streak_freezes INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streak_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS milestone_badges (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_days INT NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_icon VARCHAR(50) NOT NULL,
  badge_description VARCHAR(255) NOT NULL,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, milestone_days)
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  amount DECIMAL(12, 2) NOT NULL,
  alert_threshold INT DEFAULT 80,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'monthly',
  billing_day INT NOT NULL,
  next_due_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Mobile Banking',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  total_income DECIMAL(12, 2) DEFAULT 0.00,
  total_expense DECIMAL(12, 2) DEFAULT 0.00,
  net_savings DECIMAL(12, 2) DEFAULT 0.00,
  savings_rate DECIMAL(5, 2) DEFAULT 0.00,
  highest_category_id INT NULL REFERENCES categories(id) ON DELETE SET NULL,
  highest_category_name VARCHAR(100) NULL,
  highest_category_amount DECIMAL(12, 2) DEFAULT 0.00,
  exceeded_budgets_json TEXT NULL,
  report_summary TEXT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS personalized_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  rule_key VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  current_pattern TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  action_type VARCHAR(50) NULL,
  potential_saving DECIMAL(12, 2) DEFAULT 0.00,
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default categories
INSERT INTO categories (name, type, icon, color, is_default, user_id)
VALUES
  ('Food & Dining', 'expense', 'fa-utensils', '#F59E0B', TRUE, NULL),
  ('Transportation', 'expense', 'fa-bus', '#3B82F6', TRUE, NULL),
  ('Shopping', 'expense', 'fa-bag-shopping', '#EC4899', TRUE, NULL),
  ('Bills & Utilities', 'expense', 'fa-file-invoice-dollar', '#EF4444', TRUE, NULL),
  ('Entertainment', 'expense', 'fa-gamepad', '#8B5CF6', TRUE, NULL),
  ('Health & Medical', 'expense', 'fa-heart-pulse', '#10B981', TRUE, NULL),
  ('Education', 'expense', 'fa-graduation-cap', '#06B6D4', TRUE, NULL),
  ('Housing & Rent', 'expense', 'fa-house', '#6366F1', TRUE, NULL),
  ('Personal Care', 'expense', 'fa-spa', '#14B8A6', TRUE, NULL),
  ('Other Expense', 'expense', 'fa-asterisk', '#6B7280', TRUE, NULL),
  ('Salary', 'income', 'fa-money-bill-wave', '#10B981', TRUE, NULL),
  ('Freelance / Side Gig', 'income', 'fa-laptop-code', '#3B82F6', TRUE, NULL),
  ('Investments', 'income', 'fa-chart-line', '#8B5CF6', TRUE, NULL),
  ('Scholarship / Allowance', 'income', 'fa-award', '#F59E0B', TRUE, NULL),
  ('Other Income', 'income', 'fa-coins', '#14B8A6', TRUE, NULL)
ON CONFLICT DO NOTHING;
