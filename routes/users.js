const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Company = require('../models/company');
const catchAsync = require('../utils/catchAsync');
const passport = require('passport');
const { storeReturnTo } = require('../middleware');
const { isLoggedin } = require('../middleware');
const multer = require('multer');
const { storage, cloudinary } = require('../cloudinary');
const upload = multer({ storage }); // Moved after storage import
const Task = require('../models/tasks'); // Added missing Task model import
const Analytics = require('../models/analytics');
const analyticsController = require('../controllers/analytics');

// Add isAdmin middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  }
  req.flash('error', 'Access denied: Only admins can perform this action.');
  return res.redirect('/profile');
};

// Render the registration form
router.get('/register', (req, res) => { 
    res.render('users/register');
});

// Handle user registration
router.post('/register', catchAsync(async (req, res, next) => {
    const { username, companyCode, workEmail, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match! Try again.');
        return res.redirect('/register');
    }
    // Check if a user with this workEmail already exists
    const existingUser = await User.findOne({ workEmail });
    if (existingUser) {
        req.flash('error', 'User already registered. You are already associated with a company.');
        return res.redirect('/login');
    }
    // Find the company by the company code
    const company = await Company.findOne({ code: companyCode });
    if (!company) {
      req.flash('error', 'Invalid company code. Please check with your administrator.');
      return res.redirect('/register');
    }

    const newUser = new User({ username, workEmail, company: company._id });
    const registeredUser = await User.register(newUser, password);

    // Initialize user analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Analytics.findOneAndUpdate(
        { 
            company: company._id,
            date: { $gte: today }
        },
        { 
            $push: { 
                userStats: {
                    user: registeredUser._id,
                    tasksCompleted: 0,
                    averageCompletionTime: 0,
                    overdueRate: 0
                }
            }
        },
        { upsert: true }
    );

    req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash('success', 'Welcome to our page!');
        res.redirect('/tasks');
    });
}));

// Render the login form
router.get('/login', (req, res) => {
    res.render('users/login');
});

// Handle user login
router.post(
    '/login', 
    storeReturnTo,
    passport.authenticate('local', {
        failureFlash: true,
        failureRedirect: '/login',
    }),
    catchAsync(async (req, res, next) => {
        // Track user login in analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await Analytics.findOneAndUpdate(
            { 
                company: req.user.company,
                date: { $gte: today }
            },
            { 
                $inc: { 'dailyStats.userLogins': 1 }
            },
            { upsert: true }
        );

        req.flash('success', 'Welcome back!');
        const redirectUrl = res.locals.returnTo || '/tasks';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    })
);

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You have successfully logged out!');
        res.redirect('/login');
    });
});

router.get('/profile', isLoggedin, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('departments')
        .populate('company');
    
    // Get task statistics
    const tasks = await Task.find({ 
        assignedTo: req.user._id,
        company: req.user.company 
    });

    // Get user analytics data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const analytics = await Analytics.findOne({
        company: req.user.company,
        date: { $gte: today }
    });

    const userStats = analytics?.userStats?.find(
        stat => stat.user && stat.user.toString() === req.user._id.toString()
    ) || {
        tasksCompleted: 0,
        averageCompletionTime: 0,
        overdueRate: 0
    };

    const taskStats = {
        total: tasks.length,
        completed: tasks.filter(task => task.completed).length,
        pending: tasks.filter(task => !task.completed).length,
        overdue: tasks.filter(task => 
            !task.completed && 
            new Date(task.dueDate) < new Date()
        ).length,
        averageCompletionTime: userStats.averageCompletionTime,
        overdueRate: userStats.overdueRate
    };

    // Calculate completion rate
    taskStats.completionRate = taskStats.total > 0 
        ? Math.round((taskStats.completed / taskStats.total) * 100) 
        : 0;

    // Get recent tasks
    const recentTasks = await Task.find({ 
        assignedTo: req.user._id,
        company: req.user.company 
    })
    .sort({ dueDate: -1 })
    .limit(5);

    // Get historical performance data
    const lastWeekAnalytics = await Analytics.find({
        company: req.user.company,
        date: { 
            $gte: new Date(today - 7 * 24 * 60 * 60 * 1000),
            $lt: today
        },
        'userStats.user': req.user._id
    }).sort({ date: 1 });

    // Get detailed analytics from controller (if available)
    let detailedAnalytics = null;
    try {
        if (analyticsController && typeof analyticsController.getUserAnalytics === 'function') {
            detailedAnalytics = await analyticsController.getUserAnalytics(req.user._id, req.user.company);
        }
    } catch (error) {
        console.error('Error fetching detailed analytics:', error);
    }

    res.render('users/profile', { 
        user, 
        taskStats, 
        recentTasks,
        analytics: userStats,
        detailedAnalytics: detailedAnalytics || userStats,
        historicalAnalytics: lastWeekAnalytics
    });
}));

