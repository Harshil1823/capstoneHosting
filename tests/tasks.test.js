const { deleteHandler } = require('../routes/tasks'); // Import the delete handler
const Task = require('../models/tasks');
const { cloudinary } = require('../cloudinary');

jest.mock('../models/tasks'); // Mock Task model
jest.mock('../cloudinary', () => ({
    cloudinary: {
        uploader: {
            destroy: jest.fn().mockResolvedValue(true), // Mock Cloudinary delete function
        },
    },
    storage: {}, // Mock storage for uploads
}));

beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test to prevent test contamination
});

describe('DELETE /tasks/:id', () => {
    it('Deletes a task successfully and redirects', async () => {
        const req = {
            params: { id: '123' },
            flash: jest.fn(),
            isAuthenticated: jest.fn().mockReturnValue(true),
            user: { _id: 'user123' },
        };

        const res = {
            redirect: jest.fn(),
        };

        const next = jest.fn();

        // Mock task with images and author
        const mockTask = {
            _id: '123',
            images: [{ filename: 'image1' }, { filename: 'image2' }],
            author: 'user123',
        };

        Task.findById.mockResolvedValue(mockTask);
        Task.findByIdAndDelete.mockResolvedValue(true);

        await deleteHandler(req, res, next);

        expect(Task.findById).toHaveBeenCalledWith('123');
        expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('image1');
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('image2');
        expect(Task.findByIdAndDelete).toHaveBeenCalledWith('123');
        expect(req.flash).toHaveBeenCalledWith('success', 'Task deleted successfully!');
        expect(res.redirect).toHaveBeenCalledWith('/tasks');
        expect(next).not.toHaveBeenCalled();
    });

    it('Handles case when task is not found', async () => {
        const req = {
            params: { id: 'nonexistent' },
            flash: jest.fn(),
            isAuthenticated: jest.fn().mockReturnValue(true),
            user: { _id: 'user123' },
        };

        const res = {
            redirect: jest.fn(),
        };

        const next = jest.fn();

        Task.findById.mockResolvedValue(null);  // Simulating task not found

        await deleteHandler(req, res, next);

        expect(Task.findById).toHaveBeenCalledWith('nonexistent');
        expect(req.flash).toHaveBeenCalledWith('error', 'Task not found!');
        expect(res.redirect).toHaveBeenCalledWith('/tasks');
        expect(Task.findByIdAndDelete).not.toHaveBeenCalled();  // Ensure delete was NOT called
        expect(next).not.toHaveBeenCalled();
    });

    it('Handles errors and calls next with error', async () => {
        const req = {
            params: { id: '123' },
            flash: jest.fn(),
            isAuthenticated: jest.fn().mockReturnValue(true),
            user: { _id: 'user123' },
        };

        const res = {
            redirect: jest.fn(),
        };

        const next = jest.fn();

        Task.findById.mockRejectedValue(new Error('Database error'));

        await deleteHandler(req, res, next);

        expect(Task.findById).toHaveBeenCalledWith('123');
        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(req.flash).not.toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
    });
});