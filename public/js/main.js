// SpendWise Main UI Controller
window.SpendWise = {
  showToast(title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconClass = 'fa-circle-info text-blue-400';
    if (type === 'streak_milestone' || type === 'zero_spending' || type === 'streak_reminder') iconClass = 'fa-fire flame-icon';
    else if (type === 'budget_warning' || type === 'unusual_expense') iconClass = 'fa-triangle-exclamation text-yellow-400';
    else if (type === 'monthly_report') iconClass = 'fa-chart-pie text-emerald-400';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass}" style="font-size: 1.25rem;"></i>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 0.92rem; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 0.84rem; color: #D1D5DB;">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #9CA3AF; cursor: pointer; font-size: 1rem;">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 6000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
  },

  openEditModal(tx) {
    if (!tx) return;
    const form = document.getElementById('edit-tx-form');
    if (form) form.action = '/transactions/edit/' + tx.id;
    const typeEl = document.getElementById('edit-type');
    if (typeEl && tx.type) typeEl.value = tx.type;
    const amountEl = document.getElementById('edit-amount');
    if (amountEl && tx.amount !== undefined) amountEl.value = tx.amount;
    const catEl = document.getElementById('edit-category');
    if (catEl) catEl.value = tx.category_id || '';
    const descEl = document.getElementById('edit-description');
    if (descEl && tx.description) descEl.value = tx.description;
    const dateEl = document.getElementById('edit-date');
    if (dateEl && tx.transaction_date) {
      dateEl.value = String(tx.transaction_date).substring(0, 10);
    }
    const methodEl = document.getElementById('edit-method');
    if (methodEl) methodEl.value = tx.payment_method || 'Mobile Banking';
    this.openModal('edit-transaction-modal');
  },

  setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('spendwise_theme', themeName);

    // Update active class on buttons
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      const match = btn.getAttribute('onclick')?.includes(`'${themeName}'`);
      if (match) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Close any open menus
    document.querySelectorAll('.theme-menu').forEach(m => m.classList.remove('show'));

    const names = {
      obsidian: 'Midnight Black',
      black: 'Midnight Black',
      midnight: 'Midnight Black',
      royal: 'Emerald Mint (Light)',
      emerald: 'Emerald Mint (Light)',
      pink: 'Sakura Blossom (Pink)',
      sakura: 'Sakura Blossom (Pink)',
      blush: 'Sakura Blossom (Pink)',
      rose: 'Sakura Blossom (Pink)',
      pine: 'Sakura Blossom (Pink)',
      lavender: 'Lavender Dream (Lilac)',
      lilac: 'Lavender Dream (Lilac)',
      indigo: 'Lavender Dream (Lilac)',
      violet: 'Lavender Dream (Lilac)',
      cyber: 'Lavender Dream (Lilac)'
    };
    this.showToast('Theme Changed', `Switched to ${names[themeName] || themeName} theme`, 'info');
  },

  toggleThemeMenu(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const btn = e ? e.currentTarget : document.getElementById('theme-menu-btn');
    const parent = btn ? btn.closest('.theme-dropdown') : null;
    const menu = parent ? parent.querySelector('.theme-menu') : document.getElementById('theme-menu');
    if (menu) {
      const isShown = menu.classList.contains('show');
      document.querySelectorAll('.theme-menu').forEach(m => m.classList.remove('show'));
      if (!isShown) menu.classList.add('show');
    }
  },

  toggleMobileMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  },

  openMobileMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeMobileMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  },

  initAppleScrollReveal() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // 1. Select all candidate cards, panels, list items across all pages
    const rawCandidates = Array.from(document.querySelectorAll(
      '.apple-reveal, .glass-panel, .dzong-banner, .metric-card, .dzong-card, .feature-card, .notification-card, .milestone-card, .activity-log-item, .bill-card, .suggestion-card, .apple-list-item'
    ));

    // Filter out items in overlays (modals, dropdowns, navigation drawers, navbar)
    // If an item explicitly has .apple-reveal or .apple-list-item or .notification-card, keep it even if parent is a panel
    const cardTargets = rawCandidates.filter(el => {
      if (el.closest('.modal-backdrop') || el.closest('.theme-menu') || el.closest('.mobile-nav-drawer') || el.closest('.navbar')) {
        return false;
      }
      
      if (el.classList.contains('apple-reveal') || el.classList.contains('apple-list-item') || el.classList.contains('notification-card') || el.classList.contains('milestone-card') || el.classList.contains('activity-log-item')) {
        return true;
      }

      // Check if any ancestor is also in rawCandidates
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        if (rawCandidates.includes(parent)) {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    });

    // 2. Select table rows for smooth Apple-style row reveal
    const rowTargets = Array.from(document.querySelectorAll('.data-table tbody tr:not(.empty-row)'));
    rowTargets.forEach(row => {
      row.classList.add('apple-row-reveal');
    });

    const allTargets = [...cardTargets, ...rowTargets];
    if (allTargets.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      allTargets.forEach(el => el.classList.add('is-revealed', 'reveal-completed'));
      return;
    }

    // Mark card targets
    cardTargets.forEach(el => el.classList.add('apple-reveal'));

    // Separate above-the-fold targets from below-the-fold targets
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const aboveFold = [];
    const belowFold = [];

    allTargets.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.9) {
        aboveFold.push(el);
      } else {
        belowFold.push(el);
      }
    });

    // Sort above-the-fold elements top-to-bottom, left-to-right
    aboveFold.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 16) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    // Reveal above-the-fold items immediately on load with a keynote stagger
    aboveFold.forEach((el, idx) => {
      const isRow = el.classList.contains('apple-row-reveal');
      const delay = 30 + idx * (isRow ? 45 : 75);
      setTimeout(() => {
        el.classList.add('is-revealed');
        setTimeout(() => el.classList.add('reveal-completed'), 850);
      }, delay);
    });

    // Sequential Queue for below-the-fold scrolling (Apple one-by-one cascade)
    const scrollQueue = [];
    let isProcessingQueue = false;

    function processScrollQueue() {
      if (scrollQueue.length === 0) {
        isProcessingQueue = false;
        return;
      }
      isProcessingQueue = true;
      const el = scrollQueue.shift();
      if (el && !el.classList.contains('is-revealed')) {
        el.classList.add('is-revealed');
        setTimeout(() => {
          el.classList.add('reveal-completed');
        }, 850);
      }
      const isRow = el && el.classList.contains('apple-row-reveal');
      const stepDelay = isRow ? 50 : 90;
      setTimeout(processScrollQueue, stepDelay);
    }

    const observer = new IntersectionObserver((entries, obs) => {
      const newlyVisible = [];
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target);
          newlyVisible.push(entry.target);
        }
      });

      if (newlyVisible.length > 0) {
        // Sort entering items top-to-bottom, left-to-right so they cascade in natural visual reading order
        newlyVisible.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          if (Math.abs(ra.top - rb.top) > 16) return ra.top - rb.top;
          return ra.left - rb.left;
        });

        newlyVisible.forEach(el => scrollQueue.push(el));
        if (!isProcessingQueue) {
          processScrollQueue();
        }
      }
    }, {
      root: null,
      threshold: 0.04,
      rootMargin: '0px 0px -35px 0px'
    });

    belowFold.forEach(el => observer.observe(el));
  },

  requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('Desktop/device notifications are not supported in this browser.');
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        const banner = document.getElementById('enable-push-banner');
        if (banner) banner.remove();
        if (window.SpendWise && window.SpendWise.showToast) {
          window.SpendWise.showToast('🔔 Streak Alerts Enabled!', 'You will receive device alerts when 24 hours elapse without logging income or expenses.', 'info');
        }
      }
    });
  }
};

