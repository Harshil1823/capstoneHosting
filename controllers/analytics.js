const Analytics = require('../models/analytics');
const Task = require('../models/tasks');
const { ensureAnalyticsExists, getNormalizedPriority } = require('../utils/analyticsHelpers');

const analyticsController = {
    // Expose the ensure analytics exists function
    ensureAnalyticsExists,
    
    // Update analytics when a task is created
    async updateTaskCreation(task) {
        try {
            const analytics = await ensureAnalyticsExists(task.company);
            
            // Update daily stats
            analytics.dailyStats.tasksCreated += 1;
            
            // Update priority stats with normalized priority
            const priorityLevel = getNormalizedPriority(task.importance);
            const priorityKey = `${priorityLevel}Priority`;
            
            if (analytics.priorityStats[priorityKey]) {
                analytics.priorityStats[priorityKey].total += 1;
            }
            
            // Update department stats if department exists
            if (task.department) {
                const deptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );
                
                if (deptIndex >= 0) {
                    analytics.departmentStats[deptIndex].tasksCreated += 1;
                } else {
                    // Department not found in stats, add it
                    analytics.departmentStats.push({
                        department: task.department,
                        tasksCreated: 1,
                        tasksCompleted: 0,
                        modificationsCount: 0,
                        deletionsCount: 0,
                        averageCompletionTime: 0,
                        overdueRate: 0
                    });
                }
            }
            
            // Update creator stats if author exists
            if (task.author) {
                const userIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === task.author.toString()
                );
                
                if (userIndex >= 0) {
                    analytics.userStats[userIndex].tasksCreated += 1;
                } else {
                    // User not found in stats, add them
                    analytics.userStats.push({
                        user: task.author,
                        tasksCreated: 1,
                        tasksCompleted: 0,
                        tasksAssigned: 0,
                        averageCompletionTime: 0,
                        overdueRate: 0,
                        loginCount: 0
                    });
                }
            }
            
            // Update assignee stats if assigned
            if (task.assignedTo) {
                const assigneeIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === task.assignedTo.toString()
                );
                
                if (assigneeIndex >= 0) {
                    analytics.userStats[assigneeIndex].tasksAssigned += 1;
                } else {
                    // Assignee not found in stats, add them
                    analytics.userStats.push({
                        user: task.assignedTo,
                        tasksCreated: 0,
                        tasksCompleted: 0,
                        tasksAssigned: 1,
                        averageCompletionTime: 0,
                        overdueRate: 0,
                        loginCount: 0
                    });
                }
            }
            
            await analytics.save();
            return analytics;
        } catch (error) {
            console.error('Error in updateTaskCreation:', error);
            throw error;
        }
    },
    
