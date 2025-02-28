const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const Task = require('../models/tasks');
const Department = require('../models/department');
const { taskSchema } = require('../schemas');
const { isLoggedin, isAuthor, isManager} = require('../middleware');
const { storage, cloudinary } = require('../cloudinary');
const multer = require('multer');
const upload = multer({ storage });
const History = require('../models/history');
const Analytics = require('../models/analytics');
const analyticsController = require('../controllers/analytics');

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
    const tasks = await Task.find({ company: req.user.company, completed : false });

    // Add analytics tracking for task views
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Analytics.findOneAndUpdate(
        { 
            company: req.user.company,
            date: { $gte: today }
        },
        { $inc: { 'dailyStats.tasksViewed': 1 } },
        { upsert: true }
    );

    res.render('tasks/index', { tasks });
}));

// Get completed tasks (only tasks that are marked as completed)
router.get('/completed', isLoggedin, catchAsync(async (req, res) => {
    // Filter tasks for the logged-in user's company and where completed is true
    const tasks = await Task.find({ company: req.user.company, completed: true });
    res.render('tasks/index', { tasks , filterTitle: 'Completed Tasks'});
}));

// Get tasks assigned to the logged-in user
router.get('/assigned', isLoggedin, catchAsync(async (req, res) => {
    // Filter tasks for the logged-in user's company that are assigned to them
    const tasks = await Task.find({ company: req.user.company, assignedTo: req.user._id });
    res.render('tasks/index', { tasks, filterTitle: 'Tasks Assigned to You'  });
}));

router.get('/overdue', isLoggedin, isManager, async(req, res) => {
    try {
        const currentDate = new Date(); // Get current date
        const overdueTasks = await Task.find({ 
            company: req.user.company, // Only fetch tasks for the user's company
            dueDate: { $lt: currentDate }, // Due date is in the past
            completed: false // Exclude completed tasks
        });

        res.render('tasks/index', { tasks: overdueTasks, filterTitle: 'Overdue Tasks' });
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
    const users = await User.find({ company : req.user.company });
    res.render('tasks/new', { departments, users });
}));

// Create a new task with validation
router.post('/', isLoggedin, upload.array('imageUrl'), validateTask, catchAsync(async (req, res, next) => {
    const { title, description, dueDate, importance, location, department, newDepartment, assignedTo } = req.body;
    if (req.body.assignedTo === '') {
        delete req.body.assignedTo;
    }
      
    let departmentId = department;

    if (departmentId === 'new' && newDepartment) {
        // Include the company reference from the logged-in user
        const newDepartmentEntry = new Department({ name: newDepartment, company: req.user.company });
        await newDepartmentEntry.save();
        departmentId = newDepartmentEntry._id;
    } else {
        // Look for a default department within the same company
        let defaultDepartment = await Department.findOne({ name: 'None', company: req.user.company });
        if (!defaultDepartment) {
            // If not found, create it with the company reference
            defaultDepartment = new Department({ name: 'None', company: req.user.company });
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

    // Add analytics tracking for task creation
    await analyticsController.updateTaskCreation(newTask);

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
    const task = await Task.findById(req.params.id).populate('department').populate('author');
    if (!task) {
        req.flash('error', 'Task not found!');
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
    const users = await User.find({ company : req.user.company });
    const task = await Task.findById(req.params.id);
    if (!task) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
    }
    const departments = await Department.find({});
    res.render('tasks/edit', { task, departments, users });
}));

// Update an existing task
router.put('/:id', isLoggedin, isAuthor, upload.array('imageUrl'), validateTask, catchAsync(async (req, res) => {
    let departmentId = req.body.department;

    // Add analytics tracking for task updates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await Analytics.findOneAndUpdate(
        { 
            company: req.user.company,
            date: { $gte: today }
        },
        { $inc: { 'dailyStats.tasksUpdated': 1 } },
        { upsert: true }
    );

    if (departmentId === 'new' && req.body.newDepartment.trim() !== '') {
        const newDepartment = new Department({
            name: req.body.newDepartment.trim(),
            company: req.user.company // Ensure company is set
        });
        await newDepartment.save();
        departmentId = newDepartment._id;
    } else {
        let defaultDepartment = await Department.findOne({ name: 'None', company: req.user.company });
        if (!defaultDepartment) {
            defaultDepartment = new Department({ name: 'None', company: req.user.company });
            await defaultDepartment.save();
        }
        departmentId = defaultDepartment._id;
    }
    
    // Capture the changes for history logging
    const oldTask = await Task.findById(req.params.id);
    let changes = new Map();
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

    Object.assign(task, taskData);
    await task.save();

    // Save the changes to the History model
    if (changes.size > 0) {
        const historyEntry = new History({
            task: req.params.id,
            changedBy: req.user._id,
            actionType: 'Update',  // Add this field
            changes: Array.from(changes.entries()).map(([field, newValue]) => ({
                field,
                newValue
            })),
            timestamp: new Date()
        });
        await historyEntry.save();
    }

    req.flash('success', 'Task updated successfully!');
    res.redirect(`/tasks/${req.params.id}`);
}));

//history for tasks route for manager and admin
router.get('/:id/history', isLoggedin, isManager, catchAsync(async (req, res) => {
    const History = require('../models/history');
    const historyLogs = await History.find({ task: req.params.id })
                                     .populate('changedBy', 'username')
                                     .sort({ timestamp: -1 });
    res.render('tasks/history', { historyLogs });
}));

// Mark task as completed
router.post('/:id/complete', isLoggedin, isAuthor, catchAsync(async (req, res) => {
    const task = await Task.findById(req.params.id);
    const newStatus = !task.completed;
    
    // Add analytics tracking for task completion
    if (newStatus) {
        await analyticsController.updateTaskCompletion(task);
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

        // Add analytics tracking for task deletion
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        await Analytics.findOneAndUpdate(
            { 
                company: req.user.company,
                date: { $gte: today }
            },
            { 
                $inc: { 
                    'dailyStats.tasksDeleted': 1,
                    [`departmentStats.${task.department}.deletionsCount`]: 1
                }
            },
            { upsert: true }
        );

        // Delete associated images from Cloudinary
        if (task.images && task.images.length > 0) {
            for (let img of task.images) {
                await cloudinary.uploader.destroy(img.filename);
            }
        }
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

module.exports = router;
module.exports.deleteHandler = deleteHandler;  // Export handler for testing