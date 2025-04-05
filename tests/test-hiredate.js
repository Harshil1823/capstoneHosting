// Save as test-hiredate.js
const mongoose = require('mongoose');
const User = require('../models/user'); // Same path as in your seeding script

mongoose.connect('mongodb://127.0.0.1:27017/retailTasking')
  .then(async () => {
    try {
      console.log('Connected to database');
      
      // First, let's find all users - but using a simpler query
      const users = await mongoose.connection.db.collection('users').find({}).toArray();
      console.log(`Found ${users.length} users directly in the database`);
      
      // Now let's try using the User model
      const modelUsers = await User.find({});
      console.log(`Found ${modelUsers.length} users using the User model`);
      
      if (users.length === 0) {
        console.log('No users found in the database. Please check your connection string.');
        return;
      }
      
      // Use the first user for testing
      const firstUserFromDb = users[0];
      console.log('Selected user for testing:', {
        id: firstUserFromDb._id,
        username: firstUserFromDb.username || 'No username',
        email: firstUserFromDb.workEmail || 'No email'
      });
      
      // Set the hire date to today
      const today = new Date();
      console.log(`Setting hire date to: ${today.toISOString()}`);
      
      // Update the user directly in the collection
      const updateResult = await mongoose.connection.db.collection('users').updateOne(
        { _id: firstUserFromDb._id },
        { $set: { hireDate: today } }
      );
      
      console.log('Update result:', updateResult);
      
      // Verify by fetching the user again directly
      const updatedUser = await mongoose.connection.db.collection('users').findOne({ _id: firstUserFromDb._id });
      console.log('User after update:', {
        id: updatedUser._id,
        username: updatedUser.username || 'No username',
        email: updatedUser.workEmail || 'No email',
        hireDate: updatedUser.hireDate,
        hireDateISO: updatedUser.hireDate ? updatedUser.hireDate.toISOString() : null
      });
      
      console.log('Test completed successfully');
    } catch (error) {
      console.error('Error during test:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });