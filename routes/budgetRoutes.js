const express = require('express');
const router = express.Router();
const BudgetController = require('../controllers/budgetController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', BudgetController.getBudgets);
router.post('/', BudgetController.setBudget);
router.delete('/:id', BudgetController.deleteBudget);
router.post('/delete/:id', BudgetController.deleteBudget);

module.exports = router;
