const RecurringModel = require('../models/recurringModel');

const RecurringController = {
  async getAll(req, res) {
    try {
      const items = await RecurringModel.getAllByUser(req.user.id);
      const upcoming = await RecurringModel.getUpcomingDue(req.user.id, 5);
      res.json({ success: true, count: items.length, items, upcoming });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async create(req, res) {
    try {
      const { title, category_id, amount, frequency, billing_day, next_due_date, payment_method, notes } = req.body;
      const parsedAmount = parseFloat(amount);

      if (!title || isNaN(parsedAmount) || parsedAmount <= 0 || !billing_day || !next_due_date) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(400).json({ success: false, message: 'Title, amount, billing day, and next due date are required.' });
        }
        return res.redirect('/recurring?error=Invalid+inputs');
      }

      const item = await RecurringModel.create({
        userId: req.user.id,
        title,
        categoryId: category_id ? parseInt(category_id, 10) : null,
        amount: parsedAmount,
        frequency: frequency || 'monthly',
        billingDay: parseInt(billing_day, 10),
        nextDueDate: next_due_date,
        paymentMethod: payment_method || 'Mobile Banking',
        notes: notes || ''
      });

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(201).json({ success: true, item });
      }

      res.redirect('/recurring?success=1');
    } catch (err) {
      console.error('[RecurringController.create] Error:', err.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/recurring?error=' + encodeURIComponent(err.message));
    }
  },

  async toggleActive(req, res) {
    try {
      const updated = await RecurringModel.toggleActive(req.params.id, req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, item: updated });
      }
      res.redirect('/recurring?toggled=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/recurring?error=' + encodeURIComponent(err.message));
    }
  },

  async delete(req, res) {
    try {
      await RecurringModel.delete(req.params.id, req.user.id);
      if (req.originalUrl.startsWith('/api/')) {
        return res.json({ success: true, message: 'Recurring payment removed.' });
      }
      res.redirect('/recurring?deleted=1');
    } catch (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.redirect('/recurring?error=' + encodeURIComponent(err.message));
    }
  }
};

module.exports = RecurringController;
