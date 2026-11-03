const StreakModel = require('../models/streakModel');
const StreakService = require('../services/streakService');

const StreakController = {
  async getStreakDetails(req, res) {
    try {
      const streak = await StreakModel.getStreak(req.user.id);
      const badges = await StreakModel.getBadges(req.user.id);
      const logs = await StreakModel.getRecentLogs(req.user.id, 30);
      const todayStr = new Date().toISOString().split('T')[0];
      const hasLoggedToday = await StreakModel.hasLoggedToday(req.user.id, todayStr);

      res.json({
        success: true,
        streak,
        badges,
        logs,
        hasLoggedToday
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async confirmZeroSpending(req, res) {
    try {
      const { notes } = req.body;
      const updatedStreak = await StreakService.confirmZeroSpending(req.user.id, notes);
      res.json({
        success: true,
        message: 'Zero-spending confirmed! Daily streak preserved and extended.',
        streak: updatedStreak
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async useFreeze(req, res) {
    try {
      const updatedStreak = await StreakModel.useStreakFreeze(req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({
          success: true,
          message: 'Streak freeze shield activated successfully!',
          streak: updatedStreak
        });
      }
      res.redirect('/streaks?freeze_used=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      res.redirect('/streaks?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = StreakController;
