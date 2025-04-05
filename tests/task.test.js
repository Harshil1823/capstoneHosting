const { createTask, findTaskById, deleteTaskById, findByIdAndUpdate } = require('../controllers/task');
jest.mock('../models/tasks'); // Mock the Task model.
const Task = require('../models/tasks'); // Import the mocked Task model.

describe('Task Controller', () => {
    it('Creates a new task successfully', async () => {
        // Mock `req`, `res`, and `next`
        const req = {
            body: {
                title: 'New Task',
                description: 'Task description',
                dueDate: new Date(),
                importance: 'High Priority',
                location: 'Office',
                department: 'IT',
            },
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const next = jest.fn();

        // Mock the `Task` constructor
        const mockNewTask = { ...req.body, _id: '123' };
        Task.mockImplementation(() => mockNewTask);

        // Mock `Task.create` to return a mock created task
        Task.create.mockResolvedValue(mockNewTask);

        // Call the function
        await createTask(req, res, next);

        // Assertions
        expect(Task.create).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockNewTask);
        expect(next).not.toHaveBeenCalled(); // Ensure no errors occurred.
    });

    it('Finds a task by ID successfully', async () => {
        // Mock `req`, `res`, and `next`
        const req = {
            params: {
                id: '123',
            },
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const next = jest.fn();

        // Mock `Task.findById` to return a mock found task
        const mockFoundTask = { _id: '123', title: 'Existing Task' };
        Task.findById.mockResolvedValue(mockFoundTask);

        // Call the function
        await findTaskById(req, res, next);

        // Assertions
        expect(Task.findById).toHaveBeenCalledWith('123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockFoundTask);
        expect(next).not.toHaveBeenCalled(); // Ensure no errors occurred.
    });

    it('Deletes a task by ID successfully', async () => {
        // Mock `req`, `res`, and `next`
        const req = {
            params: {
                id: '123',
            },
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const next = jest.fn();

        // Mock `Task.findByIdAndDelete` to return a mock deleted task
        const mockDeletedTask = { _id: '123', title: 'Deleted Task' };
        Task.findByIdAndDelete.mockResolvedValue(mockDeletedTask);

        // Call the function
        await deleteTaskById(req, res, next);

        // Assertions
        expect(Task.findByIdAndDelete).toHaveBeenCalledWith('123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockDeletedTask);
        expect(next).not.toHaveBeenCalled(); // Ensure no errors occurred.
    });

    it('Marks a task as complete successfully', async () => {
        const req = { params: { id: '123' }, body: { completed: true } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        // Mock "Task.findByIdAndUpdate" to return a completed task
        const next = jest.fn();
        const mockUpdatedTask = { _id: '123', completed: true };
        Task.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

        // Call the functions
        await findByIdAndUpdate(req, res, next);
        
        // Assertions
        expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('123', { completed: true }, { new: true});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockUpdatedTask);
        expect(next).not.toHaveBeenCalled(); // Ensure no errors occured
    });
});