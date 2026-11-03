const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.post('/mark-all-read', NotificationController.markAllAsRead);
router.post('/:id/read', NotificationController.markAsRead);
router.delete('/:id', NotificationController.deleteNotification);
router.post('/delete/:id', NotificationController.deleteNotification);

module.exports = router;
