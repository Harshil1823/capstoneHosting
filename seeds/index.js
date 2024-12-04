const mongoose = require('mongoose');
const Task = require('../models/tasks');
const Department = require('../models/department'); 

// Connect to MongoDB
const dbUrl = 'mongodb://127.0.0.1:27017/retailTasking';
mongoose.connect(dbUrl)
  .then(() => {
    console.log("MongoDB connected for seeding!");
  })
  .catch(error => {
    console.error("MongoDB connection error:", error);
  });

// Define seed data for departments
const seedDepartments = [
  { name: 'Lawn and Garden' },
  { name: 'Electronics' },
  { name: 'Grocery' },
  { name: 'Home Improvement' }
];

// Define seed data for tasks
const seedTasks = [
  {
    title: 'Stock New Arrivals',
    description: 'Stock all new arrival items on shelves.',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
    importance: 'High Priority',
    location: 'Section A',
    department: null, // Placeholder for department ID
    assignedTo: null,
    image: { url: 'https://plus.unsplash.com/premium_photo-1683749810514-860f96ad0735?q=80&w=1413&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', filename: 'placeholder' },
    author : '673e6c51994c7488488f2e1c'
  },
  {
    title: 'Inventory Check',
    description: 'Verify stock levels and reorder low stock items.',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
    importance: 'Medium Priority',
    location: 'Back Room',
    department: null,
    assignedTo: null,
    image: { url: 'https://plus.unsplash.com/premium_photo-1683749810514-860f96ad0735?q=80&w=1413&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', filename: 'placeholder' },
    author : '673e6c51994c7488488f2e1c'
  },
  {
    title: 'Clean Display Area',
    description: 'Organize and clean the display area for a neat appearance.',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
    importance: 'Low Priority',
    location: 'Front Lobby',
    department: null,
    assignedTo: null,
    image: { url: 'https://plus.unsplash.com/premium_photo-1683749810514-860f96ad0735?q=80&w=1413&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', filename: 'placeholder' },
    author : '673e6c51994c7488488f2e1c'
  }
];

// Seed function to add data to the database
async function seedDB() {
  // Clear existing data
  await Task.deleteMany({});
  await Department.deleteMany({});

  // Insert departments and retrieve their IDs
  const insertedDepartments = await Department.insertMany(seedDepartments);
  console.log("Database seeded with departments!");

  // Associate some tasks with departments
  seedTasks[0].department = insertedDepartments[0]._id; // Lawn and Garden
  seedTasks[1].department = insertedDepartments[1]._id; // Electronics
  seedTasks[2].department = insertedDepartments[2]._id; // Grocery

  // Insert tasks with department references
  await Task.insertMany(seedTasks);
  console.log("Database seeded with tasks!");
}

// Run the seed function and close the connection
seedDB().then(() => {
  mongoose.connection.close();
});
