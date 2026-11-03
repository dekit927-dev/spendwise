const SuggestionModel = require('../models/suggestionModel');
const SuggestionService = require('../services/suggestionService');

const SuggestionController = {
  async getSuggestions(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;

      let suggestions = await SuggestionModel.getByUserAndMonth(req.user.id, month);

      if (suggestions.length === 0) {
        suggestions = await SuggestionService.generateSuggestionsForUser(req.user.id, month);
      }

      res.json({ success: true, month, suggestions });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async refreshSuggestions(req, res) {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const month = req.body.month || req.query.month || currentMonthKey;

      const suggestions = await SuggestionService.generateSuggestionsForUser(req.user.id, month);

      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Suggestions refreshed', suggestions });
      }

      res.redirect('/suggestions?refreshed=1');
    } catch (err) {
      console.error('[SuggestionController.refreshSuggestions] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/suggestions?error=' + encodeURIComponent(err.message));
    }
  },

  async applySuggestion(req, res) {
    try {
      const updated = await SuggestionModel.markApplied(req.params.id, req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, suggestion: updated });
      }
      res.redirect('/suggestions?applied=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/suggestions?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = SuggestionController;
