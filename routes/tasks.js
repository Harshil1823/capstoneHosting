const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const Task = require('../models/tasks');
const Department = require('../models/department');
const { taskSchema } = require('../schemas');
const { isLoggedin, isAuthor, isManager, ensureAdminOrManager } = require('../middleware');
const { storage, cloudinary } = require('../cloudinary');
const multer = require('multer');
const upload = multer({ storage });
const History = require('../models/history');
const Analytics = require('../models/analytics');
const analyticsController = require('../controllers/analytics');
const Notification = require('../models/notification');

// Middleware to validate tasks
const validateTask = (req, res, next) => {
    const { error } = taskSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const message = error.details.map((el) => el.message).join(', ');
        throw new ExpressError(message, 400);
    }
    next();
};

// Get all tasks
router.get('/', isLoggedin, catchAsync(async (req, res) => {
    // Only find tasks for the logged-in user's company:
    const tasks = await Task.find({ company: req.user.company, completed: false })
                        .populate('assignedTo', 'username');

    // Add analytics tracking for task views
    try {
        const analytics = await analyticsController.ensureAnalyticsExists(req.user.company);
        analytics.dailyStats.tasksViewed += 1;
        await analytics.save();
    } catch (error) {
        console.error('Error tracking task view:', error);
    }

    res.render('tasks/index', { tasks,  currentPage: 'tasks' });
}));

// Get completed tasks (only tasks that are marked as completed)
router.get('/completed', isLoggedin, catchAsync(async (req, res) => {
    // Filter tasks for the logged-in user's company and where completed is true
    const tasks = await Task.find({ company: req.user.company, completed: true })
                        .populate('assignedTo', 'username');
    res.render('tasks/index', { tasks, filterTitle: 'Completed Tasks', currentPage: 'completed' // Add this line
    });
}));

// Get tasks assigned to the logged-in user
router.get('/assigned', isLoggedin, catchAsync(async (req, res) => {
    // Filter tasks for the logged-in user's company that are assigned to them
    const tasks = await Task.find({ company: req.user.company, assignedTo: req.user._id, completed : false })
                        .populate('assignedTo', 'username');
    res.render('tasks/index', { tasks, filterTitle: 'Tasks Assigned to You', currentPage: 'assigned'});
}));

router.get('/overdue', isLoggedin, isManager, async(req, res) => {
    try {
        const currentDate = new Date(); // Get current date
        const overdueTasks = await Task.find({ 
            company: req.user.company, // Only fetch tasks for the user's company
            dueDate: { $lt: currentDate }, // Due date is in the past
            completed: false // Exclude completed tasks
        }).populate('assignedTo', 'username');

        res.render('tasks/index', { tasks: overdueTasks, filterTitle: 'Overdue Tasks', currentPage: 'overdue'});
    } catch (err) {
        console.log(err);
        res.redirect('/tasks');
    }
});

// Show form to create new task
router.get('/new', isLoggedin, catchAsync(async (req, res) => {
    // Only show departments for the user's company:
    const departments = await Department.find({ company: req.user.company });
    //retrieve all users in the same company
    const User = require('../models/user');
    const users = await User.find({ company: req.user.company });
    res.render('tasks/new', { departments, users });
}));

