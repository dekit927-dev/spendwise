# Deploying SpendWise (Neon & Render)

This deployment guide follows the exact same production architecture used for **Creative Hub**:

| Service | Role | Platform Link |
| :--- | :--- | :--- |
| **GitHub** | Stores source code & triggers automated builds | [github.com/dekit927-dev](https://github.com/dekit927-dev) |
| **Neon** | Cloud Serverless PostgreSQL database (tables, users, transactions) | [neon.tech](https://neon.tech) |
| **Render** | Runs the Node.js / Docker web application | [render.com](https://render.com) |

---

## Part 1: Set Up Cloud PostgreSQL on Neon

1. Log in to your Neon account at **[neon.tech](https://neon.tech)**.
2. Click **New Project**:
   - **Project Name**: `spendwise`
   - **Postgres Version**: 16 (or latest default)
   - **Region**: US East (Ohio or N. Virginia) or nearest region.
3. Click **Create Project**.
4. On your project dashboard, locate the **Connection Details** box.
5. Select **Pooled Connection** (recommended) or Direct, and copy the full PostgreSQL connection string:
   ```text
   postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   > 💡 **Keep this connection string handy** — you will paste it into Render as `DATABASE_URL`.

---

## Part 2: Create GitHub Repository & Push Code

### Step 2.1: Create Empty Repository on GitHub
1. Open **[github.com/new](https://github.com/new)**.
2. Set **Repository name**: `Spendwise` (or `spendwise`).
3. Set Visibility: **Public** (or **Private**).
4. Leave **"Add a README file"**, **".gitignore"**, and **"license"** **UNCHECKED** (we already have them prepared locally).
5. Click **Create repository**.

### Step 2.2: Push From Your Local Project
Open your terminal in `c:\Users\dell\Desktop\Spendwise` and run:

```powershell
# 1. Initialize git (if not already initialized)
git init

# 2. Stage all files (node_modules and .env are safely ignored)
git add .

# 3. Create your first commit
git commit -m "Initial commit: SpendWise smart personal finance app"

# 4. Set main branch
git branch -M main

# 5. Connect to your GitHub repository
git remote add origin https://github.com/dekit927-dev/Spendwise.git

# 6. Push to GitHub
git push -u origin main
```

---

## Part 3: Deploy Web Service on Render

1. Log in to **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** (top right) &rarr; select **Web Service**.
3. Choose **Build and deploy from a Git repository** &rarr; click **Next**.
4. Select your **`Spendwise`** repository (if it doesn't appear, click *Configure GitHub App* to grant access).
5. Configure the deployment settings:
   - **Name**: `spendwise` (or your preferred name, e.g. `spendwise-app`)
   - **Region**: Choose the region closest to your Neon database (e.g. *Ohio (US East)*)
   - **Branch**: `main`
   - **Runtime**: **Node** (or **Docker**)
     - *If Node:*
       - **Build Command**: `npm install`
       - **Start Command**: `node app.js`
     - *If Docker:* Render will automatically detect the included [`Dockerfile`](file:///c:/Users/dell/Desktop/Spendwise/Dockerfile).
   - **Instance Type**: **Free**

6. Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-xyz.aws.neon.tech/neondb?sslmode=require` | Your Neon connection string copied from Part 1 |
| `NODE_ENV` | `production` | Enables production optimizations |
| `JWT_SECRET` | *(Generate any random 32-character string)* | Secret for auth tokens |
| `SESSION_SECRET` | *(Generate any random 32-character string)* | Secret for sessions |
| `DEFAULT_CURRENCY` | `Nu.` | Default currency prefix |
| `CURRENCY_CODE` | `BTN` | Currency ISO code |
| `DB_SSL` | `true` | Required for Neon Cloud connections |

7. Click **Create Web Service**.

---

## Part 4: Automatic Database Table Creation & Seeding

* SpendWise has built-in auto-migration logic: when Render starts `node app.js` for the first time, it automatically:
  1. Detects the Neon Cloud PostgreSQL database.
  2. Runs `models/schema.sql` to build all 9 tables and default categories.
  3. Runs `config/seed.js` to seed the initial demo account.

---

## Part 5: Verify Live Deployment

1. Once Render says **`Live`** (usually takes 1–2 minutes), click your assigned live URL (e.g. `https://spendwise.onrender.com`).
2. Test signing in with the seeded demo credentials:
   - **Email**: `demo@spendwise.bt`
   - **Password**: `password123`
3. Or click **"Get Started"** to create a fresh new account.
4. Set `APP_URL` in your Render Environment Variables to your live Render URL (e.g. `https://spendwise.onrender.com`) for sharing.

