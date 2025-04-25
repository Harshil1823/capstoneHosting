const Analytics = require('../models/analytics');
const Task = require('../models/tasks');
const Department = require('../models/department');
const User = require('../models/user');
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
    
    // ipdate analytics when a task is completed
    async updateTaskCompletion(task) {
        try {
            const analytics = await ensureAnalyticsExists(task.company);            
            let completionTime = 0;
            const completionDate = new Date();

            if (task.createdAt && task.createdAt instanceof Date) {
                completionTime = Math.max(0, (completionDate - task.createdAt) / (1000 * 60 * 60)); // hours
            }
            
            // Check if task is overdue
            const isOverdue = task.dueDate && new Date(task.dueDate) < completionDate;
            
            // update daily stats
            analytics.dailyStats.tasksCompleted += 1;
            if (isOverdue) {
                analytics.dailyStats.tasksOverdue = (analytics.dailyStats.tasksOverdue || 0) + 1;
            }
            
            // update average completion time for daily stats
            if (completionTime > 0) {
                const prevTasksCompleted = Math.max(0, analytics.dailyStats.tasksCompleted - 1);
                const prevTotalTime = (analytics.dailyStats.averageCompletionTime || 0) * prevTasksCompleted;
                
                // recalculate average completion time
                analytics.dailyStats.averageCompletionTime = 
                    prevTasksCompleted > 0 
                        ? (prevTotalTime + completionTime) / analytics.dailyStats.tasksCompleted 
                        : completionTime;
            }
            
            // update department stats if department exists
            if (task.department) {
                const deptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );
                
                if (deptIndex >= 0) {
                    analytics.departmentStats[deptIndex].tasksCompleted += 1;
                    
                    // update department completion time average
                    if (completionTime > 0) {
                        const prevDeptCompleted = Math.max(0, analytics.departmentStats[deptIndex].tasksCompleted - 1);
                        const prevDeptTotal = (analytics.departmentStats[deptIndex].averageCompletionTime || 0) * prevDeptCompleted;
                        
                        // recalculate department average completion time
                        analytics.departmentStats[deptIndex].averageCompletionTime = 
                            prevDeptCompleted > 0
                                ? (prevDeptTotal + completionTime) / analytics.departmentStats[deptIndex].tasksCompleted
                                : completionTime;
                    }
                    
                    // update department overdue rate correctly
                    if (isOverdue) {
                        // increment overdue count for this department (if not already tracked)
                        if (!analytics.departmentStats[deptIndex].overdueCount) {
                            analytics.departmentStats[deptIndex].overdueCount = 0;
                        }
                        analytics.departmentStats[deptIndex].overdueCount += 1;
                        
                        // calculate actual percentage: (overdue tasks / completed tasks) * 100
                        const overdueCount = analytics.departmentStats[deptIndex].overdueCount;
                        const totalCompleted = analytics.departmentStats[deptIndex].tasksCompleted;
                        analytics.departmentStats[deptIndex].overdueRate = (overdueCount / totalCompleted) * 100;
                    }
                }
            }
            
            // update user stats if assignee exists
            if (task.assignedTo) {
                const userIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === task.assignedTo.toString()
                );
                
                if (userIndex >= 0) {
                    analytics.userStats[userIndex].tasksCompleted += 1;
                    
                    // update user completion time average
                    if (completionTime > 0) {
                        const prevUserCompleted = Math.max(0, analytics.userStats[userIndex].tasksCompleted - 1);
                        const prevUserTotal = (analytics.userStats[userIndex].averageCompletionTime || 0) * prevUserCompleted;
                        
                        // recalculate user average completion time
                        analytics.userStats[userIndex].averageCompletionTime = 
                            prevUserCompleted > 0
                                ? (prevUserTotal + completionTime) / analytics.userStats[userIndex].tasksCompleted
                                : completionTime;
                    }
                    
                    // update user overdue rate correctly
                    if (isOverdue) {
                        // increment overdue count for this user (if not already tracked)
                        if (!analytics.userStats[userIndex].overdueCount) {
                            analytics.userStats[userIndex].overdueCount = 0;
                        }
                        analytics.userStats[userIndex].overdueCount += 1;
                        
                        // calculate actual percentage: (overdue tasks / completed tasks) * 100
                        const overdueCount = analytics.userStats[userIndex].overdueCount;
                        const totalCompleted = analytics.userStats[userIndex].tasksCompleted;
                        analytics.userStats[userIndex].overdueRate = (overdueCount / totalCompleted) * 100;
                    }
                }
            }
            
            // update priority stats
            const priorityLevel = getNormalizedPriority(task.importance);
            const priorityKey = `${priorityLevel}Priority`;
            
            if (analytics.priorityStats[priorityKey]) {
                analytics.priorityStats[priorityKey].completed += 1;
                
                // update priority completion time average
                if (completionTime > 0) {
                    const prevPriorityCompleted = Math.max(0, analytics.priorityStats[priorityKey].completed - 1);
                    const prevPriorityTotal = (analytics.priorityStats[priorityKey].averageCompletionTime || 0) * prevPriorityCompleted;
                    
                    // recalculate priority average completion time
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
            // First, ensure we have a current analytics document
            const analytics = await ensureAnalyticsExists(companyId);
            
            // Get all tasks for this company
            const allTasks = await Task.find({ company: companyId });
            
            // Count tasks by status
            const tasksCreated = allTasks.length;
            const tasksCompleted = allTasks.filter(task => task.completed).length;
            const tasksDeleted = analytics.dailyStats.tasksDeleted || 0; // Keep this from analytics since deleted tasks are removed from DB
            
            // Count overdue tasks
            const now = new Date();
            const tasksOverdue = allTasks.filter(task => 
                !task.completed && task.dueDate && task.dueDate < now
            ).length;
            
            // Update daily stats with accurate counts
            analytics.dailyStats.tasksCreated = tasksCreated;
            analytics.dailyStats.tasksCompleted = tasksCompleted;
            analytics.dailyStats.tasksOverdue = tasksOverdue;
            
            // Get all departments for this company
            const departments = await Department.find({ company: companyId });
            
            // Reset department stats array to avoid duplicates
            analytics.departmentStats = [];
            
            // Process each department
            for (const dept of departments) {
                const deptTasks = allTasks.filter(task => 
                    task.department && task.department.toString() === dept._id.toString()
                );
                
                const deptTasksCreated = deptTasks.length;
                const deptTasksCompleted = deptTasks.filter(task => task.completed).length;
                const deptTasksOverdue = deptTasks.filter(task => 
                    !task.completed && task.dueDate && task.dueDate < now
                ).length;
                
                // Calculate overdue rate
                const overdueRate = deptTasksCompleted > 0 
                    ? (deptTasksOverdue / deptTasksCompleted) * 100 
                    : 0;
                
                // Add department stats
                analytics.departmentStats.push({
                    department: dept._id,
                    tasksCreated: deptTasksCreated,
                    tasksCompleted: deptTasksCompleted,
                    modificationsCount: 0, // Reset to avoid double counting
                    deletionsCount: 0,     // Reset to avoid double counting
                    overdueCount: deptTasksOverdue,
                    averageCompletionTime: 0, // Will calculate this separately
                    overdueRate: overdueRate
                });
            }
            
            // Count tasks by priority
            const highPriorityTasks = allTasks.filter(task => task.importance === 'High Priority');
            const mediumPriorityTasks = allTasks.filter(task => task.importance === 'Medium Priority');
            const lowPriorityTasks = allTasks.filter(task => task.importance === 'Low Priority');
            
            // Update priority stats
            analytics.priorityStats = {
                highPriority: {
                    total: highPriorityTasks.length,
                    completed: highPriorityTasks.filter(task => task.completed).length,
                    averageCompletionTime: 0 // Will calculate this separately
                },
                mediumPriority: {
                    total: mediumPriorityTasks.length,
                    completed: mediumPriorityTasks.filter(task => task.completed).length,
                    averageCompletionTime: 0 // Will calculate this separately
                },
                lowPriority: {
                    total: lowPriorityTasks.length,
                    completed: lowPriorityTasks.filter(task => task.completed).length,
                    averageCompletionTime: 0 // Will calculate this separately
                }
            };
            
            // Get all users for this company
            const users = await User.find({ company: companyId });
            
            // Reset user stats array to avoid duplicates
            analytics.userStats = [];
            
            // Process each user
            for (const user of users) {
                const userTasksCreated = allTasks.filter(task => 
                    task.author && task.author.toString() === user._id.toString()
                ).length;
                
                const userTasksAssigned = allTasks.filter(task => 
                    task.assignedTo && task.assignedTo.toString() === user._id.toString()
                ).length;
                
                const userTasksCompleted = allTasks.filter(task => 
                    task.assignedTo && 
                    task.assignedTo.toString() === user._id.toString() && 
                    task.completed
                ).length;
                
                // Add user stats
                analytics.userStats.push({
                    user: user._id,
                    tasksCreated: userTasksCreated,
                    tasksCompleted: userTasksCompleted,
                    tasksAssigned: userTasksAssigned,
                    averageCompletionTime: 0, // Will calculate this separately
                    overdueRate: 0,          // Will calculate this separately
                    loginCount: 0            // Will track this separately
                });
            }
            
            // Save updated analytics
            await analytics.save();
            
            // Return populated analytics
            return await Analytics.findById(analytics._id)
                .populate({
                    path: 'departmentStats.department',
                    model: 'Department'
                })
                .populate('userStats.user', 'username firstName lastName')
                .exec();
                
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