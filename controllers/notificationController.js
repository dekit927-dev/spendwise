const NotificationModel = require('../models/notificationModel');

const NotificationController = {
  async getNotifications(req, res) {
    try {
      const { unreadOnly, limit } = req.query;
      const notifications = await NotificationModel.getAllByUser(req.user.id, {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50
      });
      const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

      res.json({ success: true, count: notifications.length, unreadCount, notifications });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async markAsRead(req, res) {
    try {
      const notif = await NotificationModel.markAsRead(req.params.id, req.user.id);
      res.json({ success: true, notification: notif });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async markAllAsRead(req, res) {
    try {
      await NotificationModel.markAllAsRead(req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'All notifications marked as read.' });
      }
      res.redirect('/notifications?all_read=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/notifications?error=' + encodeURIComponent(err.message));
    }
  },

  async deleteNotification(req, res) {
    try {
      await NotificationModel.delete(req.params.id, req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Notification deleted.' });
      }
      res.redirect('/notifications?deleted=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/notifications?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = NotificationController;
