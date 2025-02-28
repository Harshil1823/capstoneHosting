const Analytics = require('../models/analytics');
const Task = require('../models/tasks');

const analyticsController = {
    // Update analytics when a task is created
    async updateTaskCreation(task) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let analytics = await Analytics.findOne({
                company: task.company,
                date: { $gte: today }
            });

            if (!analytics) {
                analytics = new Analytics({ company: task.company });
            }

            // Update daily stats
            analytics.dailyStats.tasksCreated = (analytics.dailyStats.tasksCreated || 0) + 1;

            // Update priority stats
            const priorityLevel = task.importance?.toLowerCase().replace(' priority', '') || 'medium';
            if (analytics.priorityStats[`${priorityLevel}Priority`]) {
                analytics.priorityStats[`${priorityLevel}Priority`].total++;
            }

            // Update department stats if department exists
            if (task.department) {
                const deptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );
                
                if (deptIndex >= 0) {
                    analytics.departmentStats[deptIndex].tasksCreated = 
                        (analytics.departmentStats[deptIndex].tasksCreated || 0) + 1;
                } else {
                    analytics.departmentStats.push({
                        department: task.department,
                        tasksCreated: 1,
                        tasksCompleted: 0,
                        averageCompletionTime: 0,
                        overdueRate: 0
                    });
                }
            }

            // Update creator stats if author exists
            if (task.author) {
                const creatorIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === task.author.toString()
                );

                if (creatorIndex >= 0) {
                    analytics.userStats[creatorIndex].tasksCreated = 
                        (analytics.userStats[creatorIndex].tasksCreated || 0) + 1;
                } else {
                    analytics.userStats.push({
                        user: task.author,
                        tasksCreated: 1,
                        tasksCompleted: 0,
                        averageCompletionTime: 0,
                        overdueRate: 0
                    });
                }
            }

            await analytics.save();
        } catch (error) {
            console.error('Error in updateTaskCreation:', error);
            throw error;
        }
    },

    // Update analytics when a task is completed
    async updateTaskCompletion(task) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let analytics = await Analytics.findOne({
                company: task.company,
                date: { $gte: today }
            });

            if (!analytics) {
                analytics = new Analytics({ company: task.company });
            }

            // Calculate completion time with validation
            let completionTime = 0;
            if (task.createdAt && task.createdAt instanceof Date) {
                completionTime = Math.max(0, (new Date() - task.createdAt) / (1000 * 60 * 60)); // hours
            }

            // Update daily stats with safe calculations
            analytics.dailyStats.tasksCompleted = (analytics.dailyStats.tasksCompleted || 0) + 1;
            
            if (completionTime > 0) {
                const prevTotal = (analytics.dailyStats.averageCompletionTime || 0) * 
                                (analytics.dailyStats.tasksCompleted - 1);
                analytics.dailyStats.averageCompletionTime = 
                    (prevTotal + completionTime) / analytics.dailyStats.tasksCompleted;
            }

            // Update department stats if department exists
            if (task.department) {
                const deptIndex = analytics.departmentStats.findIndex(
                    d => d.department && d.department.toString() === task.department.toString()
                );

                if (deptIndex >= 0) {
                    analytics.departmentStats[deptIndex].tasksCompleted = 
                        (analytics.departmentStats[deptIndex].tasksCompleted || 0) + 1;
                    
                    if (completionTime > 0) {
                        const prevDeptTotal = (analytics.departmentStats[deptIndex].averageCompletionTime || 0) * 
                                            (analytics.departmentStats[deptIndex].tasksCompleted - 1);
                        analytics.departmentStats[deptIndex].averageCompletionTime = 
                            (prevDeptTotal + completionTime) / analytics.departmentStats[deptIndex].tasksCompleted;
                    }

                    // Update overdue rate
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    if (isOverdue) {
                        const totalTasks = analytics.departmentStats[deptIndex].tasksCompleted;
                        analytics.departmentStats[deptIndex].overdueRate = 
                            ((analytics.departmentStats[deptIndex].overdueRate || 0) * (totalTasks - 1) + 100) / totalTasks;
                    }
                }
            }

            // Update user stats if assignee exists
            if (task.assignedTo) {
                const userIndex = analytics.userStats.findIndex(
                    u => u.user && u.user.toString() === task.assignedTo.toString()
                );

                if (userIndex >= 0) {
                    analytics.userStats[userIndex].tasksCompleted = 
                        (analytics.userStats[userIndex].tasksCompleted || 0) + 1;
                    
                    if (completionTime > 0) {
                        const prevUserTotal = (analytics.userStats[userIndex].averageCompletionTime || 0) * 
                                            (analytics.userStats[userIndex].tasksCompleted - 1);
                        analytics.userStats[userIndex].averageCompletionTime = 
                            (prevUserTotal + completionTime) / analytics.userStats[userIndex].tasksCompleted;
                    }

                    // Update overdue rate
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    if (isOverdue) {
                        const totalTasks = analytics.userStats[userIndex].tasksCompleted;
                        analytics.userStats[userIndex].overdueRate = 
                            ((analytics.userStats[userIndex].overdueRate || 0) * (totalTasks - 1) + 100) / totalTasks;
                    }
                }
            }

            // Update priority stats
            const priorityLevel = task.importance?.toLowerCase().replace(' priority', '') || 'medium';
            if (analytics.priorityStats[`${priorityLevel}Priority`]) {
                analytics.priorityStats[`${priorityLevel}Priority`].completed = 
                    (analytics.priorityStats[`${priorityLevel}Priority`].completed || 0) + 1;
                
                if (completionTime > 0) {
                    const prevPriorityTotal = (analytics.priorityStats[`${priorityLevel}Priority`].averageCompletionTime || 0) * 
                                            (analytics.priorityStats[`${priorityLevel}Priority`].completed - 1);
                    analytics.priorityStats[`${priorityLevel}Priority`].averageCompletionTime = 
                        (prevPriorityTotal + completionTime) / analytics.priorityStats[`${priorityLevel}Priority`].completed;
                }
            }

            await analytics.save();
        } catch (error) {
            console.error('Error in updateTaskCompletion:', error);
            throw error;
        }
    },

    // Get analytics for a specific company
    async getCompanyAnalytics(req, res) {
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

            const analytics = await Analytics.find(query)
                .populate('departmentStats.department')
                .populate('userStats.user', 'username');

            res.json(analytics);
        } catch (error) {
            console.error('Error in getCompanyAnalytics:', error);
            res.status(500).json({ error: 'Failed to fetch analytics' });
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
                averageCompletionTime: 0,
                overdueRate: 0
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