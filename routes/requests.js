const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const ChangeRequest = require('../models/changeRequest');
const { isLoggedin, ensureAdminOrManager } = require('../middleware');


router.get('/new', isLoggedin, ensureAdminOrManager, (req, res) => {
    res.render('requests/new') //have to create a new view and redner that
});
router.post('/', isLoggedin, ensureAdminOrManager, async (req, res) => {
  try {
      const { title, affectedUser, department, description } = req.body;

      const newRequest = new ChangeRequest({
          title,
          description,
          requester: req.user._id,
          affectedUser: affectedUser || 'N/A',
          department: department || 'N/A',
          company: req.user.company, // Ensure company is included
      });

      await newRequest.save();
      req.flash('success', 'Request submitted successfully!');
      res.redirect('/requests'); // Redirect to the list of requests
  } catch (err) {
      console.error(err);
      req.flash('error', 'Something went wrong. Please try again.');
      res.redirect('/requests/new');
  }
});
// List all change requests for the company (for devs/admin review)
router.get('/', isLoggedin, ensureAdminOrManager, catchAsync(async (req, res) => {
    const requests = await ChangeRequest.find({ company: req.user.company })
      .populate('requester', 'username')
      .sort({ createdAt: -1 });
    res.render('requests/index', { requests }); // Create a view at views/requests/index.ejs
}));

module.exports = router;