// Create a new task with validation
router.post('/', isLoggedin, upload.array('imageUrl'), validateTask, catchAsync(async (req, res, next) => {
    const { title, description, dueDate, importance, location, department, newDepartment, assignedTo } = req.body;
    if (req.body.assignedTo === '') {
        delete req.body.assignedTo;
    }

    let departmentId = department;

    if (departmentId === 'new') {
        if (newDepartment && newDepartment.trim() !== '') {
            // Check if a department with this name already exists for this company
            const existingDepartment = await Department.findOne({ 
                name: newDepartment.trim(), 
                company: req.user.company 
            });
            
            if (existingDepartment) {
                // If department already exists, use its ID instead of creating a new one
                departmentId = existingDepartment._id;
            } else {
                // Create new department only if it doesn't already exist
                const newDepartmentEntry = new Department({ 
                    name: newDepartment.trim(), 
                    company: req.user.company 
                });
                await newDepartmentEntry.save();
                departmentId = newDepartmentEntry._id;
            }
        } else {
            // If they selected "Other" but didn't provide a name, use the default department
            let defaultDepartment = await Department.findOne({ 
                name: 'None', 
                company: req.user.company 
            });
            if (!defaultDepartment) {
                defaultDepartment = new Department({ 
                    name: 'None', 
                    company: req.user.company 
                });
                await defaultDepartment.save();
            }
            departmentId = defaultDepartment._id;
        }
    } else if (!departmentId || departmentId === '') {
        // Handle empty department selection (existing logic)
        let defaultDepartment = await Department.findOne({ 
            name: 'None', 
            company: req.user.company 
        });
        if (!defaultDepartment) {
            defaultDepartment = new Department({ 
                name: 'None', 
                company: req.user.company 
            });
            await defaultDepartment.save();
        }
        departmentId = defaultDepartment._id;
    }

    // If an assigned user is provided, verify they belong to the same company
    let assignedToId = null;
    if (assignedTo) {
      const User = require('../models/user');
      const assignee = await User.findById(assignedTo);
      if (!assignee || assignee.company.toString() !== req.user.company.toString()) {
          throw new ExpressError('Invalid assignee: User does not belong to your company.', 403);
      }
      assignedToId = assignee._id;
    }

    const taskData = {
        title,
        description,
        dueDate: new Date(dueDate),
        importance,
        location,
        department: departmentId,
        author: req.user._id,
        company: req.user.company,
        assignedTo: assignedToId,  // either null or the valid user ID
        images: req.files?.length
            ? req.files.map(f => ({ url: f.path, filename: f.filename }))
            : []
    };

    const newTask = new Task(taskData);
    await newTask.save();

    // Only create a notification if there's an assigned user
    if (assignedToId) {
        const notification = new Notification({
            user: assignedToId,
            message: `You have been assigned a new task: ${taskData.title}`,
        });
        await notification.save();
    }
   
    // Add analytics tracking for task creation with improved controller
    try {
        await analyticsController.updateTaskCreation(newTask);
    } catch (error) {
        console.error('Error tracking task creation:', error);
    }

    //log creation for history
    const historyEntry = new History({
        task: newTask._id,
        changedBy: req.user._id,
        actionType: 'Create',
        changes: [{
          field: 'Task Created',
          newValue: `Initial version by ${req.user.username}`
        }]
    });
    await historyEntry.save();

    req.flash('success', 'Task created successfully!');
    res.redirect(`/tasks/${newTask._id}`);
}));

// Show a specific task
router.get('/:id', isLoggedin, catchAsync(async (req, res) => {
    const task = await Task.findById(req.params.id)
                          .populate('department')
                          .populate('author', 'username')
                          .populate('assignedTo', 'username');
    
    if (!task) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
    }
    
    // Verify task belongs to user's company
    if (task.company.toString() !== req.user.company.toString()) {
        req.flash('error', 'You do not have permission to view this task.');
        return res.redirect('/tasks');
    }
    
    const Comment = require('../models/comment');
    const comments = await Comment.find({ task: req.params.id })
                                  .populate('author', 'username')
                                  .sort({ createdAt: 1 }); // oldest first
    res.render('tasks/show', { task, comments });
}));

// Show form to edit a task
router.get('/:id/edit', isLoggedin, isAuthor, catchAsync(async (req, res) => {
    //retrieve all users in the same company
    const User = require('../models/user');
    const users = await User.find({ company: req.user.company });
    const task = await Task.findById(req.params.id);
    if (!task) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
    }
    const departments = await Department.find({ company: req.user.company });
    res.render('tasks/edit', { task, departments, users });
}));

