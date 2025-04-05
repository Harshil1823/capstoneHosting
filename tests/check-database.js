// Save as check-database.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/retailTasking')
  .then(async () => {
    try {
      console.log('Connected to database');
      
      // List all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Collections in database:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });

      // Check users collection directly (without using the model)
      if (collections.some(c => c.name === 'users')) {
        const usersCollection = mongoose.connection.db.collection('users');
        const userCount = await usersCollection.countDocuments();
        console.log(`Found ${userCount} documents in the users collection`);
        
        if (userCount > 0) {
          const sampleUser = await usersCollection.findOne({});
          console.log('Sample user document:', sampleUser);
        }
      } else {
        console.log('No users collection found!');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });