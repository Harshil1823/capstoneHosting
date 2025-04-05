const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//Passport-Local Mongoose is a Mongoose plugin that simplifies 
// building username and password login with Passport.
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
  // NOTEE:
  // NOT ADDING USERNAME AND PASSWORD BECAUSE OF THE PLUGIN TAHT'S BEING USED
  // UserSchema.plugin(passportLocalMongoose) ADDS THE USERNAME AND PASSWORD TO THE MODEL ITSELF
  firstName: {
    type: String,
    trim: true,
    // required: true
  },
  lastName: {
    type: String,
    trim: true
    // required: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    // required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    trim: true,
  },
  workEmail: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  role: {
    type: String,
    // admin = store manager, manager = dept supervisor, employee = store associate
    enum: ['Admin', 'Manager', 'Employee'], // Define roles for permissions
    default: 'Employee' // Default role
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hireDate: {
    type: Date,
    default: null
  },
  profileImage: {
    url: String,
    filename: String
  },
  tasks: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Task' // Reference to Task model
    }],
  departments: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Department' // Reference to Department model
    }]
})

UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', UserSchema);