window.openEditModal = function(tx) {
  window.SpendWise.openEditModal(tx);
};

document.addEventListener('DOMContentLoaded', () => {
  // Close theme menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-dropdown')) {
      document.querySelectorAll('.theme-menu').forEach(m => m.classList.remove('show'));
    }
  });

  // Highlight active theme in menu
  const activeTheme = localStorage.getItem('spendwise_theme') || 'royal';
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(`'${activeTheme}'`)) {
      btn.classList.add('active');
    }
  });

  // Setup modal triggers
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-open-modal');
      window.SpendWise.openModal(targetId);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('show');
    });
  });

  // Pre-fill today's date in date inputs if empty
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = today;
  });

  // Edit transaction modal trigger
  document.querySelectorAll('.btn-edit-tx').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = {
        id: btn.getAttribute('data-id'),
        type: btn.getAttribute('data-type'),
        amount: btn.getAttribute('data-amount'),
        category_id: btn.getAttribute('data-category-id'),
        description: btn.getAttribute('data-description'),
        transaction_date: btn.getAttribute('data-date'),
        payment_method: btn.getAttribute('data-method')
      };
      window.SpendWise.openEditModal(tx);
    });
  });

  // Handle Escape key to close open modals or drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.SpendWise.closeMobileMenu();
      document.querySelectorAll('.modal-backdrop.show, .modal-backdrop.active').forEach(m => m.classList.remove('show', 'active'));
      document.querySelectorAll('.theme-menu.show').forEach(m => m.classList.remove('show'));
    }
  });

  // Initialize Apple-style scroll reveal animation
  window.SpendWise.initAppleScrollReveal();
});
