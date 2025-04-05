const Comment = require('../models/comment');
const { postComment } = require('../controllers/commentController');

jest.mock('../models/comment');

describe('Comment Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: 'task123' }, // Simulating a task ID from the route
            body: { content: 'This is a test comment' },
            user: { _id: 'user123' },
            flash: jest.fn(),
        };

        res = {
            redirect: jest.fn(),
        };

        next = jest.fn();
    });

    describe('postComment', () => {
        it('should create and save a comment successfully', async () => {
            const mockComment = { save: jest.fn() };
            Comment.mockImplementation(() => mockComment);

            await postComment(req, res, next);

            expect(mockComment.save).toHaveBeenCalled();
            expect(req.flash).toHaveBeenCalledWith('success', 'Comment added successfully!');
            expect(res.redirect).toHaveBeenCalledWith('/tasks/task123');
        });

        it('should return an error if content is empty', async () => {
            req.body.content = '  '; // Simulating an empty content
            await postComment(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(res.redirect).not.toHaveBeenCalled(); // Ensure redirection doesn't happen
        });

        it('should handle errors during comment creation', async () => {
            Comment.mockImplementation(() => ({
                save: jest.fn().mockRejectedValue(new Error('Database Error'))
            }));

            await postComment(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
