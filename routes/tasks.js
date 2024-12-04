// Import the express module to create a web server
const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
//getting the model acquired
const Task = require('../models/tasks')
const Department = require('../models/department'); 
const { taskSchema } = require('../schemas');
const { isLoggedin, isAuthor } = require('../middleware');
const { storage, cloudinary } = require('../cloudinary'); //node automatically looks for index.js file so no need to add it explicitly
const multer = require('multer');
const upload = multer( { storage }); // Or your desired configuration


// Middleware to validate tasks
const validateTask = (req, res, next) => {
    const { error } = taskSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const message = error.details.map((el) => el.message).join(', ');
      throw new ExpressError(message, 400);
    }
    next();
  };

router.get('/', isLoggedin, catchAsync(async (req, res) => {
    const tasks = await Task.find({});
    res.render('tasks/index', { tasks });
}))
  
router.get('/new', isLoggedin, catchAsync(async (req, res) => {
    const departments = await Department.find({});
    res.render('tasks/new', { departments });
}))
  
  //create a new task
  // Create a new task with validation
router.post('/', isLoggedin, upload.array('imageUrl'), validateTask, catchAsync(async (req, res, next) => {
    // Debugging: Log the parsed body and files
    console.log(req.body); // Contains text fields
    console.log(req.files); // Contains file uploads
    // Validate that the necessary fields are provided
    const { title, description, dueDate, importance, location, department, newDepartment } = req.body;
    
    // Check if required fields are missing
    if (!title || !description || !dueDate || !importance || !location) {
      // Throw an ExpressError with a 400 status code for bad request
      throw new ExpressError('Missing required fields: Title, Description, Due Date, Importance, and Location are required.', 400);
    }
  
    // Extract the selected department ID or "new" if the user chose "Other"
    let departmentId = department;
  
    // If "Other" is selected and a new department name is provided, create a new department
    if (departmentId === 'new' && newDepartment) {
      const newDepartmentEntry = new Department({ name: newDepartment });
      await newDepartmentEntry.save();
      departmentId = newDepartmentEntry._id; // Use the new department ID
    } else {
      // Create or find a default "None" department
      let defaultDepartment = await Department.findOne({ name: 'None' });
      if (!defaultDepartment) {
        defaultDepartment = new Department({ name: 'None' });
        await defaultDepartment.save();
      }
      departmentId = defaultDepartment._id;
    }
    
    const taskData = {
      title,
      description,
      dueDate,
      importance,
      location,
      department: departmentId,
      author: req.user._id, // Add the logged-in user's ID here
      images: req.files?.length
      ? req.files.map(f => ({ url: f.path, filename: f.filename }))
      : []
    };

    //for debugging
    console.log(taskData);
    
    // Create and save the new task
    const newTask = new Task(taskData);
    await newTask.save();
    req.flash('success', 'Task created successfully!');
    res.redirect(`/tasks/${newTask._id}`);
}));
  
  
router.get('/:id', isLoggedin, catchAsync(async (req, res) => {
    const task = await Task.findById(req.params.id).populate('department').populate('author'); // Populates the department field
    if (!task) {
      req.flash('error', 'Task not found!');
      res.redirect('/tasks')
    }
    res.render('tasks/show', { task });
}))
  
  
router.get('/:id/edit', isLoggedin, isAuthor, catchAsync(async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) {
      req.flash('error', 'Task not found!');
      res.redirect('/tasks')
    }
    const departments = await Department.find({}); // Fetch all departments
    res.render('tasks/edit', { task, departments });
}))
  
router.put('/:id', isLoggedin, isAuthor, upload.array('imageUrl'), validateTask, catchAsync(async (req, res) => {
    let departmentId = req.body.department;
    // If "Other" is selected and no new department name is provided, set a default
    if (departmentId === 'new') {
      if (req.body.newDepartment && req.body.newDepartment.trim() !== '') {
        const newDepartment = new Department({ name: req.body.newDepartment.trim() });
        await newDepartment.save();
        departmentId = newDepartment._id; // Use the new department ID
      } else {
        // Create or find a default "None" department
        let defaultDepartment = await Department.findOne({ name: 'None' });
        if (!defaultDepartment) {
          defaultDepartment = new Department({ name: 'None' });
          await defaultDepartment.save();
        }
        departmentId = defaultDepartment._id;
      }
    }
    const taskData = {
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      importance: req.body.importance,
      location: req.body.location,
      department: departmentId,
    };
    
    const task = await Task.findById(req.params.id);

    // Append new images to the existing array
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(f => ({ url: f.path, filename: f.filename }));
        task.images.push(...newImages);
    }

    // Update other task data
    Object.assign(task, taskData);
    await task.save();

    req.flash('success', 'Task updated successfully!')
    res.redirect(`/tasks/${req.params.id}`);
}))
  
  
//this is for marking the task as completed 
router.post('/:id/complete', isLoggedin, isAuthor, catchAsync(async (req, res) => {
    const { id } = req.params;
    await Task.findByIdAndUpdate(id, { completed: true });
    res.redirect(`/tasks/${id}`);
  }))
  
router.delete('/:id', isLoggedin, isAuthor, catchAsync(async(req, res) => {
    const { id } = req.params;
    // Find the task and its images
    const task = await Task.findById(id);

    if (!task) {
      req.flash('error', 'Task not found!');
      return res.redirect('/tasks');
    }
    // Delete associated images from Cloudinary
    if (task.images && task.images.length > 0) {
      for (let img of task.images) {
          await cloudinary.uploader.destroy(img.filename); // Uses Cloudinary filename
      }
    }
    await Task.findByIdAndDelete(id);
    req.flash('success', 'Task deleted successfully!')
    res.redirect('/tasks');
}))

module.exports = router;