const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authenticate);

router.get('/', TransactionController.getTransactions);
router.get('/:id', TransactionController.getTransaction);
router.post('/', upload.single('receipt'), TransactionController.createTransaction);
router.post('/zero-spending', TransactionController.confirmZeroSpending);
router.post('/edit/:id', upload.single('receipt'), TransactionController.updateTransaction);
router.put('/:id', upload.single('receipt'), TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);
router.post('/delete/:id', TransactionController.deleteTransaction);

module.exports = router;
