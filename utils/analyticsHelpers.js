const Analytics = require('../models/analytics');
const Department = require('../models/department');
const User = require('../models/user');

/**
 * Ensure an Analytics document exists for a company on a specific date
 * @param {ObjectId} companyId - The company ID
 * @param {Date} [date=new Date()] - The date (defaults to today)
 * @returns {Promise<Object>} The analytics document
 */
async function ensureAnalyticsExists(companyId, date = new Date()) {
    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    // Try to find existing analytics document
    let analytics = await Analytics.findOne({
        company: companyId,
        date: { $gte: normalizedDate, $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    // Create if it doesn't exist
    if (!analytics) {
        // Fetch all departments for this company
        const departments = await Department.find({ company: companyId });
        const departmentStats = departments.map(dept => ({
            department: dept._id,
            tasksCompleted: 0,
            tasksCreated: 0,
            modificationsCount: 0,
            deletionsCount: 0,
            averageCompletionTime: 0,
            overdueRate: 0
        }));
        
        // Fetch all users for this company
        const users = await User.find({ company: companyId });
        const userStats = users.map(user => ({
            user: user._id,
            tasksCompleted: 0,
            tasksCreated: 0,
            tasksAssigned: 0,
            averageCompletionTime: 0,
            overdueRate: 0,
            loginCount: 0
        }));
        
        // Create a new analytics document
        analytics = new Analytics({
            company: companyId,
            date: normalizedDate,
            departmentStats,
            userStats,
            // Initialize priority stats with default values
            priorityStats: {
                highPriority: { total: 0, completed: 0, averageCompletionTime: 0 },
                mediumPriority: { total: 0, completed: 0, averageCompletionTime: 0 },
                lowPriority: { total: 0, completed: 0, averageCompletionTime: 0 }
            }
        });
        
        await analytics.save();
    }
    
    return analytics;
}

/**
 * Get a normalized priority level
 * @param {string} importance - The importance/priority string from the task
 * @returns {string} Normalized priority level (high, medium, low)
 */
function getNormalizedPriority(importance) {
    if (!importance) return 'medium';
    
    const priority = importance.toLowerCase().replace(' priority', '');
    
    if (['high', 'medium', 'low'].includes(priority)) {
        return priority;
    }
    
    return 'medium'; // Default fallback
}

module.exports = {
    ensureAnalyticsExists,
    getNormalizedPriority
};