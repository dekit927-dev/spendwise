const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const StreakService = require('../services/streakService');

const JWT_SECRET = process.env.JWT_SECRET || 'spendwise_jwt_super_token_signature_key_2026';

const AuthMiddleware = {
  async authenticate(req, res, next) {
    try {
      let token = null;

      // 1. Check Bearer token in headers
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      // 2. Check token in cookies
      if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
      }

      // 3. Check session
      if (!token && req.session && req.session.userId) {
        const user = await UserModel.findById(req.session.userId);
        if (user) {
          req.user = user;
          res.locals.currentUser = user;
          // Non-blocking 24-hour streak inactivity evaluation
          StreakService.checkAndSend24HourReminder(user.id).catch(() => {});
          return next();
        }
      }

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await UserModel.findById(decoded.id);
          if (user) {
            req.user = user;
            res.locals.currentUser = user;
            if (req.session) {
              req.session.userId = user.id;
            }
            // Non-blocking 24-hour streak inactivity evaluation
            StreakService.checkAndSend24HourReminder(user.id).catch(() => {});
            return next();
          }
        } catch (jwtErr) {
          // Token expired or invalid
        }
      }

      // If route is API route, return JSON 401
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please provide a valid Bearer token or log in.'
        });
      }

      // Otherwise redirect to login
      return res.redirect('/login');
    } catch (err) {
      console.error('[AuthMiddleware] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: 'Authentication error' });
      }
      return res.redirect('/login');
    }
  },

  optionalAuth(req, res, next) {
    res.locals.currentUser = null;
    res.locals.unreadCount = 0;

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return UserModel.findById(decoded.id)
          .then(user => {
            if (user) {
              req.user = user;
              res.locals.currentUser = user;
            }
            next();
          })
          .catch(() => next());
      } catch (e) {
        // Token invalid, proceed to session check
      }
    }

    if (req.session && req.session.userId) {
      UserModel.findById(req.session.userId)
        .then(user => {
          if (user) {
            req.user = user;
            res.locals.currentUser = user;
          }
          next();
        })
        .catch(() => next());
    } else {
      next();
    }
  }
};

module.exports = AuthMiddleware;
