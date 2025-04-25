// routes/comments.js
const express = require('express');
const router = express.Router({ mergeParams: true }); 
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const Comment = require('../models/comment');
const { isLoggedin } = require('../middleware');

// POST route to add a comment to a task
router.post('/', isLoggedin, catchAsync(async (req, res) => {
    const { id: taskId } = req.params; // assuming the parent route is /tasks/:id/comments
    const { content } = req.body;
    if (!content || content.trim() === '') {
      throw new ExpressError('Comment content cannot be empty', 400);
    }
    const comment = new Comment({
      task: taskId,
      author: req.user._id,
      content
    });
    await comment.save();
    req.flash('success', 'Comment added successfully!');
    res.redirect(`/tasks/${taskId}`); // redirect back to the task show page
}));
  
module.exports = router;