const ReportModel = require('../models/reportModel');
const ReportService = require('../services/reportService');

const ReportController = {
  async getReports(req, res) {
    try {
      const reports = await ReportModel.getAllByUser(req.user.id);
      res.json({ success: true, count: reports.length, reports });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getReportByMonth(req, res) {
    try {
      const month = req.params.month;
      let report = await ReportModel.getByUserAndMonth(req.user.id, month);

      if (!report) {
        // Auto-generate if viewing an ungenerated month
        report = await ReportService.generateMonthlyReport(req.user.id, month);
      }

      res.json({ success: true, report });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async generateReport(req, res) {
    try {
      const { month } = req.body;
      const report = await ReportService.generateMonthlyReport(req.user.id, month);

      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Monthly report generated successfully', report });
      }

      res.redirect(`/reports?month=${report.month}&generated=1`);
    } catch (err) {
      console.error('[ReportController.generateReport] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/reports?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = ReportController;
