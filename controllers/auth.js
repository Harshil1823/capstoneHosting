const User = require('../models/user');

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

module.exports = { authRegisterController }