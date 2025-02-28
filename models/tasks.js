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
  // Assign to: reference to the User model, 
  // TODO creating the user model later
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    //TODO MAKE THIS REQUIRED LATER ON
  },
  // Importance: enum with three possible values
  importance: {
    type: String,
    enum: ['High Priority', 'Medium Priority', 'Low Priority'],
    required: true
  },
  // Department: simple string to represent where the task is related to
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
});

// Export the Task model based on the schema
module.exports = mongoose.model('Task', taskSchema);
