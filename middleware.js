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