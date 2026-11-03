// SpendWise Real-Time Financial Calendar Controller
(function () {
  'use strict';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  window.SpendWiseCalendar = {
    currentMonth: new Date().toISOString().substring(0, 7), // 'YYYY-MM'
    currency: 'Nu.',
    cachedData: {},

    init(initialData, currency = 'Nu.') {
      this.currency = currency;
      if (initialData && initialData.month) {
        this.currentMonth = initialData.month;
        this.cachedData = initialData;
        this.renderCalendar(initialData);
      } else {
        this.loadMonth(this.currentMonth);
      }

      this.setupEventListeners();
      this.setupSocketListener();
    },

    setupEventListeners() {
      const prevBtn = document.getElementById('cal-prev-btn');
      const nextBtn = document.getElementById('cal-next-btn');
      const todayBtn = document.getElementById('cal-today-btn');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => this.changeMonth(-1));
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => this.changeMonth(1));
      }
      if (todayBtn) {
        todayBtn.addEventListener('click', () => this.goToToday());
      }

      // Close day modal on backdrop or close button
      const modal = document.getElementById('cal-day-modal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal || e.target.closest('[data-close-cal-modal]')) {
            this.closeDayModal();
          }
        });
      }
    },

    setupSocketListener() {
      // Connect to real-time notifications for live updates
      if (typeof io !== 'undefined') {
        const socket = io();
        const events = ['new_transaction', 'update_transaction', 'delete_transaction', 'zero_spending_confirmed'];
        events.forEach(evt => {
          socket.on(evt, () => {
            // Silently refresh current calendar month in real-time
            this.loadMonth(this.currentMonth, false);
          });
        });
      }
    },

    changeMonth(delta) {
      const [yearStr, monthStr] = this.currentMonth.split('-');
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) - 1 + delta;

      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }

      const newMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      this.currentMonth = newMonthKey;
      this.loadMonth(newMonthKey);
    },

    goToToday() {
      const todayMonth = new Date().toISOString().substring(0, 7);
      this.currentMonth = todayMonth;
      this.loadMonth(todayMonth);
    },

    async loadMonth(monthKey, showLoading = true) {
      const label = document.getElementById('cal-current-label');
      const grid = document.getElementById('cal-days-grid');
      
      if (showLoading && grid) {
        grid.style.opacity = '0.55';
        grid.style.transition = 'opacity 0.2s ease';
      }

      try {
        const res = await fetch(`/api/calendar?month=${monthKey}`);
        const data = await res.json();
        if (data.success) {
          this.cachedData = data;
          this.renderCalendar(data);
        }
      } catch (err) {
        console.error('[SpendWiseCalendar] Failed to load calendar data:', err);
      } finally {
        if (grid) {
          grid.style.opacity = '1';
        }
      }
    },

    renderCalendar(data) {
      const monthKey = data.month || this.currentMonth;
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;

      // Update header label: e.g. "November 2026"
      const label = document.getElementById('cal-current-label');
      if (label) {
        label.textContent = `${monthNames[monthIndex]} ${year}`;
      }

      // Update monthly totals in header
      const totals = data.monthlyTotals || { income: 0, expense: 0, net: 0 };
      const inflowEl = document.getElementById('cal-total-inflow');
      const outflowEl = document.getElementById('cal-total-outflow');
      const netEl = document.getElementById('cal-total-net');

      if (inflowEl) {
        inflowEl.textContent = `+${this.currency} ${totals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (outflowEl) {
        outflowEl.textContent = `-${this.currency} ${totals.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (netEl) {
        const netSign = totals.net >= 0 ? '+' : '-';
        netEl.textContent = `${netSign}${this.currency} ${Math.abs(totals.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        netEl.parentElement.style.borderColor = totals.net >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      }

      // Build Days Grid
      const grid = document.getElementById('cal-days-grid');
      if (!grid) return;

      grid.innerHTML = '';

      // First day of this month
      const firstDay = new Date(year, monthIndex, 1);
      // Day of week: 0 is Sun, 1 is Mon... Convert to Monday=0, Sunday=6
      let startWeekday = (firstDay.getDay() + 6) % 7;

      // Number of days in this month
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      // Number of days in previous month
      const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

      // Today string
      const todayStr = new Date().toISOString().substring(0, 10);

      const daysMap = data.days || {};

      // 1. Previous month trailing days
      for (let i = startWeekday - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell other-month';
        cell.innerHTML = `
          <div class="cal-day-cell-top">
            <span class="cal-day-number">${dayNum}</span>
          </div>
        `;
        grid.appendChild(cell);
      }

      // 2. Current month active days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = daysMap[dateStr] || { income: 0, expense: 0, transactions: [], hasZeroSpending: false };
        const isToday = dateStr === todayStr;
        const hasTx = dayData.transactions && dayData.transactions.length > 0;

        const cell = document.createElement('div');
        cell.className = `cal-day-cell ${isToday ? 'is-today' : ''} ${hasTx ? 'has-transactions' : ''}`;
        cell.setAttribute('data-date', dateStr);

        let pillsHtml = '';

        // Inflow pill if income > 0
        if (dayData.income > 0) {
          const formattedIncome = this.formatShortAmount(dayData.income);
          pillsHtml += `
            <div class="cal-pill-item income" title="Inflow: +${this.currency} ${dayData.income.toLocaleString()}">
              <span class="cal-pill-label"><i class="fa-solid fa-arrow-up" style="font-size: 0.65rem;"></i></span>
              <span class="tabular-nums">+${formattedIncome}</span>
            </div>
          `;
        }

        // Outflow pill if expense > 0
        if (dayData.expense > 0) {
          const formattedExpense = this.formatShortAmount(dayData.expense);
          pillsHtml += `
            <div class="cal-pill-item expense" title="Expense: -${this.currency} ${dayData.expense.toLocaleString()}">
              <span class="cal-pill-label"><i class="fa-solid fa-arrow-down" style="font-size: 0.65rem;"></i></span>
              <span class="tabular-nums">-${formattedExpense}</span>
            </div>
          `;
        }

        // Zero spending day confirmed
        if (dayData.hasZeroSpending && dayData.expense === 0) {
          pillsHtml += `
            <div class="cal-pill-item zero-spend" title="Zero Spending Day Confirmed">
              <i class="fa-solid fa-shield-heart" style="font-size: 0.7rem;"></i>
              <span class="cal-pill-label">No Spend</span>
            </div>
          `;
        }

        // Empty state hover indicator
        const emptyHint = !hasTx && !dayData.hasZeroSpending ? `<span class="cal-empty-hint"><i class="fa-solid fa-plus"></i></span>` : '';

        cell.innerHTML = `
          <div class="cal-day-cell-top">
            <span class="cal-day-number">${day}</span>
            ${isToday ? '<span class="cal-today-pill">Today</span>' : ''}
          </div>
          <div class="cal-day-pills">
            ${pillsHtml}
          </div>
          ${emptyHint}
        `;

        // Click to view day details modal
        cell.addEventListener('click', () => {
          this.openDayModal(dateStr, dayData);
        });

        grid.appendChild(cell);
      }

      // 3. Next month trailing days to complete 35 or 42 grid slots
      const totalRendered = startWeekday + daysInMonth;
      const targetTotal = totalRendered <= 35 ? 35 : 42;
      const trailingCount = targetTotal - totalRendered;

      for (let nextDay = 1; nextDay <= trailingCount; nextDay++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell other-month';
        cell.innerHTML = `
          <div class="cal-day-cell-top">
            <span class="cal-day-number">${nextDay}</span>
          </div>
        `;
        grid.appendChild(cell);
      }
    },

    formatShortAmount(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 10000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    },

    openDayModal(dateStr, dayData) {
      const modal = document.getElementById('cal-day-modal');
      if (!modal) return;

      const dateObj = new Date(dateStr + 'T00:00:00');
      const formattedTitle = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Update date title
      const titleEl = document.getElementById('cal-modal-date-title');
      if (titleEl) titleEl.textContent = formattedTitle;

      // Update daily summary
      const incomeVal = dayData.income || 0;
      const expenseVal = dayData.expense || 0;
      const netVal = incomeVal - expenseVal;

      const incomeEl = document.getElementById('cal-modal-income');
      const expenseEl = document.getElementById('cal-modal-expense');
      const netEl = document.getElementById('cal-modal-net');

      if (incomeEl) incomeEl.textContent = `+${this.currency} ${incomeVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      if (expenseEl) expenseEl.textContent = `-${this.currency} ${expenseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      if (netEl) {
        const sign = netVal >= 0 ? '+' : '-';
        netEl.textContent = `${sign}${this.currency} ${Math.abs(netVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        netEl.style.color = netVal >= 0 ? '#10B981' : '#EF4444';
      }

      // Populate list of transactions
      const listEl = document.getElementById('cal-modal-tx-list');
      if (listEl) {
        listEl.innerHTML = '';
        const txs = dayData.transactions || [];

        if (txs.length === 0) {
          listEl.innerHTML = `
            <div style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
              <div style="font-size: 2.2rem; margin-bottom: 10px; color: var(--text-subtle);"><i class="fa-solid fa-receipt"></i></div>
              <div style="font-weight: 600; font-size: 1rem; color: var(--text-main); margin-bottom: 4px;">No Transactions Logged</div>
              <div style="font-size: 0.86rem; margin-bottom: 20px;">There were no recorded expenses or incomes on this date.</div>
            </div>
          `;
        } else {
          txs.forEach(t => {
            const isIncome = t.type === 'income';
            const item = document.createElement('div');
            item.className = 'cal-tx-row';
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-card); border-radius: 12px; margin-bottom: 10px; gap: 12px;';
            item.innerHTML = `
              <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: ${t.category_color ? t.category_color + '22' : 'rgba(16, 185, 129, 0.15)'}; border: 1px solid var(--border-card); display: flex; align-items: center; justify-content: center; color: ${t.category_color || 'var(--brand-primary)'}; flex-shrink: 0;">
                  <i class="fa-solid ${t.category_icon || 'fa-tag'}"></i>
                </div>
                <div style="min-width: 0;">
                  <div style="font-weight: 600; font-size: 0.92rem; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${t.description || t.category_name}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">
                    ${t.category_name} &bull; ${t.payment_method || 'Mobile Banking'}
                  </div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.98rem; color: ${isIncome ? '#10B981' : '#EF4444'};">
                  ${isIncome ? '+' : '-'}${this.currency} ${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            `;
            listEl.appendChild(item);
          });
        }
      }

      // Set date on Quick Add button
      const addBtn = document.getElementById('cal-modal-add-btn');
      if (addBtn) {
        addBtn.onclick = () => {
          this.closeDayModal();
          // Pre-fill date in quick add modal
          const dateInput = document.querySelector('#quick-add-modal input[name="transaction_date"]');
          if (dateInput) dateInput.value = dateStr;
          if (window.SpendWise && window.SpendWise.openModal) {
            window.SpendWise.openModal('quick-add-modal');
          }
        };
      }

      modal.classList.add('show');
    },

    closeDayModal() {
      const modal = document.getElementById('cal-day-modal');
      if (modal) modal.classList.remove('show');
    }
  };
})();

