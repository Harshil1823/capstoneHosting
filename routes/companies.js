const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const Company = require('../models/company');
// Middleware to check if the user is logged in and is an admin
const { isLoggedin, isAuthor } = require('../middleware');
const Analytics = require('../models/analytics');

//this function generates a 6 digit code that will be displayed
// to the user
function generateCompanyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Utility function to generate a random 4-digit store number
// to esentially have unique store numbers within our system at same address
function generateStoreNumber() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// GET route to display the company creation form
router.get('/new',(req, res) => {
    res.render('companies/new'); // Renders the companies/new.ejs view
});

// POST route to create a new company
router.post('/', catchAsync(async (req, res) => {
    const { name, street, city, state, zipCode } = req.body;

    //generate a company code to give to the user
    const code = generateCompanyCode();
    const storeNumber = generateStoreNumber();

    //for debugging
    //console.log('Generated company code:', code);
    //console.log('Generated store number:', storeNumber);
    // Create a new company using the provided data and generated code
    // Create a new company using the provided data and generated values
    const company = new Company({
        name,
        address: { street, city, state, zipCode },
        code,
        storeNumber
    });
    //console.log('Company object before saving:', company);
    await company.save();
    //console.log('Company saved:', company);

    // Initialize analytics for the new company
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Analytics.create({
        company: company._id,
        date: today,
        dailyStats: {
            tasksCreated: 0,
            tasksCompleted: 0,
            tasksOverdue: 0,
            tasksViewed: 0,
            tasksUpdated: 0,
            userLogins: 0
        },
        departmentStats: [],
        userStats: [],
        priorityStats: {
            highPriority: { total: 0, completed: 0, averageCompletionTime: 0 },
            mediumPriority: { total: 0, completed: 0, averageCompletionTime: 0 },
            lowPriority: { total: 0, completed: 0, averageCompletionTime: 0 }
        }
    });

    req.flash('success', `Company created successfully! The company code is ${code}. 
        Please share this code only with your employees when creating there accounts.`);
    // Redirect to a page that shows the company details (or you could render a view directly)
    res.redirect(`/companies/${company._id}`);
}));

router.get('/:id', catchAsync(async (req, res) => {
    //console.log('Fetching company with ID:', req.params.id);
    const company = await Company.findById(req.params.id);
    //console.log('Query result:', company);
    if (!company) {
        req.flash('error', 'Company not found!');
        return res.redirect('/companies/new');
    }

    // Fetch company analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const analytics = await Analytics.findOne({
        company: company._id,
        date: { $gte: today }
    }).populate('departmentStats.department');

    res.render('companies/show', { 
        company,
        analytics: analytics || {
            dailyStats: {
                tasksCreated: 0,
                tasksCompleted: 0,
                tasksOverdue: 0,
                tasksViewed: 0,
                tasksUpdated: 0,
                userLogins: 0
            }
        }
    });
}));

module.exports = router;