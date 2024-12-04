const express = require('express');
const router = express.Router();
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const passport = require('passport');
const { storeReturnTo } = require('../middleware');

// Render the registration form
router.get('/register', (req, res) => { 
    res.render('users/register');
});

// Handle user registration
router.post('/register', catchAsync(async (req, res, next) => {
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
}));

// Render the login form
router.get('/login', (req, res) => {
    res.render('users/login');
});

// Handle user login
router.post(
    '/login', storeReturnTo,
    passport.authenticate('local', {
        failureFlash: true,
        failureRedirect: '/login',
    }),
    (req, res, next) => {
        req.flash('success', 'Welcome back!');
        const redirectUrl = res.locals.returnTo || '/tasks';
        delete req.session.returnTo; //delete the returnto Storage in session after doing it's job
        res.redirect(redirectUrl);
    }
);

router.get('/logout', (req, res) => {
    req.logout((err) => { // using Passport.js
        if (err) {
            return next(err);
        }
        req.flash('success', 'You have successfully logged out!');
        res.redirect('/login'); // Redirect to login or another page
    });
})

router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('users/profile', { user });
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('users/dashboard', { user });
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
module.exports = router;