// Update an existing task
router.put('/:id', isLoggedin, isAuthor, upload.array('imageUrl'), validateTask, catchAsync(async (req, res) => {
    // Capture the old task for comparison in analytics
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
    }

    let departmentId = req.body.department;

    if (departmentId === 'new') {
        if (req.body.newDepartment && req.body.newDepartment.trim() !== '') {
            // Check if a department with this name already exists for this company
            const existingDepartment = await Department.findOne({ 
                name: req.body.newDepartment.trim(), 
                company: req.user.company 
            });
            
            if (existingDepartment) {
                // If department already exists, use its ID instead of creating a new one
                departmentId = existingDepartment._id;
            } else {
                // Create new department only if it doesn't already exist
                const newDepartmentEntry = new Department({ 
                    name: req.body.newDepartment.trim(), 
                    company: req.user.company 
                });
                await newDepartmentEntry.save();
                departmentId = newDepartmentEntry._id;
            }
        } else {
            // If they selected "Other" but didn't provide a name, use the default department
            let defaultDepartment = await Department.findOne({ 
                name: 'None', 
                company: req.user.company 
            });
            if (!defaultDepartment) {
                defaultDepartment = new Department({ 
                    name: 'None', 
                    company: req.user.company 
                });
                await defaultDepartment.save();
            }
            departmentId = defaultDepartment._id;
        }
    } else if (!departmentId || departmentId === '') {
        // Handle empty department selection
        let defaultDepartment = await Department.findOne({ 
            name: 'None', 
            company: req.user.company 
        });
        if (!defaultDepartment) {
            defaultDepartment = new Department({ 
                name: 'None', 
                company: req.user.company 
            });
            await defaultDepartment.save();
        }
        departmentId = defaultDepartment._id;
    }
    
    // Capture the changes for history logging
    const changes = new Map();
    // Check fields that should be tracked
    const fields = ['title', 'description', 'dueDate', 'importance', 'location', 'department'];
    fields.forEach(field => {
        // Convert both values to strings for comparison (dates to ISO strings)
        let oldVal = oldTask[field] ? oldTask[field].toString() : '';
        let newVal = req.body[field] ? req.body[field].toString() : '';
        if (field === 'dueDate') {
            oldVal = oldTask.dueDate.toISOString();
            newVal = new Date(req.body.dueDate).toISOString();
        }
        if (oldVal !== newVal) {
            changes.set(field, newVal);
        }
    });

    // Validate assignedTo if provided in edit as well
    let assignedToId = null;
    if (req.body.assignedTo) {
      const User = require('../models/user');
      const assignee = await User.findById(req.body.assignedTo);
      if (!assignee || assignee.company.toString() !== req.user.company.toString()) {
          throw new ExpressError('Invalid assignee: User does not belong to your company.', 403);
      }
      assignedToId = assignee._id;
    }
    const taskData = {
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        importance: req.body.importance,
        location: req.body.location,
        department: departmentId,
        company: req.user.company,
        assignedTo: assignedToId  // update if provided
    };

    const task = await Task.findById(req.params.id);
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(f => ({ url: f.path, filename: f.filename }));
        task.images.push(...newImages);
    }

    // Update task with new data
    Object.assign(task, taskData);
    await task.save();

    // Track task modification in analytics
    try {
        await analyticsController.updateTaskModification(task, oldTask);
    } catch (error) {
        console.error('Error tracking task modification:', error);
    }

    // Save the changes to the History model
    if (changes.size > 0) {
        const historyEntry = new History({
            task: req.params.id,
            changedBy: req.user._id,
            actionType: 'Update',
            changes: Array.from(changes.entries()).map(([field, newValue]) => ({
                field,
                newValue
            })),
            timestamp: new Date()
        });
        await historyEntry.save();
    }
     // Create a notification if any changes were made and an assignee exists
     if (changes.size > 0 && assignedToId) {
        // Optionally, build a list of changed fields
        const changedFields = Array.from(changes.keys()).join(', ');
        const notificationMessage = `Task "${task.title}" has been updated (${changedFields}).`;
        const notification = new Notification({
            user: assignedToId,
            message: notificationMessage,
        });
        await notification.save();
    }
    // Check if the assigned user changed (or was newly assigned) compared to the old task
    if (assignedToId && (!oldTask.assignedTo || !oldTask.assignedTo.equals(assignedToId))) {
        const assignNotification = new Notification({
            user: assignedToId,
            message: `Task "${task.title}" has been assigned to you.`
        });
        await assignNotification.save();
    }

    req.flash('success', 'Task updated successfully!');
    res.redirect(`/tasks/${req.params.id}`);
}));

