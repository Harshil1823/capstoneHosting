const ChangeRequest = require('../models/changeRequest');

// Render new change request form
exports.renderNewForm = (req, res) => {
    res.render('requests/new');
};

// Create a new change request
exports.createChangeRequest = async (req, res) => {
    try {
        const { title, affectedUser, department, description } = req.body;

        const newRequest = new ChangeRequest({
            title,
            description,
            requester: req.user._id,
            affectedUser: affectedUser || 'N/A',
            department: department || 'N/A',
            company: req.user.company,
        });

        await newRequest.save();
        req.flash('success', 'Request submitted successfully!');
        res.redirect('/requests');
    } catch (err) {
        console.log("error caught" + err);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/requests/new');
    }
};

// List all change requests
exports.listChangeRequests = async (req, res) => {
    try {
        const requests = await ChangeRequest.find({ company: req.user.company })
            .populate('requester', 'username')
            .sort({ createdAt: -1 });

        res.render('requests/index', { requests });
    } catch (error) {
        req.flash('error', 'Unable to fetch change requests.');
        res.redirect('/');
    }
};
