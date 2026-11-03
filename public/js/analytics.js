// SpendWise Chart.js Graphical Analytics Engine
document.addEventListener('DOMContentLoaded', async () => {
  const chartContainer = document.getElementById('analytics-page-root');
  if (!chartContainer || typeof Chart === 'undefined') return;

  const currentMonth = chartContainer.getAttribute('data-month');
  const currency = chartContainer.getAttribute('data-currency') || 'Nu.';

  try {
    const res = await fetch(`/api/analytics/data?month=${currentMonth}`);
    const data = await res.json();

    if (!data.success) return;

    // Chart.js Global Theming
    Chart.defaults.color = '#D4CAB6';
    Chart.defaults.font.family = "'Jost', 'Plus Jakarta Sans', sans-serif";

    // 1. Category Breakdown Doughnut Chart
    const categoryCtx = document.getElementById('categoryDoughnutChart')?.getContext('2d');
    if (categoryCtx && data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      const labels = data.categoryBreakdown.map(c => c.category_name);
      const amounts = data.categoryBreakdown.map(c => parseFloat(c.total_amount));
      // Bhutanese jewel palette fallbacks
      const jewelPalette = ['#8C1C13', '#C5A059', '#D97706', '#0D5C3A', '#1E40AF', '#B45309', '#A6261A', '#047857'];
      const colors = data.categoryBreakdown.map((c, i) => c.category_color || jewelPalette[i % jewelPalette.length]);

      new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: amounts,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: 'rgba(27, 15, 15, 0.9)',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 14, padding: 16, color: '#D4CAB6' }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = ctx.parsed;
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = Math.round((val / total) * 100);
                  return ` ${ctx.label}: ${currency} ${val.toLocaleString()} (${pct}%)`;
                }
              }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 2. Monthly Comparison Bar Chart
    const comparisonCtx = document.getElementById('monthlyComparisonChart')?.getContext('2d');
    if (comparisonCtx && data.monthlyComparison && data.monthlyComparison.length > 0) {
      const months = data.monthlyComparison.map(m => m.month);
      const incomeData = data.monthlyComparison.map(m => parseFloat(m.income));
      const expenseData = data.monthlyComparison.map(m => parseFloat(m.expense));

      new Chart(comparisonCtx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Income (Ngultrum)',
              data: incomeData,
              backgroundColor: '#C5A059',
              borderRadius: 6
            },
            {
              label: 'Expenses (Ngultrum)',
              data: expenseData,
              backgroundColor: '#8C1C13',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              grid: { color: 'rgba(197, 160, 89, 0.1)' },
              ticks: { callback: v => `${currency} ${v.toLocaleString()}`, color: '#D4CAB6' }
            },
            x: { grid: { display: false }, ticks: { color: '#D4CAB6' } }
          },
          plugins: {
            legend: { position: 'top', labels: { color: '#D4CAB6' } }
          }
        }
      });
    }

    // 3. Daily Spending Trends Line Chart
    const trendsCtx = document.getElementById('dailyTrendsChart')?.getContext('2d');
    if (trendsCtx && data.dailyTrends && data.dailyTrends.length > 0) {
      const days = data.dailyTrends.map(d => d.day.slice(-2));
      const amounts = data.dailyTrends.map(d => parseFloat(d.total_amount));

      const primaryThemeColor = '#C5A059';
      const gradient = trendsCtx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(197, 160, 89, 0.45)');
      gradient.addColorStop(1, 'rgba(197, 160, 89, 0.0)');

      new Chart(trendsCtx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Daily Expenses',
            data: amounts,
            borderColor: '#C5A059',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#C5A059',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              grid: { color: 'rgba(197, 160, 89, 0.1)' },
              ticks: { callback: v => `${currency} ${v}`, color: '#D4CAB6' }
            },
            x: {
              grid: { color: 'rgba(197, 160, 89, 0.05)' },
              title: { display: true, text: 'Day of Month', color: '#D4CAB6' },
              ticks: { color: '#D4CAB6' }
            }
          }
        }
      });
    }

  } catch (err) {
    console.error('[SpendWise Analytics] Error loading chart data:', err);
  }
});
