const User = require('../models/user');
const Analytics = require('../models/analytics');
const cloudinary = require('../cloudinary'); // adjust the path if needed

async function authRegisterController (req, res, next) {
    const { username, companyName, workEmail, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match! Try again.');
        return res.redirect('/register');
    }
    const newUser = new User({ username, companyName, workEmail });
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash('success', 'Welcome to our page!');
        res.redirect('/tasks');
    });
}

function renderLoginForm(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/tasks');
    }
    res.render('users/login');
}

function logoutController(req, res, next) {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You have successfully logged out!');
        res.redirect('/login');
    });
}

async function authLoginController(req, res, next) {
    // Track user login in analytics.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
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
    } catch (error) {
        return next(error);
    }

    req.flash('success', 'Welcome back!');
    const redirectUrl = res.locals.returnTo || '/tasks';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}
async function uploadProfilePhotoController(req, res, next) {
    // No file provided
    if (!req.file) {
        console.log('No file selected');
        req.flash('error', 'No file selected');
        return res.redirect('/profile');
    }

    try {
        // Delete old image if it exists
        if (req.user.profileImage && req.user.profileImage.filename) {
            await cloudinary.uploader.destroy(req.user.profileImage.filename);
        }

        // Prepare update data with the new image info
        const updateData = {
            profileImage: {
                url: req.file.path,
                filename: req.file.filename
            }
        };

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
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
        req.flash('success', 'Profile photo updated successfully');
        res.redirect('/profile');
    } catch (error) {
        req.flash('error', 'Error updating profile image: ' + error.message);
        res.redirect('/profile');
    }
}
async function updateProfileController(req, res, next) {
    const { firstName, lastName, workEmail, phoneNumber } = req.body;
    
    // Non-admin users: update name and phone (and optionally, profile image)
    if (req.user.role !== 'Admin') {
        const updateData = { firstName, lastName, phoneNumber };

        // If a file is uploaded, handle image update
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

        await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });

        // Track profile update in analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await Analytics.findOneAndUpdate(
            { company: req.user.company, date: { $gte: today } },
            { $inc: { 'dailyStats.profileUpdates': 1 } },
            { upsert: true }
        );

        req.flash('success', 'Profile updated successfully');
        return res.redirect('/profile');
    }
    
    // Admin users: they can update all fields including email.
    // Validate email format.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workEmail)) {
        req.flash('error', 'Invalid email format');
        return res.redirect('/profile');
    }

    // Check if email is already used by another user.
    const existingUser = await User.findOne({ workEmail, _id: { $ne: req.user._id } });
    if (existingUser) {
        req.flash('error', 'Email address is already in use');
        return res.redirect('/profile');
    }

    const updateData = { firstName, lastName, workEmail, phoneNumber };

    // If a file is uploaded, handle image update.
    if (req.file) {
        if (req.user.profileImage?.filename) {
            await cloudinary.uploader.destroy(req.user.profileImage.filename);
        }
        updateData.profileImage = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });

    // Track profile update in analytics.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Analytics.findOneAndUpdate(
        { company: req.user.company, date: { $gte: today } },
        { $inc: { 'dailyStats.profileUpdates': 1 } },
        { upsert: true }
    );

    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
}
async function changePasswordController(req, res, next) {
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
}
async function updateAdminUserController(req, res, next) {
    const { firstName, lastName, workEmail, phoneNumber, role, hireDate } = req.body;
    
    // Find the user to update
    const user = await User.findById(req.params.id);
    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }
    
    // Create update data with explicit date conversion
    const updateData = {
        firstName,
        lastName,
        workEmail,
        phoneNumber,
        hireDate: hireDate ? new Date(hireDate) : null,
        role: ['Admin', 'Manager', 'Employee'].includes(role) ? role : user.role
    };
    
    // Update the user record
    const updatedUser = await User.findByIdAndUpdate(
        user._id, 
        updateData,
        { new: true } // Return updated document
    );    
    req.flash('success', 'User updated successfully');
    res.redirect('/admin/users');
}

module.exports = { authRegisterController, renderLoginForm, 
    authLoginController, logoutController, uploadProfilePhotoController, updateProfileController, changePasswordController,
    updateAdminUserController}