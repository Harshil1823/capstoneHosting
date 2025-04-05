const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { isLoggedin } = require('../middleware'); // Adjust to your middleware name

// GET: Render notifications page
router.get('/', isLoggedin, async (req, res) => {
  try {
    // Find notifications for the current user sorted by most recent
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render('notifications/index', { notifications });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to load notifications.');
    res.redirect('/tasks');
  }
});

// PUT: Mark a single notification as read
router.put('/:id/read', isLoggedin, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE: Clear all notifications for the user
router.delete('/clear', isLoggedin, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    req.flash('success', 'All notifications cleared.');
    res.redirect('/notifications');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to clear notifications.');
    res.redirect('back');
  }
});

module.exports = router;