// Update analytics when a task is completed
async updateTaskCompletion(task) {
    try {
        const analytics = await ensureAnalyticsExists(task.company);
        
        // Calculate completion time with validation
        let completionTime = 0;
        const completionDate = new Date(); // Capture the exact completion time
        
        if (task.createdAt && task.createdAt instanceof Date) {
            // Calculate hours between creation and completion
            completionTime = Math.max(0, (completionDate - task.createdAt) / (1000 * 60 * 60)); // hours
        }
        
        // Check if task is overdue
        const isOverdue = task.dueDate && new Date(task.dueDate) < completionDate;
        
        // Update daily stats
        analytics.dailyStats.tasksCompleted += 1;
        if (isOverdue) {
            analytics.dailyStats.tasksOverdue = (analytics.dailyStats.tasksOverdue || 0) + 1;
        }
        
        // Update average completion time for daily stats
        if (completionTime > 0) {
            const prevTasksCompleted = Math.max(0, analytics.dailyStats.tasksCompleted - 1);
            const prevTotalTime = (analytics.dailyStats.averageCompletionTime || 0) * prevTasksCompleted;
            
            // Recalculate average completion time
            analytics.dailyStats.averageCompletionTime = 
                prevTasksCompleted > 0 
                    ? (prevTotalTime + completionTime) / analytics.dailyStats.tasksCompleted 
                    : completionTime;
        }
        
        // Update department stats if department exists
        if (task.department) {
            const deptIndex = analytics.departmentStats.findIndex(
                d => d.department && d.department.toString() === task.department.toString()
            );
            
            if (deptIndex >= 0) {
                analytics.departmentStats[deptIndex].tasksCompleted += 1;
                
                // Update department completion time average
                if (completionTime > 0) {
                    const prevDeptCompleted = Math.max(0, analytics.departmentStats[deptIndex].tasksCompleted - 1);
                    const prevDeptTotal = (analytics.departmentStats[deptIndex].averageCompletionTime || 0) * prevDeptCompleted;
                    
                    // Recalculate department average completion time
                    analytics.departmentStats[deptIndex].averageCompletionTime = 
                        prevDeptCompleted > 0
                            ? (prevDeptTotal + completionTime) / analytics.departmentStats[deptIndex].tasksCompleted
                            : completionTime;
                }
                
                // Update department overdue rate correctly
                if (isOverdue) {
                    // Increment overdue count for this department (if not already tracked)
                    if (!analytics.departmentStats[deptIndex].overdueCount) {
                        analytics.departmentStats[deptIndex].overdueCount = 0;
                    }
                    analytics.departmentStats[deptIndex].overdueCount += 1;
                    
                    // Calculate actual percentage: (overdue tasks / completed tasks) * 100
                    const overdueCount = analytics.departmentStats[deptIndex].overdueCount;
                    const totalCompleted = analytics.departmentStats[deptIndex].tasksCompleted;
                    analytics.departmentStats[deptIndex].overdueRate = (overdueCount / totalCompleted) * 100;
                }
            }
        }
        
        // Update user stats if assignee exists
        if (task.assignedTo) {
            const userIndex = analytics.userStats.findIndex(
                u => u.user && u.user.toString() === task.assignedTo.toString()
            );
            
            if (userIndex >= 0) {
                analytics.userStats[userIndex].tasksCompleted += 1;
                
                // Update user completion time average
                if (completionTime > 0) {
                    const prevUserCompleted = Math.max(0, analytics.userStats[userIndex].tasksCompleted - 1);
                    const prevUserTotal = (analytics.userStats[userIndex].averageCompletionTime || 0) * prevUserCompleted;
                    
                    // Recalculate user average completion time
                    analytics.userStats[userIndex].averageCompletionTime = 
                        prevUserCompleted > 0
                            ? (prevUserTotal + completionTime) / analytics.userStats[userIndex].tasksCompleted
                            : completionTime;
                }
                
                // Update user overdue rate correctly
                if (isOverdue) {
                    // Increment overdue count for this user (if not already tracked)
                    if (!analytics.userStats[userIndex].overdueCount) {
                        analytics.userStats[userIndex].overdueCount = 0;
                    }
                    analytics.userStats[userIndex].overdueCount += 1;
                    
                    // Calculate actual percentage: (overdue tasks / completed tasks) * 100
                    const overdueCount = analytics.userStats[userIndex].overdueCount;
                    const totalCompleted = analytics.userStats[userIndex].tasksCompleted;
                    analytics.userStats[userIndex].overdueRate = (overdueCount / totalCompleted) * 100;
                }
            }
        }
        
        // Update priority stats
        const priorityLevel = getNormalizedPriority(task.importance);
        const priorityKey = `${priorityLevel}Priority`;
        
        if (analytics.priorityStats[priorityKey]) {
            analytics.priorityStats[priorityKey].completed += 1;
            
            // Update priority completion time average
            if (completionTime > 0) {
                const prevPriorityCompleted = Math.max(0, analytics.priorityStats[priorityKey].completed - 1);
                const prevPriorityTotal = (analytics.priorityStats[priorityKey].averageCompletionTime || 0) * prevPriorityCompleted;
                
                // Recalculate priority average completion time
                analytics.priorityStats[priorityKey].averageCompletionTime = 
                    prevPriorityCompleted > 0
                        ? (prevPriorityTotal + completionTime) / analytics.priorityStats[priorityKey].completed
                        : completionTime;
            }
        }
        
        await analytics.save();
        return analytics;
    } catch (error) {
        console.error('Error in updateTaskCompletion:', error);
        throw error;
    }
},
    
    // Update analytics when a task is updated
    async updateTaskModification(task, oldTask) {
        try {
            const analytics = await ensureAnalyticsExists(task.company);
            
            // Update daily stats
            analytics.dailyStats.tasksUpdated += 1;
            
            // Update department stats if department exists
            if (task.department) {
                const deptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );
                
                if (deptIndex >= 0) {
                    analytics.departmentStats[deptIndex].modificationsCount += 1;
                }
            }
            
            // If department changed, update stats for both old and new departments
            if (oldTask && oldTask.department && task.department &&
                oldTask.department.toString() !== task.department.toString()) {
                
                const oldDeptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === oldTask.department.toString()
                );
                
                if (oldDeptIndex >= 0) {
                    // Decrement task count for old department
                    analytics.departmentStats[oldDeptIndex].tasksCreated = 
                        Math.max(0, analytics.departmentStats[oldDeptIndex].tasksCreated - 1);
                }
                
                const newDeptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );
                
                if (newDeptIndex >= 0) {
                    // Increment task count for new department
                    analytics.departmentStats[newDeptIndex].tasksCreated += 1;
                }
            }
            
            // If assignee changed, update stats for both old and new assignees
            if (oldTask && oldTask.assignedTo && task.assignedTo &&
                oldTask.assignedTo.toString() !== task.assignedTo.toString()) {
                
                const oldUserIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === oldTask.assignedTo.toString()
                );
                
                if (oldUserIndex >= 0) {
                    // Decrement assigned count for old assignee
                    analytics.userStats[oldUserIndex].tasksAssigned = 
                        Math.max(0, analytics.userStats[oldUserIndex].tasksAssigned - 1);
                }
                
                const newUserIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === task.assignedTo.toString()
                );
                
                if (newUserIndex >= 0) {
                    // Increment assigned count for new assignee
                    analytics.userStats[newUserIndex].tasksAssigned += 1;
                } else {
                    // New assignee not found in stats, add them
                    analytics.userStats.push({
                        user: task.assignedTo,
                        tasksCreated: 0,
                        tasksCompleted: 0,
                        tasksAssigned: 1,
                        averageCompletionTime: 0,
                        overdueRate: 0,
                        loginCount: 0
                    });
                }
            }
            
            // If priority changed, update priority stats
            if (oldTask && oldTask.importance !== task.importance) {
                const oldPriorityLevel = getNormalizedPriority(oldTask.importance);
                const oldPriorityKey = `${oldPriorityLevel}Priority`;
                
                const newPriorityLevel = getNormalizedPriority(task.importance);
                const newPriorityKey = `${newPriorityLevel}Priority`;
                
                if (analytics.priorityStats[oldPriorityKey]) {
                    // Decrement old priority total
                    analytics.priorityStats[oldPriorityKey].total = 
                        Math.max(0, analytics.priorityStats[oldPriorityKey].total - 1);
                }
                
                if (analytics.priorityStats[newPriorityKey]) {
                    // Increment new priority total
                    analytics.priorityStats[newPriorityKey].total += 1;
                }
            }
            
            await analytics.save();
            return analytics;
        } catch (error) {
            console.error('Error in updateTaskModification:', error);
            throw error;
        }
    },
    
    // Update analytics when a task is deleted
    async updateTaskDeletion(task) {
        try {
            const analytics = await ensureAnalyticsExists(task.company);
            
            // Update daily stats
            analytics.dailyStats.tasksDeleted += 1;
            
            // Update department stats if department exists
            if (task.department) {
                const deptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );
                
                if (deptIndex >= 0) {
                    analytics.departmentStats[deptIndex].deletionsCount += 1;
                    
                    // Decrement task count for the department
                    analytics.departmentStats[deptIndex].tasksCreated = 
                        Math.max(0, analytics.departmentStats[deptIndex].tasksCreated - 1);
                }
            }
            
            // Update priority stats
            const priorityLevel = getNormalizedPriority(task.importance);
            const priorityKey = `${priorityLevel}Priority`;
            
            if (analytics.priorityStats[priorityKey]) {
                // Decrement priority total
                analytics.priorityStats[priorityKey].total = 
                    Math.max(0, analytics.priorityStats[priorityKey].total - 1);
            }
            
            await analytics.save();
            return analytics;
        } catch (error) {
            console.error('Error in updateTaskDeletion:', error);
            throw error;
        }
    },
    
    // Get analytics for a specific company with date range filtering
    async getCompanyAnalytics(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const query = {
                company: req.user?.company // Use optional chaining to avoid errors if req.user is undefined
            };
            
            // Validate that company exists before querying
            if (!query.company) {
                return res.status(400).json({ error: 'Company ID is required' });
            }
            
            // Add date filtering if provided
            if (startDate && endDate) {
                query.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            
            // Use try/catch specific to the database operation
            let analytics;
            try {
                analytics = await Analytics.find(query)
                    .populate('departmentStats.department')
                    .populate('userStats.user', 'username firstName lastName');
                
                // Check if analytics were found
                if (!analytics || analytics.length === 0) {
                    // If no analytics found, create a default one
                    const defaultAnalytics = await ensureAnalyticsExists(query.company);
                    analytics = [defaultAnalytics];
                }
            } catch (dbError) {
                console.error('Database error in getCompanyAnalytics:', dbError);
                return res.status(500).json({ error: 'Failed to fetch analytics from database' });
            }
            
            return res.json(analytics); // Make sure to return the response
        } catch (error) {
            console.error('Error in getCompanyAnalytics:', error);
            return res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    },
    
    // Get today's analytics for a specific company (for dashboard)
    async getTodayCompanyAnalytics(companyId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let analytics = await Analytics.findOne({
                company: companyId,
                date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
            })
            .populate({
                path: 'departmentStats.department',
                model: 'Department' // Make sure this matches your model name exactly
            })
            .populate('userStats.user', 'username firstName lastName')
            .exec();
            
            if (!analytics) {
                analytics = await ensureAnalyticsExists(companyId);
                analytics = await Analytics.findById(analytics._id)
                .populate({
                    path: 'departmentStats.department',
                    model: 'Department' // Make sure this matches your model name exactly
                })
                .populate('userStats.user', 'username firstName lastName')
                .exec();
            }
            // Debug to see if population worked
            console.log('Department population check:', 
                analytics.departmentStats.map(d => ({
                    id: d.department && d.department._id ? d.department._id : 'Not populated',
                    name: d.department && d.department.name ? d.department.name : 'No name property'
                }))
            );
            
            return analytics;
        } catch (error) {
            console.error('Error in getTodayCompanyAnalytics:', error);
            throw error;
        }
    },
    
    // Get analytics for a specific user
    async getUserAnalytics(userId, companyId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const analytics = await Analytics.findOne({
                company: companyId,
                date: { $gte: today },
                'userStats.user': userId
            });
            
            return analytics?.userStats?.find(stat => 
                stat.user.toString() === userId.toString()
            ) || {
                tasksCompleted: 0,
                tasksCreated: 0,
                tasksAssigned: 0,
                averageCompletionTime: 0,
                overdueRate: 0,
                loginCount: 0
            };
        } catch (error) {
            console.error('Error in getUserAnalytics:', error);
            throw error;
        }
    },
    
    // Get analytics for a specific department
    async getDepartmentAnalytics(departmentId, companyId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const analytics = await Analytics.findOne({
                company: companyId,
                date: { $gte: today },
                'departmentStats.department': departmentId
            });
            
            return analytics?.departmentStats?.find(stat => 
                stat.department.toString() === departmentId.toString()
            ) || {
                tasksCompleted: 0,
                tasksCreated: 0,
                modificationsCount: 0,
                deletionsCount: 0,
                averageCompletionTime: 0,
                overdueRate: 0
            };
        } catch (error) {
            console.error('Error in getDepartmentAnalytics:', error);
            throw error;
        }
    }
};

module.exports = analyticsController;