// Import mongoose to define the schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Task schema
const taskSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  // Due date: set as a date type
  dueDate: {
    type: Date,
    required: true
  },
  // Assign to: reference to the User model
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // Importance: enum with three possible values
  importance: {
    type: String,
    enum: ['High Priority', 'Medium Priority', 'Low Priority'],
    required: true
  },
  // Department: reference to the Department model
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  // Location: simple string, can represent any specific area or location
  location: {
    type: String,
    required: true,
    trim: true
  },
  // Image: storing the URL of the image from Cloudinary
  images: [
    {
      url: String,
      filename: String
    }
  ],
  completed: {
    type: Boolean,
    default: false // Default to false when a task is first created
  },
  // Add completion date field
  completedAt: {
    type: Date,
    default: null // Only set when task is completed
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Ensure every task has an author
  },
  isOverdue: { type: Boolean, default: false },
  company: {
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Company',
    required: true //every task must belong to some company
  },
  comments : {
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Comment'
  }
}, {
  // timestamps to automatically track createdAt and updatedAt
  timestamps: true
});

// Pre-save hook to check if a task is overdue before saving
taskSchema.pre('save', function(next) {
  // Only check for overdue if the task is not completed
  if (!this.completed && this.dueDate) {
    const now = new Date();
    this.isOverdue = this.dueDate < now;
  }
  next();
});

// Export the Task model based on the schema
module.exports = mongoose.model('Task', taskSchema);