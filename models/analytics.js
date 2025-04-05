const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const analyticsSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // daily statistics
  dailyStats: {
    tasksCreated: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksOverdue: { type: Number, default: 0 },
    tasksViewed: { type: Number, default: 0 },
    tasksUpdated: { type: Number, default: 0 },
    tasksDeleted: { type: Number, default: 0 },
    userLogins: { type: Number, default: 0 },
    profileUpdates: { type: Number, default: 0 },
    passwordChanges: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 }, // in hours
  },
  // department performance
  departmentStats: [{
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    tasksCompleted: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    modificationsCount: { type: Number, default: 0 },
    deletionsCount: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 }, // Add explicit overdue count
    averageCompletionTime: { type: Number, default: 0 },
    overdueRate: { type: Number, default: 0 }
  }],
  // user performance
  userStats: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    tasksCompleted: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    tasksAssigned: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 }, // Add explicit overdue count
    averageCompletionTime: { type: Number, default: 0 },
    overdueRate: { type: Number, default: 0 },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 }
  }],
  // priority-based metrics
  priorityStats: {
    highPriority: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      overdueCount: { type: Number, default: 0 }, // Add explicit overdue count
      averageCompletionTime: { type: Number, default: 0 }
    },
    mediumPriority: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      overdueCount: { type: Number, default: 0 }, // Add explicit overdue count
      averageCompletionTime: { type: Number, default: 0 }
    },
    lowPriority: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      overdueCount: { type: Number, default: 0 }, // Add explicit overdue count
      averageCompletionTime: { type: Number, default: 0 }
    }
  }
  
});
analyticsSchema.index({ company: 1, date: 1 });
analyticsSchema.index({ 'userStats.user': 1 });
analyticsSchema.index({ 'departmentStats.department': 1 });
module.exports = mongoose.model('Analytics', analyticsSchema);