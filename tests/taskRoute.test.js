// __tests__/createTaskController.test.js
const { createTaskController, updateTaskController, completeTaskController, deleteTaskController, removeTaskImageController } = require('../controllers/taskRoute');
const Department = require('../models/department');
const Task = require('../models/tasks');
const Notification = require('../models/notification');
const History = require('../models/history');
const analyticsController = require('../controllers/analytics');
const ExpressError = require('../utils/ExpressError');
const cloudinary = require('../cloudinary');

jest.mock('../models/department');
jest.mock('../models/tasks');
jest.mock('../models/notification');
jest.mock('../models/history');
jest.mock('../controllers/analytics');


// Mock implementations for History and Notification so that we can track .save() calls.
jest.mock('../models/history', () => {
    return jest.fn().mockImplementation(() => {
      return { save: jest.fn().mockResolvedValue() };
    });
  });
  jest.mock('../models/notification', () => {
    return jest.fn().mockImplementation(() => {
      return { save: jest.fn().mockResolvedValue() };
    });
  });

describe('createTaskController', () => {
    let req, res, next;
    const fakeTaskId = 'task123';

    beforeEach(() => {
        // Common request data.
        req = {
            body: {
                title: 'Test Task',
                description: 'Test Description',
                dueDate: '2025-01-01',
                importance: 'High',
                location: 'Office',
                department: 'existingDept',
                newDepartment: '',
                assignedTo: ''  // empty by default
            },
            files: [
                { path: 'file/path1', filename: 'file1' },
                { path: 'file/path2', filename: 'file2' }
            ],
            user: {
                _id: 'user123',
                company: 'companyXYZ',
                username: 'tester'
            },
            flash: jest.fn()
        };

        res = {
            redirect: jest.fn()
        };
        next = jest.fn();

        // Clear mocks before each test.
        jest.clearAllMocks();
    });

    it('creates a task using an existing department and no assignee', async () => {
        // Simulate that department is provided and exists.
        req.body.department = 'existingDept';
        // Simulate default behavior when assignedTo is empty.
        delete req.body.assignedTo;

        // Mock Department.findOne not called because department provided.
        // Prepare Task.save() to simulate saving.
        const fakeTask = { _id: fakeTaskId, save: jest.fn().mockResolvedValue(true) };
        Task.mockImplementation(() => fakeTask);
        fakeTask.save = jest.fn().mockResolvedValue();

        // Mock Notification and History save.
        const fakeNotification = { save: jest.fn().mockResolvedValue() };
        Notification.mockImplementation(() => fakeNotification);
        const fakeHistory = { save: jest.fn().mockResolvedValue() };
        History.mockImplementation(() => fakeHistory);

        // Mock analytics update.
        analyticsController.updateTaskCreation.mockResolvedValue();

        await createTaskController(req, res, next);

        // Verify Task was created with proper data.
        expect(Task).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Test Task',
            description: 'Test Description',
            dueDate: expect.any(Date),
            importance: 'High',
            location: 'Office',
            department: 'existingDept',
            author: 'user123',
            company: 'companyXYZ',
            assignedTo: null,
            images: [
                { url: 'file/path1', filename: 'file1' },
                { url: 'file/path2', filename: 'file2' }
            ]
        }));
        expect(fakeTask.save).toHaveBeenCalled();

        // Verify Notification creation.
        expect(Notification).toHaveBeenCalledWith({
            user: null,
            message: 'You have been assigned a new task: Test Task'
        });
        expect(fakeNotification.save).toHaveBeenCalled();

        // Verify analytics update was called.
        expect(analyticsController.updateTaskCreation).toHaveBeenCalledWith(fakeTask);

        // Verify History entry creation.
        expect(History).toHaveBeenCalledWith({
            task: fakeTaskId,
            changedBy: 'user123',
            actionType: 'Create',
            changes: [{
                field: 'Task Created',
                newValue: 'Initial version by tester'
            }]
        });
        expect(fakeHistory.save).toHaveBeenCalled();

        // Verify flash and redirect.
        expect(req.flash).toHaveBeenCalledWith('success', 'Task created successfully!');
        expect(res.redirect).toHaveBeenCalledWith(`/tasks/${fakeTaskId}`);
    });

    it('creates a task with a new department when department is "new"', async () => {
        req.body.department = 'new';
        req.body.newDepartment = 'New Dept';

        // Simulate a new department is created.
        const fakeDept = { _id: 'dept456', save: jest.fn().mockResolvedValue() };
        Department.mockImplementation(() => fakeDept);
        fakeDept.save = jest.fn().mockResolvedValue();

        // Also, simulate Task, Notification, History as before.
        const fakeTask = { _id: fakeTaskId, save: jest.fn().mockResolvedValue() };
        Task.mockImplementation(() => fakeTask);
        fakeTask.save = jest.fn().mockResolvedValue();
        const fakeNotification = { save: jest.fn().mockResolvedValue() };
        Notification.mockImplementation(() => fakeNotification);
        const fakeHistory = { save: jest.fn().mockResolvedValue() };
        History.mockImplementation(() => fakeHistory);
        analyticsController.updateTaskCreation.mockResolvedValue();

        await createTaskController(req, res, next);

        // Check that new department was created.
        expect(Department).toHaveBeenCalledWith({
            name: 'New Dept',
            company: req.user.company
        });
        expect(fakeDept.save).toHaveBeenCalled();

        // And the task should be created using the new department's _id.
        expect(Task).toHaveBeenCalledWith(expect.objectContaining({
            department: fakeDept._id
        }));
    });

    it('creates a task using default department when none is provided', async () => {
        req.body.department = ''; // empty department
        req.body.newDepartment = '';
        
        // Simulate that no default department exists initially.
        Department.findOne.mockResolvedValue(null);
        // When not found, a new default is created.
        const defaultDept = { _id: 'deptDefault', save: jest.fn().mockResolvedValue() };
        Department.mockImplementation(() => defaultDept);
        defaultDept.save = jest.fn().mockResolvedValue();
        
        const fakeTask = { _id: fakeTaskId, save: jest.fn().mockResolvedValue() };
        Task.mockImplementation(() => fakeTask);
        fakeTask.save = jest.fn().mockResolvedValue();
        const fakeNotification = { save: jest.fn().mockResolvedValue() };
        Notification.mockImplementation(() => fakeNotification);
        const fakeHistory = { save: jest.fn().mockResolvedValue() };
        History.mockImplementation(() => fakeHistory);
        analyticsController.updateTaskCreation.mockResolvedValue();

        await createTaskController(req, res, next);

        // Verify that Department.findOne was called for default "None" department.
        expect(Department.findOne).toHaveBeenCalledWith({
            name: 'None',
            company: req.user.company
        });
        // And then a new default was created.
        expect(defaultDept.save).toHaveBeenCalled();
        expect(Task).toHaveBeenCalledWith(expect.objectContaining({
            department: defaultDept._id
        }));
    });

    it('throws an ExpressError if assigned user does not belong to the same company', async () => {
        req.body.assignedTo = 'assigneeId';
        // We simulate a user that is not in the same company.
        const fakeAssignee = { _id: 'assigneeId', company: 'otherCompany' };
        const User = require('../models/user');
        User.findById = jest.fn().mockResolvedValue(fakeAssignee);
        
        await expect(createTaskController(req, res, next))
            .rejects
            .toThrow(ExpressError);
    });
    it('creates a task with a valid assignee', async () => {
        // Set up a valid assignee.
        req.body.assignedTo = 'assigneeId';
        // Simulate a valid assignee with the same company.
        const fakeAssignee = { _id: 'assigneeId', company: req.user.company };
        const User = require('../models/user');
        User.findById = jest.fn().mockResolvedValue(fakeAssignee);
        
        // Prepare Task, Notification, History mocks.
        const fakeTask = { _id: fakeTaskId, save: jest.fn().mockResolvedValue() };
        Task.mockImplementation(() => fakeTask);
        const fakeNotification = { save: jest.fn().mockResolvedValue() };
        Notification.mockImplementation(() => fakeNotification);
        const fakeHistory = { save: jest.fn().mockResolvedValue() };
        History.mockImplementation(() => fakeHistory);
        analyticsController.updateTaskCreation.mockResolvedValue();

        await createTaskController(req, res, next);

        // Verify that the task is created with the valid assignee.
        expect(Task).toHaveBeenCalledWith(expect.objectContaining({
            assignedTo: fakeAssignee._id
        }));
        // Notification should be created for the valid assignee.
        expect(Notification).toHaveBeenCalledWith({
            user: fakeAssignee._id,
            message: `You have been assigned a new task: ${req.body.title}`
        });
    });
});

