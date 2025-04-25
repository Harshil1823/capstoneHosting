const Company = require('../models/company');
const Analytics = require('../models/analytics');

// Utility function to generate a 6-digit company code
function generateCompanyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Utility function to generate a 4-digit store number
function generateStoreNumber() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// GET: Render the company creation form
exports.renderCompanyForm = (req, res) => {
    res.render('companies/new');
};

// POST: Create a new company
exports.createCompany = async (req, res) => {
    try {
        const { name, street, city, state, zipCode } = req.body;

        const code = generateCompanyCode();
        const storeNumber = generateStoreNumber();

        const company = new Company({
            name,
            address: { street, city, state, zipCode },
            code,
            storeNumber
        });

        await company.save();

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
            Please share this code only with your employees when creating their accounts.`);
        res.redirect(`/companies/${company._id}`);
    } catch (error) {
        console.log("caught error" + error)
        req.flash('error', 'Error creating company. Please try again.');
        res.redirect('/companies/new');
    }
};
