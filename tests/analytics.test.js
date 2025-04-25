const Analytics = require('../models/analytics');
const Task = require('../models/tasks');
const analyticsController = require('../controllers/analytics');
const { ensureAnalyticsExists, getNormalizedPriority } = require('../utils/analyticsHelpers');

// Mock the dependencies
jest.mock('../models/analytics');
jest.mock('../models/tasks');
jest.mock('../utils/analyticsHelpers');

describe('Analytics Controller', () => {
    // Mock data
    const mockCompanyId = 'company123';
    const mockUserId = 'user123';
    const mockDepartmentId = 'dept123';
    
    // Common mock objects
    const mockAnalytics = {
        _id: 'analytics123',
        company: mockCompanyId,
        date: new Date(),
        dailyStats: {
            tasksCreated: 5,
            tasksCompleted: 3,
            tasksUpdated: 2,
            tasksDeleted: 1,
            tasksOverdue: 1,
            averageCompletionTime: 24
        },
        priorityStats: {
            highPriority: { total: 2, completed: 1, averageCompletionTime: 12 },
            mediumPriority: { total: 2, completed: 1, averageCompletionTime: 24 },
            lowPriority: { total: 1, completed: 1, averageCompletionTime: 48 }
        },
        departmentStats: [
            {
                department: mockDepartmentId,
                tasksCreated: 3,
                tasksCompleted: 2,
                modificationsCount: 1,
                deletionsCount: 0,
                averageCompletionTime: 24,
                overdueRate: 20
            }
        ],
        userStats: [
            {
                user: mockUserId,
                tasksCreated: 2,
                tasksCompleted: 1,
                tasksAssigned: 3,
                averageCompletionTime: 24,
                overdueRate: 10,
                loginCount: 5
            }
        ],
        save: jest.fn().mockResolvedValue(true)
    };

    const mockTask = {
        _id: 'task123',
        company: mockCompanyId,
        author: mockUserId,
        assignedTo: mockUserId,
        department: mockDepartmentId,
        importance: 'high',
        title: 'Test Task',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in future
    };

    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default mock implementations
        ensureAnalyticsExists.mockResolvedValue(mockAnalytics);
        getNormalizedPriority.mockImplementation((importance) => {
            const map = { high: 'high', medium: 'medium', low: 'low' };
            return map[importance] || 'medium';
        });
    });

    describe('updateTaskCreation', () => {
        it('should update analytics when a task is created', async () => {
            // Call the function
            const result = await analyticsController.updateTaskCreation(mockTask);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
            
            // Verify the result
            expect(result).toBe(mockAnalytics);
        });
        it('should handle a task without department', async () => {
            const taskWithoutDept = { ...mockTask, department: null };
            
            await analyticsController.updateTaskCreation(taskWithoutDept);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });
        it('should handle a task without author', async () => {
            const taskWithoutAuthor = { ...mockTask, author: null };
            
            await analyticsController.updateTaskCreation(taskWithoutAuthor);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });
        it('should handle a task without assignee', async () => {
            const taskWithoutAssignee = { ...mockTask, assignedTo: null };
            
            await analyticsController.updateTaskCreation(taskWithoutAssignee);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });
        it('should handle errors', async () => {
            // Setup mock to throw an error
            ensureAnalyticsExists.mockRejectedValue(new Error('Database error'));
            
            // Mock console.error
            console.error = jest.fn();
            
            // Expect the function to throw
            await expect(analyticsController.updateTaskCreation(mockTask)).rejects.toThrow('Database error');
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('updateTaskCompletion', () => {
        it('should update analytics when a task is completed', async () => {
            // Call the function
            const result = await analyticsController.updateTaskCompletion(mockTask);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
            
            // Verify the result
            expect(result).toBe(mockAnalytics);
        });
        it('should handle overdue tasks', async () => {
            // Create an overdue task
            const overdueTask = {
                ...mockTask,
                dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
            };
            
            await analyticsController.updateTaskCompletion(overdueTask);
            
            // Verify dailyStats.tasksOverdue was incremented
            expect(mockAnalytics.dailyStats.tasksOverdue).toBeGreaterThan(1);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });
        it('should handle tasks without valid creation date', async () => {
            const taskWithoutCreatedAt = { ...mockTask, createdAt: null };
            
            await analyticsController.updateTaskCompletion(taskWithoutCreatedAt);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });
        it('should handle errors', async () => {
            // Setup mock to throw an error
            ensureAnalyticsExists.mockRejectedValue(new Error('Database error'));
            
            // Mock console.error
            console.error = jest.fn();
            
            // Expect the function to throw
            await expect(analyticsController.updateTaskCompletion(mockTask)).rejects.toThrow('Database error');
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });
    describe('updateTaskModification', () => {
        const oldTask = {
            ...mockTask,
            department: 'oldDept123',
            assignedTo: 'oldUser123',
            importance: 'low'
        };
        
        it('should update analytics when a task is modified', async () => {
            // Call the function
            const result = await analyticsController.updateTaskModification(mockTask, oldTask);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
            
            // Verify the result
            expect(result).toBe(mockAnalytics);
        });

        it('should handle task without department', async () => {
            const taskWithoutDept = { ...mockTask, department: null };
            
            await analyticsController.updateTaskModification(taskWithoutDept, oldTask);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            // Setup mock to throw an error
            ensureAnalyticsExists.mockRejectedValue(new Error('Database error'));
            
            // Mock console.error
            console.error = jest.fn();
            
            // Expect the function to throw
            await expect(analyticsController.updateTaskModification(mockTask, oldTask)).rejects.toThrow('Database error');
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });
    describe('updateTaskDeletion', () => {
        it('should update analytics when a task is deleted', async () => {
            // Call the function
            const result = await analyticsController.updateTaskDeletion(mockTask);
            
            // Verify ensureAnalyticsExists was called
            expect(ensureAnalyticsExists).toHaveBeenCalledWith(mockCompanyId);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
            
            // Verify the result
            expect(result).toBe(mockAnalytics);
        });

        it('should handle task without department', async () => {
            const taskWithoutDept = { ...mockTask, department: null };
            
            await analyticsController.updateTaskDeletion(taskWithoutDept);
            
            // Verify analytics.save was called
            expect(mockAnalytics.save).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            // Setup mock to throw an error
            ensureAnalyticsExists.mockRejectedValue(new Error('Database error'));
            
            // Mock console.error
            console.error = jest.fn();
            
            // Expect the function to throw
            await expect(analyticsController.updateTaskDeletion(mockTask)).rejects.toThrow('Database error');
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('getUserAnalytics', () => {
        it('should return analytics for a user', async () => {
            // Mock Analytics.findOne
            Analytics.findOne = jest.fn().mockResolvedValue(mockAnalytics);
            
            // Call the function
            const result = await analyticsController.getUserAnalytics(mockUserId, mockCompanyId);
            
            // Verify the result matches the user stats
            expect(result).toEqual(mockAnalytics.userStats[0]);
        });

        it('should return default stats if user not found', async () => {
            // Mock Analytics.findOne to return null
            Analytics.findOne = jest.fn().mockResolvedValue(null);
            
            // Call the function
            const result = await analyticsController.getUserAnalytics(mockUserId, mockCompanyId);
            
            // Verify default stats
            expect(result).toEqual({
                tasksCompleted: 0,
                tasksCreated: 0,
                tasksAssigned: 0,
                averageCompletionTime: 0,
                overdueRate: 0,
                loginCount: 0
            });
        });

        it('should handle errors', async () => {
            // Mock Analytics.findOne to throw an error
            Analytics.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });
            
            // Mock console.error
            console.error = jest.fn();
            
            // Expect the function to throw
            await expect(analyticsController.getUserAnalytics(mockUserId, mockCompanyId)).rejects.toThrow('Database error');
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });
    describe('getDepartmentAnalytics', () => {
        it('should return analytics for a department', async () => {
            // Mock Analytics.findOne
            Analytics.findOne = jest.fn().mockResolvedValue(mockAnalytics);
            
            // Call the function
            const result = await analyticsController.getDepartmentAnalytics(mockDepartmentId, mockCompanyId);
            
            // Verify the result matches the department stats
            expect(result).toEqual(mockAnalytics.departmentStats[0]);
        });

        it('should return default stats if department not found', async () => {
            // Mock Analytics.findOne to return null
            Analytics.findOne = jest.fn().mockResolvedValue(null);
            
            // Call the function
            const result = await analyticsController.getDepartmentAnalytics(mockDepartmentId, mockCompanyId);
            
            // Verify default stats
            expect(result).toEqual({
                tasksCompleted: 0,
                tasksCreated: 0,
                modificationsCount: 0,
                deletionsCount: 0,
                averageCompletionTime: 0,
                overdueRate: 0
            });
        });

        it('should handle errors', async () => {
            // Mock Analytics.findOne to throw an error
            Analytics.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });
            
            // Mock console.error
            console.error = jest.fn();
            
            // Expect the function to throw
            await expect(analyticsController.getDepartmentAnalytics(mockDepartmentId, mockCompanyId)).rejects.toThrow('Database error');
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });

     describe('getCompanyAnalytics', () => {
        // In your test file
        it('should return analytics for a company', async () => {  // Make sure to include async here
            // Setup - use the exact mock analytics structure expected in your assertion
            const mockAnalytics = {
                _id: 'analytics123',
                company: 'company123',
                // ... other fields as in your expected result ...
            };
            
            // Mock req object with properly structured user property
            const req = {
                user: { company: 'company123' },
                query: {}
            };
            
            // Mock res object
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };
            
            // Mock Analytics.find to return a Promise resolving to an array with mockAnalytics
            Analytics.find = jest.fn().mockImplementation(() => ({
                populate: jest.fn().mockImplementation(() => ({
                    populate: jest.fn().mockResolvedValue([mockAnalytics])
                }))
            }));
            
            // Call the controller method
            await analyticsController.getCompanyAnalytics(req, res);
            
            // Verify res.json was called with the analytics
            expect(res.json).toHaveBeenCalledWith([mockAnalytics]);
        });

        it('should handle date range filtering', async () => {
            // Mock req and res with date range
            const req = {
                user: { company: mockCompanyId },
                query: {
                    startDate: '2023-01-01',
                    endDate: '2023-12-31'
                }
            };
            
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };
            
            // Mock Analytics.find with chained methods properly
            const populateMock = jest.fn().mockResolvedValue([mockAnalytics]);
            const firstPopulateMock = jest.fn().mockReturnValue({ populate: populateMock });
            Analytics.find = jest.fn().mockReturnValue({ populate: firstPopulateMock });
            
            // Call the function
            await analyticsController.getCompanyAnalytics(req, res);
            
            // Verify res.json was called with the analytics
            expect(res.json).toHaveBeenCalledWith([mockAnalytics]);
            
            // Verify find was called with date range
            expect(Analytics.find).toHaveBeenCalledWith({
                company: mockCompanyId,
                date: {
                    $gte: expect.any(Date),
                    $lte: expect.any(Date)
                }
            });
        });
        it('should handle errors', async () => {
            // Mock req and res
            const req = {
                user: { company: mockCompanyId },
                query: {}
            };
            
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };
            
            // Mock Analytics.find to throw an error
            Analytics.find = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });
            
            // Mock console.error
            console.error = jest.fn();
            
            // Call the function
            await analyticsController.getCompanyAnalytics(req, res);
            
            // Verify error response
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch analytics from database' });
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });
});
