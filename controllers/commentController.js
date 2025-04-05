const Comment = require('../models/comment');
const ExpressError = require('../utils/ExpressError');

exports.postComment = async (req, res, next) => {
    try {
        const { id: taskId } = req.params;
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
        res.redirect(`/tasks/${taskId}`);
    } catch (error) {
        next(error);
    }
};