// History for tasks route for manager and admin
router.get('/:id/history', isLoggedin, isManager, catchAsync(async (req, res) => {
    const History = require('../models/history');
    const historyLogs = await History.find({ task: req.params.id })
                                     .populate('changedBy', 'username')
                                     .sort({ timestamp: -1 });
    res.render('tasks/history', { historyLogs });
}));

// Mark task as completed
router.post('/:id/complete', isLoggedin, catchAsync(async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) {
        req.flash('error', 'Task not found.');
        return res.redirect('/tasks');
    }

    const isAssignee = task.assignedTo && task.assignedTo.equals(req.user._id);

    // Check if current user has Admin or Manager role
    const hasAdminRights = req.user.role === 'Admin' || req.user.role === 'Manager';

    // Ensure only admin, manager, or assigned user can complete the task
    if (!isAssignee && !hasAdminRights) {
        req.flash('error', 'You do not have permission to complete this task.');
        return res.redirect(`/tasks/${req.params.id}`);
    }

    const newStatus = !task.completed;
    
    // Set or clear the completedAt timestamp based on completion status
    if (newStatus) {
        task.completedAt = new Date(); // Set completion date to now
        
        // Add analytics tracking for task completion with the completed date
        try {
            await analyticsController.updateTaskCompletion(task);
        } catch (error) {
            console.error('Error tracking task completion:', error);
        }
    } else {
        task.completedAt = null; // Clear completion date if task is reopened
    }
    
    // Log completion status change
    const historyEntry = new History({
        task: task._id,
        changedBy: req.user._id,
        actionType: 'Complete',
        changes: [{
            field: 'Status',
            oldValue: task.completed ? 'Completed' : 'Incomplete',
            newValue: newStatus ? 'Completed' : 'Incomplete'
        }]
    });
    
    task.completed = newStatus;
    await Promise.all([task.save(), historyEntry.save()]);

    // Create a notification for the assigned user if one exists
    if (task.assignedTo) {
        const notification = new Notification({
            user: task.author,
            message: `Task "${task.title}" has been marked as ${newStatus ? 'completed' : 'reopened'}.`
        });
        await notification.save();
    }
    
    req.flash('success', `Task marked as ${newStatus ? 'completed' : 'reopened'}!`);
    res.redirect(`/tasks/${req.params.id}`);
}));

// Task deletion handler (exported for testing)
async function deleteHandler(req, res, next) {
    try {
        const { id } = req.params;
        const task = await Task.findById(id);

        if (!task) {
            req.flash('error', 'Task not found!');
            return res.redirect('/tasks');
        }

        // Track task deletion in analytics
        try {
            await analyticsController.updateTaskDeletion(task);
        } catch (error) {
            console.error('Error tracking task deletion:', error);
        }

        // Delete associated images from Cloudinary
        if (task.images && task.images.length > 0) {
            for (let img of task.images) {
                await cloudinary.uploader.destroy(img.filename);
            }
        }
        
        // Delete associated history and task
        await History.deleteMany({ task: id });
        await Task.findByIdAndDelete(id);
        
        req.flash('success', 'Task deleted successfully!');
        res.redirect('/tasks');
    } catch (err) {
        next(err);
    }
}

// Delete a task
router.delete('/:id', isLoggedin, isAuthor, catchAsync(deleteHandler));

// Remove an image from a task
router.delete('/:id/images/:imgId', isLoggedin, isAuthor, catchAsync(async (req, res) => {
    const { id, imgId } = req.params;
    const task = await Task.findById(id);
    
    if (!task) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
    }
    
    // Find the image by filename
    const image = task.images.find(img => img.filename === imgId);
    if (image) {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(imgId);
        
        // Remove from task
        task.images = task.images.filter(img => img.filename !== imgId);
        await task.save();
        
        // Log image removal
        const historyEntry = new History({
            task: task._id,
            changedBy: req.user._id,
            actionType: 'Update',
            changes: [{
                field: 'Images',
                newValue: 'Removed an image'
            }]
        });
        await historyEntry.save();
        
        req.flash('success', 'Image removed successfully');
    } else {
        req.flash('error', 'Image not found');
    }
    
    res.redirect(`/tasks/${id}/edit`);
}));

module.exports = router;
module.exports.deleteHandler = deleteHandler;  // Export handler for testing