const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const { isLoggedin, isManager } = require('../middleware');
const analyticsController = require('../controllers/analytics');
const Analytics = require('../models/analytics');

// Get overall company analytics dashboard
router.get('/', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Calculate pending tasks (created but not completed)
        const pendingTasks = analytics.dailyStats.tasksCreated - analytics.dailyStats.tasksCompleted;
        analytics.dailyStats.tasksPending = Math.max(0, pendingTasks);
        
        // Calculate completion rates for departments
        analytics.departmentStats.forEach(dept => {
            if (dept.tasksCreated > 0) {
                dept.completionRate = ((dept.tasksCompleted / dept.tasksCreated) * 100).toFixed(1);
                dept.tasksPending = Math.max(0, dept.tasksCreated - dept.tasksCompleted);
            } else {
                dept.completionRate = 0;
                dept.tasksPending = 0;
            }
        });
        
        // Calculate priority stats in the format expected by the chart
        const priorityAnalytics = {
            'High Priority': { total: analytics.priorityStats.highPriority.total },
            'Medium Priority': { total: analytics.priorityStats.mediumPriority.total },
            'Low Priority': { total: analytics.priorityStats.lowPriority.total }
        };
        
        res.render('analytics/company_overview', { 
            analytics, 
            priorityAnalytics,
            departmentAnalytics: analytics.departmentStats,
            userAnalytics: analytics.userStats
        });
    } catch (error) {
        console.error("Error loading analytics:", error);
        req.flash('error', 'Failed to load analytics dashboard');
        res.redirect('/tasks');
    }
}));

// Get department-specific analytics
router.get('/departments', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
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

        // Get analytics with populated references
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Process department stats
        const departmentAnalytics = analytics.departmentStats.map(dept => {
            return {
                department: dept.department,
                tasksCompleted: dept.tasksCompleted,
                tasksCreated: dept.tasksCreated,
                tasksPending: Math.max(0, dept.tasksCreated - dept.tasksCompleted),
                modificationsCount: dept.modificationsCount,
                deletionsCount: dept.deletionsCount,
                averageCompletionTime: dept.averageCompletionTime.toFixed(1),
                overdueRate: dept.overdueRate.toFixed(1)
            };
        });
        
        res.render('analytics/department_stats', { departmentAnalytics });
    } catch (error) {
        console.error("Error loading department analytics:", error);
        req.flash('error', 'Failed to load department analytics');
        res.redirect('/analytics');
    }
}));

// Get user performance analytics
router.get('/users', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
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

        // Get analytics with populated references
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Process user stats
        const userAnalytics = analytics.userStats.map(user => {
            return {
                user: user.user,
                tasksCompleted: user.tasksCompleted,
                tasksCreated: user.tasksCreated,
                tasksAssigned: user.tasksAssigned,
                completionRate: user.tasksAssigned > 0 
                    ? ((user.tasksCompleted / user.tasksAssigned) * 100).toFixed(1) 
                    : 0,
                averageCompletionTime: user.averageCompletionTime.toFixed(1),
                overdueRate: user.overdueRate.toFixed(1)
            };
        });
        
        res.render('analytics/user_performance', { userAnalytics });
    } catch (error) {
        console.error("Error loading user analytics:", error);
        req.flash('error', 'Failed to load user performance analytics');
        res.redirect('/analytics');
    }
}));

// Get priority-based analytics
router.get('/priorities', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
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

        // Get analytics with populated references
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Format priority stats for the chart
        const priorityAnalytics = {
            'High Priority': {
                total: analytics.priorityStats.highPriority.total,
                completed: analytics.priorityStats.highPriority.completed,
                pending: Math.max(0, analytics.priorityStats.highPriority.total - analytics.priorityStats.highPriority.completed),
                averageCompletionTime: analytics.priorityStats.highPriority.averageCompletionTime.toFixed(1)
            },
            'Medium Priority': {
                total: analytics.priorityStats.mediumPriority.total,
                completed: analytics.priorityStats.mediumPriority.completed,
                pending: Math.max(0, analytics.priorityStats.mediumPriority.total - analytics.priorityStats.mediumPriority.completed),
                averageCompletionTime: analytics.priorityStats.mediumPriority.averageCompletionTime.toFixed(1)
            },
            'Low Priority': {
                total: analytics.priorityStats.lowPriority.total,
                completed: analytics.priorityStats.lowPriority.completed,
                pending: Math.max(0, analytics.priorityStats.lowPriority.total - analytics.priorityStats.lowPriority.completed),
                averageCompletionTime: analytics.priorityStats.lowPriority.averageCompletionTime.toFixed(1)
            }
        };
        
        res.render('analytics/task_priority', { priorityAnalytics });
    } catch (error) {
        console.error("Error loading priority analytics:", error);
        req.flash('error', 'Failed to load priority analytics');
        res.redirect('/analytics');
    }
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
    try {
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Format data for real-time dashboard
        const realTimeStats = {
            dailyStats: analytics.dailyStats,
            priorityBreakdown: {
                labels: ['High', 'Medium', 'Low'],
                data: [
                    analytics.priorityStats.highPriority.total,
                    analytics.priorityStats.mediumPriority.total,
                    analytics.priorityStats.lowPriority.total
                ]
            },
            completionRate: analytics.dailyStats.tasksCreated > 0 
                ? ((analytics.dailyStats.tasksCompleted / analytics.dailyStats.tasksCreated) * 100).toFixed(1)
                : 0
        };
        
        res.json(realTimeStats);
    } catch (error) {
        console.error("Error loading real-time analytics:", error);
        res.status(500).json({ error: 'Failed to load real-time analytics' });
    }
}));

