// seeds/index.js
const mongoose = require('mongoose');
const Task = require('../models/tasks');
const Department = require('../models/department');
const User = require('../models/user');
const Company = require('../models/company');

// Connect to MongoDB
const dbUrl = 'mongodb://127.0.0.1:27017/retailTasking';
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("MongoDB connected for seeding!");
  })
  .catch(error => {
    console.error("MongoDB connection error:", error);
  });

// Utility function to generate hashed company code
async function generateCompanyCode() {
  const companyCode = Math.floor(100000 + Math.random() * 900000).toString();
  return companyCode;
}

// Seed data for companies
const seedCompanies = async () => {
  return [
    {
      name: 'Spurs Retail Inc.',
      address: { street: '123 Main st', city: 'Columbia', state: "SC", zipCode: '29208' },
      code: await generateCompanyCode(),
      storeNumber: '1001'
    },
    {
      name: 'SpursUp Hardware',
      address: { street: '123 North Lake', city: 'Lexington', state: "SC", zipCode: '29072' },
      code: await generateCompanyCode(),
      storeNumber: '2002'
    }
  ];
};

// Seed data for departments (each department is associated with a company)
const seedDepartments = (companies) => {
  let departments = [];
  
  // Departments for first company
  departments.push(
    { name: 'Lawn and Garden', company: companies[0]._id },
    { name: 'Electronics', company: companies[0]._id }
  );
  
  // Departments for second company
  departments.push(
    { name: 'Grocery', company: companies[1]._id },
    { name: 'Home Improvement', company: companies[1]._id }
  );
  
  return departments;
};

// Use the User.register method from passport-local-mongoose to properly create users
const seedUsers = async (companies) => {
  let users = [];
  try {
    // Register returns a promise that resolves to the created user document
    const user1 = await User.register(
      { username: 'admin', workEmail: 'admin@spursretail.com', company: companies[0]._id, role: 'Admin' },
      'password123'
    );
    const user2 = await User.register(
      { username: 'admin_user_spursUpHardware', workEmail: 'admin@spursuphardware.com', company: companies[1]._id, role: 'Admin' },
      'password123'
    );
    const user3 = await User.register(
      { username: 'manager_user', workEmail: 'manager@spursretail.com', company: companies[0]._id, role: 'Manager' },
      'password123'
    );
    const user4 = await User.register(
      { username: 'employee_user', workEmail: 'employee@spursretail.com', company: companies[0]._id, role: 'Employee' },
      'password123'
    );
    users.push(user1, user2, user3, user4);
  } catch (error) {
    console.error("Error seeding users:", error);
  }
  return users;
};

const seedTasks = async (departments, users) => {
  return [
    {
      title: 'Stock New Arrivals',
      description: 'Stock all new arrival items on shelves.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      importance: 'High Priority',
      location: 'Section A',
      department: departments[0]._id,  // Lawn and Garden (first company)
      assignedTo: users[2]._id,         // manager_user from first company
      author: users[0]._id,             // admin from first company
      images: [{ url: 'https://example.com/image1.jpg', filename: 'image1' }],
      company: users[0].company         // from first company
    },
    {
      title: 'Inventory Check',
      description: 'Verify stock levels and reorder low stock items.',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      importance: 'Medium Priority',
      location: 'Back Room',
      department: departments[1]._id,  // Electronics (first company)
      assignedTo: users[1]._id,         // admin_user_spursUpHardware from second company (for diversity, but note company mismatch if desired, adjust as needed)
      author: users[0]._id,             // admin from first company
      images: [{ url: 'https://example.com/image2.jpg', filename: 'image2' }],
      company: users[0].company         // using first company's company reference
    },
    {
      title: 'Clean Display Area',
      description: 'Organize and clean the display area for a neat appearance.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      importance: 'Low Priority',
      location: 'Front Lobby',
      department: departments[2]._id,  // Grocery (second company)
      assignedTo: users[2]._id,         // manager_user from first company (adjust if needed for consistency)
      author: users[0]._id,             // admin from first company
      images: [{ url: 'https://example.com/image3.jpg', filename: 'image3' }],
      company: users[0].company         // using first company's company reference
    }
  ];
};

async function seedDB() {
  try {
    // Clear existing data
    await Task.deleteMany({});
    await Department.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});

    // Insert test companies
    const companiesData = await seedCompanies();
    const insertedCompanies = await Company.insertMany(companiesData);
    console.log("Database seeded with companies!");

    // Insert departments and retrieve their IDs
    const departmentsData = seedDepartments(insertedCompanies);
    const insertedDepartments = await Department.insertMany(departmentsData);
    console.log("Database seeded with departments!");

    // Insert users with company link using the proper registration method
    const insertedUsers = await seedUsers(insertedCompanies);
    console.log("Database seeded with users!");

    // Insert tasks with department, company and user link
    const tasksData = await seedTasks(insertedDepartments, insertedUsers);
    await Task.insertMany(tasksData);
    console.log("Database seeded with tasks!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
}

seedDB();
