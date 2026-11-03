const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const StreakModel = require('../models/streakModel');
const NotificationModel = require('../models/notificationModel');

const JWT_SECRET = process.env.JWT_SECRET || 'spendwise_jwt_super_token_signature_key_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const AuthController = {
  async register(req, res) {
    try {
      const { name, email, password, currency, monthly_income, phone_number, cid_number, dzongkhag } = req.body;

      if (!name || !email || !password) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }
        return res.render('register', {
          pageTitle: 'Create Account | SpendWise',
          currentUser: null,
          error: 'Please enter name, email, and password.',
          formData: req.body
        });
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(409).json({ success: false, message: 'Email already registered.' });
        }
        return res.render('register', {
          pageTitle: 'Create Account | SpendWise',
          currentUser: null,
          error: 'An account with this email already exists.',
          formData: req.body
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        currency: currency || 'Nu.',
        monthly_income: parseFloat(monthly_income || 0),
        phone_number: phone_number || null,
        cid_number: cid_number || null,
        dzongkhag: dzongkhag || 'Thimphu',
        is_verified: true
      });

      // Initialize streak record
      await StreakModel.getStreak(user.id);

      // Create welcome notification
      await NotificationModel.create({
        userId: user.id,
        type: 'system_welcome',
        title: '❖ Welcome to SpendWise',
        message: `Welcome, ${name}! Your personal SpendWise account is ready. Your habit tracking flame is now active.`,
        link: '/dashboard'
      }).catch(() => {});

      const token = generateToken(user);

      if (req.session) {
        req.session.userId = user.id;
      }
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(201).json({
          success: true,
          message: 'Registration successful',
          token,
          user
        });
      }

      res.redirect('/dashboard?welcome=1');
    } catch (err) {
      console.error('[AuthController.register] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.render('register', {
        pageTitle: 'Create Account | SpendWise',
        currentUser: null,
        error: 'Registration error: ' + err.message,
        formData: req.body
      });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        return res.render('login', {
          pageTitle: 'Sign In | SpendWise',
          currentUser: null,
          error: 'Please provide both email and password.',
          email
        });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        return res.render('login', {
          pageTitle: 'Sign In | SpendWise',
          currentUser: null,
          error: 'Invalid email or password.',
          email
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        return res.render('login', {
          pageTitle: 'Sign In | SpendWise',
          currentUser: null,
          error: 'Invalid email or password.',
          email
        });
      }

      const token = generateToken(user);

      if (req.session) {
        req.session.userId = user.id;
      }
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

      if (req.originalUrl.startsWith('/api/')) {
        const safeUser = { ...user };
        delete safeUser.password;
        return res.json({
          success: true,
          message: 'Login successful',
          token,
          user: safeUser
        });
      }

      res.redirect('/dashboard');
    } catch (err) {
      console.error('[AuthController.login] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.render('login', {
        pageTitle: 'Sign In | SpendWise',
        currentUser: null,
        error: 'Login error: ' + err.message,
        email: req.body.email
      });
    }
  },

  logout(req, res) {
    res.clearCookie('token');
    if (req.session) {
      req.session.destroy(() => {
        if (req.originalUrl.startsWith('/api/')) {
          return res.json({ success: true, message: 'Logged out successfully' });
        }
        res.redirect('/login');
      });
    } else {
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Logged out successfully' });
      }
      res.redirect('/login');
    }
  },

  async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateProfile(req, res) {
    try {
      const { name, currency, monthly_income, phone_number, cid_number, dzongkhag } = req.body;
      const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

      const updated = await UserModel.updateProfile(req.user.id, {
        name,
        currency,
        monthly_income: monthly_income !== undefined ? parseFloat(monthly_income) : undefined,
        avatar,
        phone_number,
        cid_number,
        dzongkhag
      });

      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Profile updated successfully', user: updated });
      }

      res.redirect('/profile?success=1');
    } catch (err) {
      console.error('[AuthController.updateProfile] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/profile?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = AuthController;
