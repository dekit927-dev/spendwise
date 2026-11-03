# SpendWise – Smart Personal Finance & Expense Tracking System

<p align="center">
  <img src="public/images/logo.png" alt="SpendWise Logo" width="180" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.35);">
</p>

<p align="center">
  <strong>Gamified Expense Tracking &bull; Automated Real-Time Notifications &bull; Graphical Analytics &bull; Next-Month Suggestions</strong>
</p>

---

## 1. Project Overview
**SpendWise** is a personal finance management system that allows users to record their income and daily expenses, monitor their spending habits, set budgets, and receive real-time notifications.

Beyond basic transaction logging, SpendWise actively encourages users to develop superior financial habits through a **gamified daily streak system**, **real-time Socket.IO alerts**, **interactive Chart.js analytics**, **automated end-of-month spending reports**, and **rule-based personalized suggestions for the following month**.

---

## 2. Core Features

### 1. User Authentication
* Secure registration & login with **bcrypt** password hashing.
* Dual authentication architecture: **JWT tokens** for REST API endpoints and **HTTP-only session cookies** for the interactive EJS web dashboard.
* Individual financial dashboard with customizable currency symbol (`Nu.`, `$`, `€`, `₹`, `£`), monthly income target, and avatar upload.

### 2. Daily Income & Expense Tracking
* Record daily income and expenses with descriptions, dates, and payment methods (*Mobile Banking, Cash, Bank Transfer, Card*).
* Category classifications (*Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Medical, Education, Housing, Salary, Freelance, Investments*).
* Full CRUD (Create, Read, Update, Delete) with transaction history filtering by type, category, and date range.
* Optional receipt attachment support via Multer.

### 3. Daily Spending Streaks (Gamification)
* Encourages daily financial check-ins and builds unbroken consistency.
* Consecutive activity counter and all-time longest streak tracking.
* **Zero-Spending Day Confirmation**: Confirms Nu. 0 spending days without penalty, rewarding mindful budgeting rather than simply spending money.
* Streak Freeze shields to protect streaks from being broken.
* Milestone badge awards at **7 days, 14 days, 30 days, 60 days, and 100 days** with celebratory modal animations and notifications.

### 4. Real-Time Notifications (Socket.IO & Node-Cron)
* **Daily Streak Reminders**: Automated evening alerts if no entry was recorded today.
* **Budget Limit Warnings**: Proactive alerts when category spending reaches **80%** or exceeds **100%**.
* **Unusual High Expense Warnings**: Instant alerts when a single transaction exceeds 40% of monthly income.
* **Milestone Celebrations**: Real-time push alert when 7/14/30-day streak milestones are unlocked.
* **Upcoming Recurring Payment Reminders**: Advance alerts 1–3 days before bills are due.
* **Monthly Spending Report Ready**: Instant ping when an end-of-month report is compiled.

### 5. Graphical Spending Analytics (Chart.js)
* **Category Breakdown Doughnut Chart**: Visualizes proportion of expenditures across categories with dynamic tooltips and percentages.
* **Monthly Comparison Bar Chart**: 6-month comparative chart of total income vs total expenses.
* **Daily Spending Trajectory**: Smooth gradient area line chart displaying daily spending fluctuations.
* **Budget Progress Gauges**: Real-time comparative meters displaying used vs remaining funds.

### 6. End-of-Month Spending Report
* Automatically synthesizes spending at the conclusion of every billing cycle:
  * Total Monthly Income
  * Total Monthly Expenses
  * Remaining Net Balance
  * Savings Rate (%)
  * Highest Spending Category
  * Budget Exceeded Overrun Analysis
* Actionable financial retrospective narrative and one-click printable report format.

### 7. Personalized Next-Month Suggestions
* Rule-based intelligent recommendations generated from previous spending records:
  * **Food spending increased by >15-20%**: Recommends reducing dining out by 10% with concrete potential savings.
  * **Shopping exceeded budget**: Suggests a tighter limit or implementing a 48-hour cooling-off rule.
  * **Transportation costs elevated**: Recommends carpooling, college shuttles, or transit pass consolidation.
  * **Consistent savings achieved**: Commends habit and advises transferring surplus into an emergency fund.
* Actionable "Mark as Applied" workflow for user accountability.

### 8. Budget Management
* Overall monthly spending ceiling and category-specific budgets.
* Used vs remaining budget calculations with green/yellow/red visual alerts.

### 9. Recurring Expense Management
* Subscriptions & bills tracker (WiFi internet, Spotify, rent, tuition).
* Due date countdown and active/paused state toggling.

---

## 3. Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js** | Backend JavaScript runtime |
| **Express.js** | Web framework & REST API server |
| **PostgreSQL / MySQL** | Relational database (unified DB driver supporting both Postgres & MySQL) |
| **JWT & Session** | Token-based API authentication & web session management |
| **Socket.IO** | Real-time push notifications & celebratory streak events |
| **Node-Cron** | Scheduled background tasks (daily reminders, upcoming bills, monthly reports) |
| **Chart.js 4** | Interactive spending visualizations and charts |
| **EJS & Vanilla CSS** | Server-rendered frontend views with modern dark-mode glassmorphic styling |
| **Postman** | Comprehensive API testing collection |

