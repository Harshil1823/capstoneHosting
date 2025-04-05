// controllers/task.js
const Department = require('../models/department');
const Task = require('../models/tasks');
const Notification = require('../models/notification');
const History = require('../models/history');
const analyticsController = require('../controllers/analytics');
const ExpressError = require('../utils/ExpressError'); // Adjust path as needed
const cloudinary = require('../cloudinary');

async function createTaskController(req, res, next) {
    const { title, description, dueDate, importance, location, department, newDepartment, assignedTo } = req.body;
    
    // If assignedTo is an empty string, remove it.
    if (req.body.assignedTo === '') {
        delete req.body.assignedTo;
    }
      
    let departmentId = department;
  
    // If department is "new", create a new Department entry.
    if (departmentId === 'new' && newDepartment) {
        const newDepartmentEntry = new Department({ name: newDepartment, company: req.user.company });
        await newDepartmentEntry.save();
        departmentId = newDepartmentEntry._id;
    } else if (!departmentId || departmentId === '') {
        // Look for a default department ("None") in the company. Create one if not found.
        let defaultDepartment = await Department.findOne({ name: 'None', company: req.user.company });
        if (!defaultDepartment) {
            defaultDepartment = new Department({ name: 'None', company: req.user.company });
            await defaultDepartment.save();
        }
        departmentId = defaultDepartment._id;
    }
  
    // If an assigned user is provided, verify they belong to the same company.
    let assignedToId = null;
    if (assignedTo) {
        // Import User here so that it is only required when needed.
        const User = require('../models/user');
        const assignee = await User.findById(assignedTo);
        if (!assignee || assignee.company.toString() !== req.user.company.toString()) {
            throw new ExpressError('Invalid assignee: User does not belong to your company.', 403);
        }
        assignedToId = assignee._id;
    }
  
    // Build the task data.
    const taskData = {
        title,
        description,
        dueDate: new Date(dueDate),
        importance,
        location,
        department: departmentId,
        author: req.user._id,
        company: req.user.company,
        assignedTo: assignedToId,
        images: req.files && req.files.length
            ? req.files.map(f => ({ url: f.path, filename: f.filename }))
            : []
    };
  
    const newTask = new Task(taskData);
    await newTask.save();
  
    // Create a notification for the assignee.
    const notification = new Notification({
        user: assignedToId,
        message: `You have been assigned a new task: ${taskData.title}`,
    });
    await notification.save();
    
    // Track task creation in analytics (errors here are caught and logged only).
    try {
        await analyticsController.updateTaskCreation(newTask);
    } catch (error) {
        console.error('Error tracking task creation:', error);
    }
  
    // Log task creation history.
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
}
async function updateTaskController(req, res, next) {
    // Get the old task for comparison and error handling
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) {
      req.flash('error', 'Task not found!');
      return res.redirect('/tasks');
    }
  
    // Handle department selection/update
    let departmentId = req.body.department;
    if (departmentId === 'new' && req.body.newDepartment.trim() !== '') {
      const newDepartment = new Department({
        name: req.body.newDepartment.trim(),
        company: req.user.company
      });
      await newDepartment.save();
      departmentId = newDepartment._id;
    } else if (!departmentId || departmentId === '') {
      let defaultDepartment = await Department.findOne({ name: 'None', company: req.user.company });
      if (!defaultDepartment) {
        defaultDepartment = new Department({ name: 'None', company: req.user.company });
        await defaultDepartment.save();
      }
      departmentId = defaultDepartment._id;
    }
  
    // Capture changes for history logging
    const changes = new Map();
    const fields = ['title', 'description', 'dueDate', 'importance', 'location', 'department'];
    fields.forEach(field => {
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
  
    // Validate assignedTo if provided
    let assignedToId = null;
    if (req.body.assignedTo) {
      const User = require('../models/user');
      const assignee = await User.findById(req.body.assignedTo);
      if (!assignee || assignee.company.toString() !== req.user.company.toString()) {
        throw new ExpressError('Invalid assignee: User does not belong to your company.', 403);
      }
      assignedToId = assignee._id;
    }
  
    // Build update data
    const taskData = {
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      importance: req.body.importance,
      location: req.body.location,
      department: departmentId,
      company: req.user.company,
      assignedTo: assignedToId
    };
  
    // Fetch the task (again) to update images and data
    const task = await Task.findById(req.params.id);
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => ({ url: f.path, filename: f.filename }));
      task.images.push(...newImages);
    }
  
    // Merge new data into the task document and save
    Object.assign(task, taskData);
    await task.save();
  
    // Track modifications in analytics
    try {
      await analyticsController.updateTaskModification(task, oldTask);
    } catch (error) {
      console.error('Error tracking task modification:', error);
    }
  
    // Save changes history if any changes were made
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
  
    // If changes were made and an assignee exists, create a notification
    if (changes.size > 0 && assignedToId) {
      const changedFields = Array.from(changes.keys()).join(', ');
      const notificationMessage = `Task "${task.title}" has been updated (${changedFields}).`;
      const notification = new Notification({
        user: assignedToId,
        message: notificationMessage,
      });
      await notification.save();
    }
   // If the assigned user changed compared to the old task, create an assign notification
    if (
        assignedToId &&
        (
        !oldTask.assignedTo ||
        oldTask.assignedTo.toString() !== assignedToId.toString()
        )
    ) {
        const assignNotification = new Notification({
        user: assignedToId,
        message: `Task "${task.title}" has been assigned to you.`
        });
        await assignNotification.save();
    }
  
  
    req.flash('success', 'Task updated successfully!');
    res.redirect(`/tasks/${req.params.id}`);
}

