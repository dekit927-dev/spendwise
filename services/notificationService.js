const NotificationModel = require('../models/notificationModel');

let ioInstance = null;

const NotificationService = {
  setSocketIO(io) {
    ioInstance = io;
  },

  async sendNotification({ userId, type, title, message, link = null }) {
    try {
      // 1. Persist in database
      const notif = await NotificationModel.create({ userId, type, title, message, link });

      // 2. Emit real-time message to user's personal room
      if (ioInstance) {
        ioInstance.to(`user_${userId}`).emit('notification', {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          createdAt: notif.created_at
        });

        const unreadCount = await NotificationModel.getUnreadCount(userId);
        ioInstance.to(`user_${userId}`).emit('unread_count_update', { unreadCount });
      }

      return notif;
    } catch (err) {
      console.error('[NotificationService] Error sending notification:', err.message);
    }
  },

  emitMilestoneCelebration(userId, { milestoneDays, badgeName, badgeIcon, message }) {
    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit('milestone_celebration', {
        milestoneDays,
        badgeName,
        badgeIcon,
        message
      });
    }
  }
};

module.exports = NotificationService;
