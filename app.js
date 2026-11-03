const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const { initDb } = require('./config/initDb');
const { seedDatabase } = require('./config/seed');
const { errorHandler } = require('./middleware/errorMiddleware');
const NotificationService = require('./services/notificationService');
const CronService = require('./services/cronService');
const routes = require('./routes/index');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO for real-time notifications & streak celebrations
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

NotificationService.setSocketIO(io);

io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'spendwise_gamified_secure_session_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Anti-cache headers for dynamic views
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Global locals
app.use((req, res, next) => {
  res.locals.appName = 'SpendWise';
  res.locals.currentPath = req.path;
  res.locals.currentUser = null;
  res.locals.unreadCount = 0;
  res.locals.query = req.query || {};
  res.locals.defaultCurrency = process.env.DEFAULT_CURRENCY || 'Nu.';
  next();
});

// Application Routes
app.use('/', routes);

// 404 Handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.status(404).render('error', {
    pageTitle: 'Page Not Found | SpendWise',
    statusCode: 404,
    message: "Oops! The page you're searching for does not exist.",
    currentUser: res.locals.currentUser || null
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    // Ensure DB is initialized
    await initDb();
    
    // Seed demo data if database was just initialized
    try {
      await seedDatabase();
    } catch (seedErr) {
      console.warn('[SpendWise] Note on database seeding:', seedErr.message);
    }

    // Initialize scheduled cron jobs
    CronService.initScheduledJobs();

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 SpendWise App & API running live!`);
      console.log(`🌐 Local Web UI: http://localhost:${PORT}`);
      console.log(`📡 REST API Root: http://localhost:${PORT}/api`);
      console.log(`🔔 Socket.IO: Initialized for Real-Time Notifications`);
      console.log(`⏰ Node-Cron: Background streak & report jobs active`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('[SpendWise] Server boot failed:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
