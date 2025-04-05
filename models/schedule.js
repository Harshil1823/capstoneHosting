// Import the mongoose library
const mongoose = require('mongoose');

// Define a schema for a single day's schedule
const daySchema = new mongoose.Schema({
  // The date of the schedule entry
  date: { type: Date, required: true },
  // The start time of the schedule entry
  startTime: { type: Date, default: null },
  // The end time of the schedule entry
  endTime: { type: Date, default: null }
});

// Define a schema for the entire schedule
const scheduleSchema = new mongoose.Schema({
    // A unique identifier for the schedule
    uniqueId: {
        type: String,
        unique: true
    },
    // The company associated with the schedule
    company: {
        type: String,
        required: true
    },
    // The name of the employee for whom the schedule is created
    employeeName: {
        type: String,
        required: true
    },
    // The start date of the week for the schedule
    weekStartDate: {
        type: Date,
        required: true
    },
    // The schedule for each day of the week
    days: {
      sunday: daySchema,
      monday: daySchema,
      tuesday: daySchema,
      wednesday: daySchema,
      thursday: daySchema,
      friday: daySchema,
      saturday: daySchema,
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

// Export the Schedule model based on the scheduleSchema
module.exports = mongoose.model('Schedule', scheduleSchema);