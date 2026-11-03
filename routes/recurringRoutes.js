const express = require('express');
const router = express.Router();
const RecurringController = require('../controllers/recurringController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', RecurringController.getAll);
router.post('/', RecurringController.create);
router.post('/toggle/:id', RecurringController.toggleActive);
router.delete('/:id', RecurringController.delete);
router.post('/delete/:id', RecurringController.delete);

module.exports = router;
