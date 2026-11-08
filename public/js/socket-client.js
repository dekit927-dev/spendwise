// SpendWise Real-Time Socket.IO Client
(function () {
  const currentUserId = document.body.getAttribute('data-user-id');
  if (!currentUserId || typeof io === 'undefined') return;

  const socket = io();

  socket.on('connect', () => {
    socket.emit('join_user', currentUserId);
    console.log('[SpendWise Socket] Connected and joined user room:', currentUserId);
  });

  // Listen for real-time notifications
  socket.on('notification', (data) => {
    console.log('[SpendWise Socket] Notification received:', data);
    if (window.SpendWise && window.SpendWise.showToast) {
      window.SpendWise.showToast(data.title, data.message, data.type);
    }

    // Trigger native browser desktop/mobile push notification if granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(data.title, {
          body: data.message,
          icon: '/images/logo.png',
          badge: '/images/logo.png'
        });
      } catch (err) {
        console.warn('[SpendWise Notification API] Desktop notification error:', err);
      }
    }

    // Increment header badge count
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      const current = parseInt(badge.textContent || '0', 10);
      badge.textContent = current + 1;
      badge.style.display = 'inline-flex';
    }
  });

  // Listen for unread count sync
  socket.on('unread_count_update', (data) => {
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  });

  // Listen for gamified milestone celebrations
  socket.on('milestone_celebration', (data) => {
    console.log('[SpendWise Socket] Milestone celebration!', data);
    showMilestoneCelebrationModal(data);
  });

  function showMilestoneCelebrationModal(data) {
    const modalHtml = `
      <div id="milestone-celebration-modal" class="modal-backdrop show">
        <div class="modal-box text-center" style="max-width: 480px; padding: 32px 24px; text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 12px; animation: flamePulse 1s infinite alternate;">🔥</div>
          <h2 style="font-size: 1.8rem; margin-bottom: 8px;">${data.badgeName} Unlocked!</h2>
          <p style="color: #9CA3AF; font-size: 1rem; margin-bottom: 20px;">${data.message}</p>
          <div class="badge badge-success" style="font-size: 0.95rem; padding: 8px 18px; margin-bottom: 24px;">
            <i class="fa-solid ${data.badgeIcon}"></i> Milestone: ${data.milestoneDays} Consecutive Days
          </div>
          <div>
            <button class="btn btn-flame btn-lg" onclick="document.getElementById('milestone-celebration-modal').remove()">
              Keep Stacking! 🚀
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
})();
