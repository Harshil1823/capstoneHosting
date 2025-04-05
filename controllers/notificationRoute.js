const Notification = require('../models/notification');

// Mark a single notification as read
exports.markNotificationAsRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.log("caught error" + err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Clear all notifications for the user
exports.clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user._id });
        req.flash('success', 'All notifications cleared.');
        res.redirect('/notifications');
    } catch (err) {
        console.log("caught error" + err);
        req.flash('error', 'Unable to clear notifications.');
        res.redirect('back');
    }
};