---

## 4. Folder Structure (Creative Hub Architecture)

```
Spendwise/
├── .postman/
│   └── SpendWise_API.postman_collection.json
├── config/
│   ├── db.js                 # Unified database connector (Postgres & MySQL)
│   ├── initDb.js             # DDL table schema creator
│   └── seed.js               # Demo dataset seeder
├── controllers/
│   ├── analyticsController.js
│   ├── authController.js
│   ├── budgetController.js
│   ├── notificationController.js
│   ├── recurringController.js
│   ├── reportController.js
│   ├── streakController.js
│   ├── suggestionController.js
│   ├── transactionController.js
│   └── viewController.js
├── middleware/
│   ├── authMiddleware.js     # JWT & session authentication
│   ├── errorMiddleware.js    # Global error handler
│   └── uploadMiddleware.js   # Multer file upload handler
├── models/
│   ├── budgetModel.js
│   ├── notificationModel.js
│   ├── recurringModel.js
│   ├── reportModel.js
│   ├── schema.sql            # PostgreSQL DDL
│   ├── schema_mysql.sql      # MySQL DDL
│   ├── streakModel.js
│   ├── suggestionModel.js
│   ├── transactionModel.js
│   └── userModel.js
├── postman/
│   └── SpendWise_API.postman_collection.json
├── public/
│   ├── css/
│   │   └── style.css         # Custom design system
│   ├── images/
│   │   ├── logo.png          # SpendWise brand logo
│   │   └── logo.jpg
│   ├── js/
│   │   ├── analytics.js      # Chart.js initialization
│   │   ├── main.js           # Modal & UI helpers
│   │   └── socket-client.js  # Real-time notification subscriber
│   └── uploads/              # Receipts & avatars
├── routes/
│   ├── analyticsRoutes.js
│   ├── api.js                # Combined REST API router
│   ├── authRoutes.js
│   ├── budgetRoutes.js
│   ├── index.js              # View & page router
│   ├── notificationRoutes.js
│   ├── recurringRoutes.js
│   ├── reportRoutes.js
│   ├── streakRoutes.js
│   ├── suggestionRoutes.js
│   └── transactionRoutes.js
├── services/
│   ├── cronService.js        # Scheduled daily & monthly jobs
│   ├── notificationService.js# Socket.IO emitter & DB persistence
│   ├── reportService.js      # End-of-month report compiler
│   ├── streakService.js      # Milestone checker & rewards
│   └── suggestionService.js  # Rule-based suggestions engine
├── views/
│   ├── partials/
│   │   ├── footer.ejs
│   │   ├── header.ejs
│   │   ├── navbar.ejs
│   │   ├── quick-add-modal.ejs
│   │   └── zero-spending-modal.ejs
│   ├── analytics.ejs
│   ├── budgets.ejs
│   ├── dashboard.ejs
│   ├── error.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── monthly-reports.ejs
│   ├── notifications.ejs
│   ├── profile.ejs
│   ├── recurring.ejs
│   ├── register.ejs
│   ├── streaks.ejs
│   ├── suggestions.ejs
│   └── transactions.ejs
├── .env
├── .env.example
├── app.js                    # Server entrypoint
├── nodemon.json
├── package.json
└── README.md
```

---

## 5. Division of Work (For 2 Members)

| Member 1 Responsibility | Member 2 Responsibility |
| :--- | :--- |
| **Authentication & Users** (Registration, login, JWT/Session, profile) | **Budget Management** (Monthly limits, category budgets, warnings) |
| **Income & Expenses Tracking** (CRUD transactions, category mapping) | **Spending Analytics** (Chart.js doughnut, bar charts, trend graphs) |
| **Categories & Transactions** (Multi-currency support, receipts) | **Monthly Reports** (End-of-month compilation, printable summary) |
| **Daily Streak Tracking** (Flame progression, zero-spending check-ins) | **Real-Time Notifications** (Socket.IO engine, automated triggers) |
| **Transaction APIs** (Filtering, validation, Postman collection) | **Personalized Suggestions** (Rule-based recommendations engine) |
| *Collaborated on Database Design & Testing* | *Collaborated on Database Design & Integration* |

---

## 6. Getting Started

### Prerequisites
* **Node.js** (v18+)
* **PostgreSQL** (running locally on port `5432` with user `postgres`) OR **MySQL 8.0+** (port `3306`)

### Installation & Launch
1. **Navigate to Project Directory**:
   ```bash
   cd c:\Users\dell\Desktop\Spendwise
   ```

2. **Initialize Database & Tables**:
   ```bash
   npm run init-db
   ```

3. **Seed Realistic Demo Data**:
   ```bash
   npm run seed
   ```

4. **Start the Application**:
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

5. **Open in Web Browser**:
   * Web App: [http://localhost:3000](http://localhost:3000)
   * API Health Check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Demo Credentials
* **Email**: `demo@spendwise.bt`
* **Password**: `password123`
*(Includes pre-populated 7-day active streak, realistic income/expenses in Nu. currency, category budgets, recurring bills, and generated recommendations!)*