// Add profile photo upload route
router.post('/profile', isLoggedin, upload.single('profileImage'), catchAsync(async (req, res) => {
    console.log('Profile upload route hit');
    
    if (!req.file) {
        console.log('No file selected');
        req.flash('error', 'No file selected');
        return res.redirect('/profile');
    }
    
    console.log('File uploaded:', req.file);
    console.log('File path:', req.file.path);
    
    try {
        // Delete old image if it exists
        if (req.user.profileImage && req.user.profileImage.filename) {
            console.log('Deleting old image:', req.user.profileImage.filename);
            await cloudinary.uploader.destroy(req.user.profileImage.filename);
        }
        
        // Update user with new profile image
        const updateData = {
            profileImage: {
                url: req.file.path,
                filename: req.file.filename
            }
        };
        
        console.log('Updating user with:', updateData);
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id, 
            updateData,
            { new: true }
        );
        
        console.log('User updated:', updatedUser._id);
        console.log('New profile image:', updatedUser.profileImage);
        
        // Track profile update in analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await Analytics.findOneAndUpdate(
            { 
                company: req.user.company,
                date: { $gte: today }
            },
            { 
                $inc: { 'dailyStats.profileUpdates': 1 }
            },
            { upsert: true }
        );
        
        req.flash('success', 'Profile photo updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile image:', error);
        req.flash('error', 'Error updating profile image: ' + error.message);
        res.redirect('/profile');
    }
}));

router.get('/dashboard', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
 
        // Get user's analytics data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const analytics = await Analytics.findOne({
            company: user.company,
            date: { $gte: today }
        });
 
        console.log("analytics", analytics);
 
        res.render('users/dashboard', {
            user,
            analytics: analytics || {
                dailyStats: {
                    tasksCompleted: 0,
                    tasksPending: 0,
                    tasksOverdue: 0,
                    totalTasks: 0,
                    tasksDeleted: 0
                },
                departmentStats: [],
                priorityStats: [],
                userStats: []
            }
        });
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});
 

router.get('/messages', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('users/messages', { user });
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

router.get('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('users/settings', { user });
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

// Update profile information - Modified to restrict non-admin users
router.put('/profile', isLoggedin, upload.single('profileImage'), catchAsync(async (req, res) => {
    const { firstName, lastName, workEmail, phoneNumber } = req.body;
    
    // Only allow admins to change email
    if (req.user.role !== 'Admin') {
        // Non-admins can only update name and phone
        const updateData = {
            firstName,
            lastName,
            phoneNumber
        };

        // Handle profile image upload
        if (req.file) {
            // Delete old image if it exists
            if (req.user.profileImage?.filename) {
                await cloudinary.uploader.destroy(req.user.profileImage.filename);
            }
            updateData.profileImage = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        const user = await User.findByIdAndUpdate(
            req.user._id, 
            updateData,
            { new: true, runValidators: true }
        );

        // Track profile update in analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await Analytics.findOneAndUpdate(
            { 
                company: req.user.company,
                date: { $gte: today }
            },
            { 
                $inc: { 'dailyStats.profileUpdates': 1 }
            },
            { upsert: true }
        );

        req.flash('success', 'Profile updated successfully');
        return res.redirect('/profile');
    }
    
    // Admin can update all fields
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workEmail)) {
        req.flash('error', 'Invalid email format');
        return res.redirect('/profile');
    }

    // Check if email is already used
    const existingUser = await User.findOne({ 
        workEmail, 
        _id: { $ne: req.user._id } 
    });
    
    if (existingUser) {
        req.flash('error', 'Email address is already in use');
        return res.redirect('/profile');
    }

    const updateData = {
        firstName,
        lastName,
        workEmail,
        phoneNumber
    };

    // Handle profile image upload
    if (req.file) {
        // Delete old image if it exists
        if (req.user.profileImage?.filename) {
            await cloudinary.uploader.destroy(req.user.profileImage.filename);
        }
        updateData.profileImage = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    const user = await User.findByIdAndUpdate(
        req.user._id, 
        updateData,
        { new: true, runValidators: true }
    );

    // Track profile update in analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Analytics.findOneAndUpdate(
        { 
            company: req.user.company,
            date: { $gte: today }
        },
        { 
            $inc: { 'dailyStats.profileUpdates': 1 }
        },
        { upsert: true }
    );

    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
}));

