const express = require('express');
const router = express.Router();
const SuggestionController = require('../controllers/suggestionController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', SuggestionController.getSuggestions);
router.post('/refresh', SuggestionController.refreshSuggestions);
router.post('/apply/:id', SuggestionController.applySuggestion);

module.exports = router;
