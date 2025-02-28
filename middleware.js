const Task = require('./models/tasks'); // Import your Task model

module.exports.isLoggedin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        //to redirect the user from where they were trying to go
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in!')
        return res.redirect('/login')
    }
    next();
}

module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
}

module.exports.isAuthor = async (req, res, next) => {
    // If the user is an admin, skip the author check
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
}

module.exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    res.redirect('/login');
};

module.exports.isManager = (req, res, next) => {
    // Allow managers and admins to view history
    if (req.user && (req.user.role === 'Manager' || req.user.role === 'Admin')) {
      return next();
    }
    req.flash('error', 'Access denied: Only managers can view task history.');
    return res.redirect('/tasks');
};

module.exports.ensureAdminOrManager = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
        return next();
    }
    req.flash('error', 'You do not have permission to perform this action.');
    res.redirect('/schedules');
}