// Get custom date range analytics
router.post('/custom-range', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
        const { startDate, endDate, metrics } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        
        const query = {
            company: req.user.company,
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
        
        let projection = {};
        if (metrics && Array.isArray(metrics) && metrics.length > 0) {
            metrics.forEach(metric => {
                projection[metric] = 1;
            });
        }
        
        const analytics = await Analytics.find(query, projection)
            .populate('departmentStats.department')
            .populate('userStats.user', 'username');
        
        res.json(analytics);
    } catch (error) {
        console.error("Error loading custom range analytics:", error);
        res.status(500).json({ error: 'Failed to load custom range analytics' });
    }
}));

// User dashboard with analytics
router.get('/dashboard', isLoggedin, async (req, res) => {
    try {
        // Get analytics data
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Calculate pending tasks
        if (analytics && analytics.dailyStats) {
            analytics.dailyStats.tasksPending = Math.max(0, 
                (analytics.dailyStats.tasksCreated || 0) - (analytics.dailyStats.tasksCompleted || 0));
        }
        
        // Get user stats
        let userStats = null;
        if (analytics && analytics.userStats && req.user) {
            userStats = analytics.userStats.find(u => 
                u.user && u.user._id && u.user._id.toString() === req.user._id.toString()
            );
        }
        
        // Simply pass the full analytics object to the template
        res.render('users/dashboard', { analytics, userStats });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        // Render with null analytics on error
        res.render('users/dashboard', { analytics: null, userStats: null });
    }
});

// Helper function to generate CSV
function generateCSV(analytics) {
    // CSV generation implementation
    // This is a placeholder
    
    let csv = 'Date,Tasks Created,Tasks Completed,Tasks Overdue\n';
    analytics.forEach(day => {
        csv += `${day.date.toISOString().split('T')[0]},`;
        csv += `${day.dailyStats.tasksCreated},`;
        csv += `${day.dailyStats.tasksCompleted},`;
        csv += `${day.dailyStats.tasksOverdue || 0}\n`;
    });
    
    return csv;
}

// Helper function to generate PDF
async function generatePDF(analytics) {
    // PDF generation implementation
    // This is a placeholder
    
    // For now, we'll just return a simple error message
    throw new Error('PDF generation not yet implemented');
}
// routes for testing
router.get('/', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        res.json(analytics);
    } catch (error) {
        console.error("Error fetching full analytics:", error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
}));

// Get full analytics data for diagnostic purposes
router.get('/diagnostics', isLoggedin, isManager, catchAsync(async (req, res) => {
    try {
        // Get today's analytics for the company
        const analytics = await analyticsController.getTodayCompanyAnalytics(req.user.company);
        
        // Check if analytics exists
        if (!analytics) {
            return res.status(404).json({ 
                error: 'No analytics found for today',
                message: 'Ensure that analytics tracking is properly set up'
            });
        }
        
        // Comprehensive logging for diagnostics
        console.log('Diagnostic Analytics Retrieved:', {
            dailyStatsCount: analytics.dailyStats,
            departmentStatsCount: analytics.departmentStats.length,
            userStatsCount: analytics.userStats.length,
            priorityStatsDetails: analytics.priorityStats
        });
        
        // Send full analytics data
        res.json(analytics);
    } catch (error) {
        console.error("Error in diagnostics route:", error);
        res.status(500).json({ 
            error: 'Failed to fetch diagnostics',
            details: error.message,
            stack: error.stack
        });
    }
}));

// Render the diagnostic page
router.get('/test', isLoggedin, isManager, (req, res) => {
    res.render('analytics/diagnostics', { 
        layout: false
    });
});

module.exports = router;