// Change password route
router.post('/change-password', isLoggedin, catchAsync(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (newPassword !== confirmPassword) {
        req.flash('error', 'New passwords do not match');
        return res.redirect('/profile');
    }

    try {
        const user = await User.findById(req.user._id);
        await user.changePassword(currentPassword, newPassword);

        // Track password change in analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await Analytics.findOneAndUpdate(
            { 
                company: req.user.company,
                date: { $gte: today }
            },
            { 
                $inc: { 'dailyStats.passwordChanges': 1 }
            },
            { upsert: true }
        );

        req.flash('success', 'Password changed successfully');
        res.redirect('/profile');
    } catch (err) {
        req.flash('error', 'Current password is incorrect');
        res.redirect('/profile');
    }
}));

// Add routes for admin to manage users
router.get('/admin/users', isLoggedin, isAdmin, catchAsync(async (req, res) => {
    const users = await User.find({ company: req.user.company });
    res.render('users/admin-users', { users });
}));

router.get('/admin/users/:id', isLoggedin, isAdmin, catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id).populate('company');
    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }
    
    // Ensure admin only sees users from their company
    if (user.company._id.toString() !== req.user.company.toString()) {
        req.flash('error', 'Access denied: User not in your company');
        return res.redirect('/admin/users');
    }
    
    res.render('users/admin-edit', { user });
}));

router.put('/admin/users/:id', isLoggedin, isAdmin, upload.single('profileImage'), catchAsync(async (req, res) => {
    const { firstName, lastName, workEmail, phoneNumber, role } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }
    
    // Ensure admin only modifies users from their company
    if (user.company.toString() !== req.user.company.toString()) {
        req.flash('error', 'Access denied: User not in your company');
        return res.redirect('/admin/users');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workEmail)) {
        req.flash('error', 'Invalid email format');
        return res.redirect(`/admin/users/${user._id}`);
    }

    // Check if email is already used
    const existingUser = await User.findOne({ 
        workEmail, 
        _id: { $ne: user._id } 
    });
    
    if (existingUser) {
        req.flash('error', 'Email address is already in use');
        return res.redirect(`/admin/users/${user._id}`);
    }

    const updateData = {
        firstName,
        lastName,
        workEmail,
        phoneNumber
    };
    
    // Only allow role changes if valid role
    if (['Admin', 'Manager', 'Employee'].includes(role)) {
        updateData.role = role;
    }

    // Handle profile image upload
    if (req.file) {
        // Delete old image if it exists
        if (user.profileImage?.filename) {
            await cloudinary.uploader.destroy(user.profileImage.filename);
        }
        updateData.profileImage = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    await User.findByIdAndUpdate(user._id, updateData);
    
    req.flash('success', 'User updated successfully');
    res.redirect('/admin/users');
}));

router.get('/debug-profile', isLoggedin, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({
        id: user._id,
        username: user.username,
        profileImage: user.profileImage || null,
        hasProfileImage: !!user.profileImage,
        profileImageUrl: user.profileImage?.url || null,
        environmentVars: {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Not set",
            apiKey: process.env.CLOUDINARY_KEY ? "Set" : "Not set",
            apiSecret: process.env.CLOUDINARY_SECRET ? "Set" : "Not set"
        }
    });
}));
module.exports = router;