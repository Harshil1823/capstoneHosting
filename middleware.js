const Task = require('./models/tasks');
const Message = require('./models/message');

// Checks if the user is logged in. If not, redirects them to the login page.
module.exports.isLoggedin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in!');
        return res.redirect('/login');
    }
    next();
};

// Stores the return URL in response locals for use in views.
module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
};

// Checks if the current user is the author of a task. Admins bypass this check.
module.exports.isAuthor = async (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        return next();
    }
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
    }
    if (!task.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to edit this task!');
        return res.redirect(`/tasks/${id}`);
    }
    next();
};

// Ensures the user is authenticated. Redirects to login if not.
module.exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    res.redirect('/login');
};

// Checks if the user is a manager or admin. Redirects to tasks menu if not.
module.exports.isManager = (req, res, next) => {
    if (req.user && (req.user.role === 'Manager' || req.user.role === 'Admin')) {
        return next();
    }
    req.flash('error', 'Access denied: Only managers can view task history.');
    return res.redirect('/tasks');
};

// Ensures the user is either an admin or manager. Redirects to schedule menu if not.
module.exports.ensureAdminOrManager = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
        return next();
    }
    req.flash('error', 'You do not have permission to perform this action.');
    res.redirect('/schedules');
};

// Counts unread messages for the current user and makes the count available to views.
module.exports.checkUnreadMessages = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            const unreadCount = await Message.countDocuments({
                recipient: req.user._id,
                read: false
            });
            res.locals.unreadMessageCount = unreadCount;
        } catch (err) {
            console.error('Error checking unread messages:', err);
            res.locals.unreadMessageCount = 0;
        }
    } else {
        res.locals.unreadMessageCount = 0;
    }
    next();
};