-- SpendWise Database Schema (MySQL 8.0+)
CREATE DATABASE IF NOT EXISTS spendwise_db;
USE spendwise_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'expense',
  icon VARCHAR(50) DEFAULT 'fa-tag',
  color VARCHAR(50) DEFAULT '#10B981',
  is_default BOOLEAN DEFAULT TRUE,
  user_id INT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Mobile Banking',
  receipt_url VARCHAR(255) NULL,
  is_zero_spending_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS streaks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE NULL,
  total_days_tracked INT DEFAULT 0,
  streak_freezes INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS streak_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, activity_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS milestone_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  milestone_days INT NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_icon VARCHAR(50) NOT NULL,
  badge_description VARCHAR(255) NOT NULL,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_milestone (user_id, milestone_days),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NULL,
  month VARCHAR(7) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  alert_threshold INT DEFAULT 80,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  category_id INT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'monthly',
  billing_day INT NOT NULL,
  next_due_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Mobile Banking',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS monthly_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  month VARCHAR(7) NOT NULL,
  total_income DECIMAL(12, 2) DEFAULT 0.00,
  total_expense DECIMAL(12, 2) DEFAULT 0.00,
  net_savings DECIMAL(12, 2) DEFAULT 0.00,
  savings_rate DECIMAL(5, 2) DEFAULT 0.00,
  highest_category_id INT NULL,
  highest_category_name VARCHAR(100) NULL,
  highest_category_amount DECIMAL(12, 2) DEFAULT 0.00,
  exceeded_budgets_json TEXT NULL,
  report_summary TEXT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_report_month (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (highest_category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS personalized_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  month VARCHAR(7) NOT NULL,
  rule_key VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  current_pattern TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  action_type VARCHAR(50) NULL,
  potential_saving DECIMAL(12, 2) DEFAULT 0.00,
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default categories
INSERT IGNORE INTO categories (id, name, type, icon, color, is_default, user_id)
VALUES
  (1, 'Food & Dining', 'expense', 'fa-utensils', '#F59E0B', TRUE, NULL),
  (2, 'Transportation', 'expense', 'fa-bus', '#3B82F6', TRUE, NULL),
  (3, 'Shopping', 'expense', 'fa-bag-shopping', '#EC4899', TRUE, NULL),
  (4, 'Bills & Utilities', 'expense', 'fa-file-invoice-dollar', '#EF4444', TRUE, NULL),
  (5, 'Entertainment', 'expense', 'fa-gamepad', '#8B5CF6', TRUE, NULL),
  (6, 'Health & Medical', 'expense', 'fa-heart-pulse', '#10B981', TRUE, NULL),
  (7, 'Education', 'expense', 'fa-graduation-cap', '#06B6D4', TRUE, NULL),
  (8, 'Housing & Rent', 'expense', 'fa-house', '#6366F1', TRUE, NULL),
  (9, 'Personal Care', 'expense', 'fa-spa', '#14B8A6', TRUE, NULL),
  (10, 'Other Expense', 'expense', 'fa-asterisk', '#6B7280', TRUE, NULL),
  (11, 'Salary', 'income', 'fa-money-bill-wave', '#10B981', TRUE, NULL),
  (12, 'Freelance / Side Gig', 'income', 'fa-laptop-code', '#3B82F6', TRUE, NULL),
  (13, 'Investments', 'income', 'fa-chart-line', '#8B5CF6', TRUE, NULL),
  (14, 'Scholarship / Allowance', 'income', 'fa-award', '#F59E0B', TRUE, NULL),
  (15, 'Other Income', 'income', 'fa-coins', '#14B8A6', TRUE, NULL);
