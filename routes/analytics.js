const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const { isLoggedin, isManager } = require('../middleware');
const Analytics = require('../models/analytics');
const Task = require('../models/tasks');

// Get overall company analytics dashboard
router.get('/', isLoggedin, isManager, catchAsync(async (req, res) => {
    const analytics = await Analytics.findOne({ 
        company: req.user.company,
        date: { $gte: new Date().setHours(0,0,0,0) }
    })
    .populate('departmentStats.department')
    .populate('userStats.user', 'username');
    
    // need to figure out which page will be rendered for the overall analytics
    res.render('analytics/company_overview', { analytics });
}));

// Get department-specific analytics
router.get('/departments', isLoggedin, isManager, catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = {
        company: req.user.company
    };

    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const departmentAnalytics = await Analytics.find(query)
        .populate('departmentStats.department')
        .select('departmentStats date');
    
    // need to figure out which page will be rendered for the department analytics
    res.render('analytics/department_stats', { departmentAnalytics });
}));

// Get user performance analytics
router.get('/users', isLoggedin, isManager, catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = {
        company: req.user.company
    };

    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const userAnalytics = await Analytics.find(query)
        .populate('userStats.user', 'username firstName lastName')
        .select('userStats date');

    // need to figure out which page will be rendered for the users analytics
    res.render('analytics/user_performance', { userAnalytics });
}));

// Get priority-based analytics
router.get('/priorities', isLoggedin, isManager, catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = {
        company: req.user.company
    };

    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const priorityAnalytics = await Analytics.find(query)
        .select('priorityStats date');

    // need to figure out which page will be rendered for the priority based analytics
    res.render('analytics/task_priority', { priorityAnalytics });
}));

// Export analytics data (CSV/PDF)
router.get('/export', isLoggedin, isManager, catchAsync(async (req, res) => {
    const { format, startDate, endDate } = req.query;
    const query = {
        company: req.user.company,
        date: {
            $gte: new Date(startDate || new Date().setDate(new Date().getDate() - 30)),
            $lte: new Date(endDate || new Date())
        }
    };

    const analytics = await Analytics.find(query)
        .populate('departmentStats.department')
        .populate('userStats.user', 'username');

    if (format === 'csv') {
        // Generate CSV
        const csv = generateCSV(analytics);
        res.header('Content-Type', 'text/csv');
        res.attachment('analytics.csv');
        return res.send(csv);
    } else if (format === 'pdf') {
        // Generate PDF
        const pdf = await generatePDF(analytics);
        res.header('Content-Type', 'application/pdf');
        res.attachment('analytics.pdf');
        return res.send(pdf);
    }

    res.status(400).json({ error: 'Invalid export format' });
}));

// Get real-time analytics updates (for live dashboard)
router.get('/real-time', isLoggedin, isManager, catchAsync(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const realTimeStats = await Analytics.findOne({
        company: req.user.company,
        date: { $gte: today }
    })
    .select('dailyStats');

    res.json(realTimeStats);
}));

// Get custom date range analytics
router.post('/custom-range', isLoggedin, isManager, catchAsync(async (req, res) => {
    const { startDate, endDate, metrics } = req.body;
    
    const customAnalytics = await Analytics.find({
        company: req.user.company,
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).select(metrics.join(' '));

    res.json(customAnalytics);
}));

router.get('/dashboard', isLoggedin, async (req, res) => {
    try {
        const companyId = req.user.company;
        const analytics = await Analytics.findOne({ company: companyId });

        if (!analytics) {
            return res.render('users/dashboard', { analytics: null });
        }

        res.render('users/dashboard', { analytics });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.redirect('/tasks');
    }
});


// Helper function to generate CSV
function generateCSV(analytics) {
    // need to figure out library to use
    // for the CSV generation
}

// Helper function to generate PDF
async function generatePDF(analytics) {
    // need to figure our library to use
    // for the pdf generation
}

module.exports = router;