async function completeTaskController(req, res, next) {
    const task = await Task.findById(req.params.id);
    if (!task) {
      req.flash('error', 'Task not found.');
      return res.redirect('/tasks');
    }
  
    // Compare assignedTo as strings (works for both ObjectIds and plain strings)
    const isAssignee =
      task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
  
    // Only admin, manager, or the assigned user may complete the task.
    if (!isAssignee && !req.user.isAdmin && !req.user.isManager) {
      req.flash('error', 'You do not have permission to complete this task.');
      return res.redirect(`/tasks/${req.params.id}`);
    }
  
    const newStatus = !task.completed;
  
    // If marking as completed, attempt to track analytics.
    if (newStatus) {
      try {
        await analyticsController.updateTaskCompletion(task);
      } catch (error) {
        console.error('Error tracking task completion:', error);
      }
    }
  
    // Log the change in status for history.
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
  
    // Toggle the completion status.
    task.completed = newStatus;
    await Promise.all([task.save(), historyEntry.save()]);
  
    // If the task has an assigned user, send a notification.
    if (task.assignedTo) {
      const notification = new Notification({
        user: task.author,
        message: `Task "${task.title}" has been marked as ${newStatus ? 'completed' : 'reopened'}.`
      });
      await notification.save();
    }
  
    req.flash('success', `Task marked as ${newStatus ? 'completed' : 'reopened'}!`);
    res.redirect(`/tasks/${req.params.id}`);
}

async function deleteTaskController(req, res, next) {
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
        console.log('Error tracking task deletion:');
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
  
  async function removeTaskImageController(req, res, next) {
    try {
      const { id, imgId } = req.params;
      const task = await Task.findById(id);
  
      if (!task) {
        req.flash('error', 'Task not found!');
        return res.redirect('/tasks');
      }
  
      // Find the image by filename
      const image = task.images.find(img => img.filename === imgId);
      if (image) {
        // Delete image from Cloudinary
        await cloudinary.uploader.destroy(imgId);
        
        // Remove the image from task and save
        task.images = task.images.filter(img => img.filename !== imgId);
        await task.save();
        
        // Log image removal in history
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
    } catch (err) {
      next(err);
    }
}
  
module.exports = { createTaskController, updateTaskController, completeTaskController, deleteTaskController, removeTaskImageController };