describe('updateTaskController additional tests', () => {
    let req, res, next, fakeOldTask;
    const fakeTaskId = 'task123';
  
    beforeEach(() => {
      req = {
        params: { id: fakeTaskId },
        body: {
          title: 'Updated Task',
          description: 'Updated Description',
          dueDate: '2025-02-02',
          importance: 'Medium',
          location: 'Remote',
          department: 'existingDept',
          newDepartment: '',
          assignedTo: '' // by default, no assignee
        },
        files: [
          { path: 'new/image1', filename: 'img1' }
        ],
        user: {
          _id: 'user123',
          company: 'companyXYZ',
          username: 'tester'
        },
        flash: jest.fn()
      };
  
      res = { redirect: jest.fn() };
      next = jest.fn();
  
      // Create a fresh fake task for each test.
      fakeOldTask = {
        _id: fakeTaskId,
        title: 'Old Task',
        description: 'Old Description',
        dueDate: new Date('2025-01-01'),
        importance: 'High',
        location: 'Office',
        department: 'existingDept',
        images: [],
        assignedTo: null,
        save: jest.fn().mockResolvedValue()
      };
  
      // For both calls to Task.findById, return a cloned object
      Task.findById.mockImplementation(() => Promise.resolve({ ...fakeOldTask }));
      
      // Reset Department mocks.
      Department.findOne.mockReset();
      Department.prototype.save = jest.fn().mockResolvedValue();
      
      // Reset analyticsController.
      analyticsController.updateTaskModification.mockResolvedValue();
      
      // Clear model constructor call counts.
      History.mockClear();
      Notification.mockClear();
    });
  
    it('should flash error and redirect if task is not found', async () => {
      Task.findById.mockResolvedValue(null);
      await updateTaskController(req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'Task not found!');
      expect(res.redirect).toHaveBeenCalledWith('/tasks');
    });
  
    it('should create a new department if department is "new"', async () => {
      req.body.department = 'new';
      req.body.newDepartment = 'Brand New Dept';
      const fakeNewDept = { _id: 'deptNew', save: jest.fn().mockResolvedValue() };
      Department.mockImplementation(() => fakeNewDept);
  
      await updateTaskController(req, res, next);
      expect(Department).toHaveBeenCalledWith({
        name: 'Brand New Dept',
        company: req.user.company
      });
      expect(fakeNewDept.save).toHaveBeenCalled();
      // Verify that the fake task’s department is updated.
      // (Note: since Task.findById is called twice and returns a clone, you may check the final assigned value in the updated object.)
    });
  
    it('should use default department if none provided', async () => {
      req.body.department = '';
      req.body.newDepartment = '';
      Department.findOne.mockResolvedValue(null);
      const fakeDefaultDept = { _id: 'deptDefault', save: jest.fn().mockResolvedValue() };
      Department.mockImplementation(() => fakeDefaultDept);
  
      await updateTaskController(req, res, next);
      expect(Department.findOne).toHaveBeenCalledWith({ name: 'None', company: req.user.company });
      expect(fakeDefaultDept.save).toHaveBeenCalled();
    });
  
    it('should throw an ExpressError if assigned user is invalid', async () => {
      req.body.assignedTo = 'assigneeId';
      const User = require('../models/user');
      User.findById = jest.fn().mockResolvedValue({ _id: 'assigneeId', company: 'otherCompany' });
      
      await expect(updateTaskController(req, res, next))
        .rejects
        .toThrow(ExpressError);
    });
  
    it('should update task successfully when no files are provided', async () => {
      req.files = []; // simulate no file upload
      // Change fields to create differences
      req.body.title = 'New Title';
      req.body.description = 'New Description';
  
      await updateTaskController(req, res, next);
  
      // Verify that the updated task (returned by the second Task.findById call) has the new values.
      // (Since our mock returns a clone, we cannot check fakeOldTask directly.)
      // Instead, verify that task.save() was called (already done in controller) and flash & redirect are executed.
      expect(req.flash).toHaveBeenCalledWith('success', 'Task updated successfully!');
      expect(res.redirect).toHaveBeenCalledWith(`/tasks/${fakeTaskId}`);
    });
  
    it('should update task and add new images when files are provided', async () => {
      req.body.title = 'New Title With Images';
      await updateTaskController(req, res, next);
  
      // Because we simulated files in beforeEach, expect that the images array now contains the new image.
      // (Depending on your mock, you may check that task.save was called with images updated.)
      expect(fakeOldTask.save).toHaveBeenCalled();
    });
  
    it('should capture changes and create history and update notifications', async () => {
      // Simulate an assignee exists and changes.
      req.body.assignedTo = 'assigneeId';
      const User = require('../models/user');
      User.findById = jest.fn().mockResolvedValue({ _id: 'assigneeId', company: req.user.company });
      
      // Change several fields.
      req.body.title = 'New Title';
      req.body.description = 'New Description';
      req.body.dueDate = '2025-03-03';
      req.body.importance = 'Low';
      req.body.location = 'Home';
  
      await updateTaskController(req, res, next);
  
      // Verify that a History entry was created.
      expect(History).toHaveBeenCalled();
      const historyInstance = History.mock.results[0].value;
      expect(historyInstance.save).toHaveBeenCalled();
  
      // Verify that an update notification was created.
      const notificationCalls = Notification.mock.calls;
      const updateNotification = notificationCalls.find(call =>
        call[0] && call[0].message && call[0].message.includes('has been updated')
      );
      expect(updateNotification).toBeDefined();
    });
  
    it('should log analytics error and continue update if analytics fails', async () => {
      analyticsController.updateTaskModification.mockRejectedValue(new Error('Analytics Error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await updateTaskController(req, res, next);
      
      expect(console.error).toHaveBeenCalledWith('Error tracking task modification:', expect.any(Error));
      expect(req.flash).toHaveBeenCalledWith('success', 'Task updated successfully!');
      expect(res.redirect).toHaveBeenCalledWith(`/tasks/${fakeTaskId}`);
      
      console.error.mockRestore();
    });
  
    it('should create an assignment notification if the assignee changes', async () => {
      // Initially, fakeOldTask.assignedTo is null.
      req.body.assignedTo = 'assigneeId';
      const User = require('../models/user');
      User.findById = jest.fn().mockResolvedValue({ _id: 'assigneeId', company: req.user.company });
      
      await updateTaskController(req, res, next);
      
      // Check that at least one Notification instance was created with assignment message.
      const notificationCalls = Notification.mock.calls;
      const assignNotification = notificationCalls.find(call =>
        call[0] && call[0].message && call[0].message.includes('has been assigned to you.')
      );
      expect(assignNotification).toBeDefined();
    });
  
    it('should not create a history entry if no changes are made', async () => {
      // Set request body values identical to fakeOldTask.
      req.body.title = fakeOldTask.title;
      req.body.description = fakeOldTask.description;
      req.body.dueDate = fakeOldTask.dueDate.toISOString();
      req.body.importance = fakeOldTask.importance;
      req.body.location = fakeOldTask.location;
      req.body.department = fakeOldTask.department;
  
      await updateTaskController(req, res, next);
      
      // Expect that History was not instantiated (i.e. no history save occurred)
      expect(History).not.toHaveBeenCalled();
    });
  });
  
  describe('completeTaskController', () => {
    let req, res, next, fakeTask;
    
    beforeEach(() => {
      req = {
        params: { id: 'task123' },
        user: { _id: 'user123', isAdmin: false, isManager: false },
        flash: jest.fn()
      };
      res = { redirect: jest.fn() };
      next = jest.fn();
  
      // Create a fake task object.
      fakeTask = {
        _id: 'task123',
        title: 'Test Task',
        completed: false,
        assignedTo: null, // may set later for permission tests
        author: 'author123',
        save: jest.fn().mockResolvedValue()
      };
  
      // For both calls to Task.findById, return a clone of fakeTask.
      Task.findById.mockImplementation(() => Promise.resolve({ ...fakeTask }));
      analyticsController.updateTaskCompletion.mockResolvedValue();
      // Clear model constructor calls.
      History.mockClear();
      Notification.mockClear();
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should flash error and redirect if task is not found', async () => {
      Task.findById.mockResolvedValue(null);
      await completeTaskController(req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'Task not found.');
      expect(res.redirect).toHaveBeenCalledWith('/tasks');
    });
  
    it('should deny permission if user is not assignee and not admin/manager', async () => {
      // Set fakeTask.assignedTo to a different user.
      fakeTask.assignedTo = 'anotherUser';
      req.user.isAdmin = false;
      req.user.isManager = false;
      await completeTaskController(req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'You do not have permission to complete this task.');
      expect(res.redirect).toHaveBeenCalledWith(`/tasks/${req.params.id}`);
    });

    it('should log analytics error and continue update if analytics fails', async () => {
      fakeTask.assignedTo = req.user._id;
      fakeTask.completed = false;
      analyticsController.updateTaskCompletion.mockRejectedValue(new Error('Analytics failure'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await completeTaskController(req, res, next);
      
      expect(console.error).toHaveBeenCalledWith('Error tracking task completion:', expect.any(Error));
      expect(req.flash).toHaveBeenCalledWith('success', 'Task marked as completed!');
      expect(res.redirect).toHaveBeenCalledWith(`/tasks/${req.params.id}`);
      
      console.error.mockRestore();
    });

    //test in cypress for if the user can be assignee and then see if they can mark it completed or not
});

describe('deleteTaskController', () => {
    let req, res, next, fakeTask;
  
    beforeEach(() => {
      req = {
        params: { id: 'task123' },
        flash: jest.fn()
      };
      res = { redirect: jest.fn() };
      next = jest.fn();
  
      // Fake task with images.
      fakeTask = {
        _id: 'task123',
        images: [
          { filename: 'img1' },
          { filename: 'img2' }
        ]
      };
  
      // Task.findById and findByIdAndDelete mocks.
      Task.findById.mockResolvedValue(fakeTask);
      Task.findByIdAndDelete.mockResolvedValue();
      // History.deleteMany mock.
      History.deleteMany = jest.fn().mockResolvedValue();
      // analyticsController updateTaskDeletion mock.
      analyticsController.updateTaskDeletion.mockResolvedValue();
      // cloudinary.uploader.destroy mock.
      cloudinary.uploader = {
        destroy: jest.fn().mockResolvedValue()
      };
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should flash error and redirect if task not found', async () => {
      Task.findById.mockResolvedValue(null);
      await deleteTaskController(req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'Task not found!');
      expect(res.redirect).toHaveBeenCalledWith('/tasks');
    });
  
    it('should delete task successfully and track analytics', async () => {
      await deleteTaskController(req, res, next);
      // Verify analytics update.
      expect(analyticsController.updateTaskDeletion).toHaveBeenCalledWith(fakeTask);
      // Verify Cloudinary image deletion for each image.
      expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('img1');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('img2');
      // Verify History deletion.
      expect(History.deleteMany).toHaveBeenCalledWith({ task: 'task123' });
      // Verify task deletion.
      expect(Task.findByIdAndDelete).toHaveBeenCalledWith('task123');
      // Verify flash and redirect.
      expect(req.flash).toHaveBeenCalledWith('success', 'Task deleted successfully!');
      expect(res.redirect).toHaveBeenCalledWith('/tasks');
    });
  
    it('should continue deletion even if analytics update fails', async () => {
      analyticsController.updateTaskDeletion.mockRejectedValue(new Error('Analytics error'));
      await deleteTaskController(req, res, next);
      // Expect analytics error logged (could spy on console.error if needed)
      expect(Task.findByIdAndDelete).toHaveBeenCalledWith('task123');
      expect(req.flash).toHaveBeenCalledWith('success', 'Task deleted successfully!');
      expect(res.redirect).toHaveBeenCalledWith('/tasks');
    });
  });
  
  describe('removeTaskImageController', () => {
    let req, res, next, fakeTask;
  
    beforeEach(() => {
      req = {
        params: { id: 'task123', imgId: 'img1' },
        user: { _id: 'user123' },
        flash: jest.fn()
      };
      res = { redirect: jest.fn() };
      next = jest.fn();
  
      // Fake task with images.
      fakeTask = {
        _id: 'task123',
        images: [
          { filename: 'img1', url: 'url1' },
          { filename: 'img2', url: 'url2' }
        ],
        save: jest.fn().mockResolvedValue()
      };
  
      Task.findById.mockResolvedValue(fakeTask);
      // Mock cloudinary uploader.
      cloudinary.uploader = {
        destroy: jest.fn().mockResolvedValue()
      };
      // Mock History instance.
      History.mockImplementation(() => {
        return { save: jest.fn().mockResolvedValue() };
      });
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should flash error and redirect if task not found', async () => {
      Task.findById.mockResolvedValue(null);
      await removeTaskImageController(req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'Task not found!');
      expect(res.redirect).toHaveBeenCalledWith('/tasks');
    });
  
    it('should flash error if image is not found', async () => {
      req.params.imgId = 'nonexistent';
      await removeTaskImageController(req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'Image not found');
      expect(res.redirect).toHaveBeenCalledWith('/tasks/task123/edit');
    });
  
    it('should remove the image, update task, create history, and flash success', async () => {
      await removeTaskImageController(req, res, next);
      // Verify Cloudinary destroy was called with the image filename.
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('img1');
      // Verify that the image was removed from task.images.
      expect(fakeTask.images).toEqual([{ filename: 'img2', url: 'url2' }]);
      // Verify task.save() was called.
      expect(fakeTask.save).toHaveBeenCalled();
      // Verify that a History entry was created.
      expect(History).toHaveBeenCalled();
      const historyInstance = History.mock.results[0].value;
      expect(historyInstance.save).toHaveBeenCalled();
      // Verify flash and redirect.
      expect(req.flash).toHaveBeenCalledWith('success', 'Image removed successfully');
      expect(res.redirect).toHaveBeenCalledWith('/tasks/task123/edit');
    });
});