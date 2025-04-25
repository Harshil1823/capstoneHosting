// If the environment is not production, load environment variables from a .env file
if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Import the express module to create a web server
const express = require('express');
// Initialize an instance of express
const app = express();
// Import the path module for handling and transforming file paths
const path = require('path');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const { taskSchema } = require('./schemas');
const session = require('express-session');
const flash = require('connect-flash');
// ejs-mate lets you create partials with views
const ejsMate = require('ejs-mate');
const passport = require('passport'); // Import Passport for authentication
const LocalStrategy = require('passport-local'); // Import Passport's local strategy for username/password authentication
//requering the session to store on mongodb
const MongoDBStore = require('connect-mongo');
app.use(methodOverride('_method'));

//require the user model
const User = require('./models/user');

//getting the model acquired
const Task = require('./models/tasks')
const Department = require('./models/department'); 

//acquriing the routes
const tasksRoute = require('./routes/tasks');
const userRoute = require('./routes/users');
const companiesRoute = require('./routes/companies');
const scheduleRoutes = require('./routes/schedule');
const commentRoutes = require('./routes/comments');
const requestsRoute = require('./routes/requests');
const notificationRoutes = require('./routes/notification');
const messageRoutes = require('./routes/messages');
// may not need
const analyticRoute = require('./routes/analytics');

const mongoose = require('mongoose');
// commenting out the line below we don't need to push to envrionment variable at the moment
// we need to store locally other wise mongodb cloud storage will get full
// dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/retailTasking';
// Explanation:
// 1. Check if the NODE_ENV environment variable is set to 'test'.
// 2. If true, use the TEST_DB_URL environment variable for the test database.
// 3. If false, use the DB_URL environment variable for the production database.
// 4. If DB_URL is not set, default to 'mongodb://127.0.0.1:27017/retailTasking', which is a local MongoDB instance.
const dbUrl = process.env.NODE_ENV === 'test' 
  ? process.env.TEST_DB_URL 
  : process.env.DB_URL || 'mongodb://127.0.0.1:27017/retailTasking';

mongoose.connect(dbUrl, {

});
const db = mongoose.connection;
db.on('error', console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log(`Database connected: ${dbUrl}`);
})


// telling express to use the ejs-mate engine
app.engine('ejs', ejsMate);
// Set EJS as the templating engine for rendering HTML views
app.set('view engine', 'ejs');
// Set the 'views' directory for the EJS templates
// This allows express to locate and render views from the specified path
app.set('views', path.join(__dirname, 'views'));

//Middleware that allows express to handle post request bodies
// this makes sure that request bodies are parsed correctly
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
//method-override for put request
app.use(methodOverride('_method'));

const store = MongoDBStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60, // time period
  crypto: {
      secret: 'thisshouldbeabettersecret!'
  }
});
store.on('error', function (e) {
  console.log('session Store error')
})

const sessionConfig = {
  store, //so it stores session in mongodb
  //during production this will be in .env variable 
  //and a better secret 
  secret : 'thisshouldbeasecret',
  resave : false,
  saveUninitialized: true,
  //eventually make the store mongo here
  // store :
  cookie : {
    //for security reason adding httponly as true
    httpOnly : true,
    expires : Date.now() + 1000 * 60 * 60 * 24 * 7, //cookie expires 7 days from created
    maxAge : 1000 * 60 * 60 * 24 * 7 //cookies expire after 7 days
  }
}
// Apply the session middleware to the app
// This enables session handling for all incoming requests.
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize()); // Initialize Passport middleware
app.use(passport.session()); // Enable persistent login sessions with Passport
passport.use(new LocalStrategy(User.authenticate())); // Use Passport's local strategy with User's authentication method

passport.serializeUser(User.serializeUser()); // Serialize user data to store in session
passport.deserializeUser(User.deserializeUser()); // Deserialize user data from the session

//// Middleware to set local variables for use in all templates/views
app.use((req, res, next)=> {
  // if you want to see what's going on with session
  // console.log(req.session);

  // Make the currently authenticated user (if any) available in all views
  res.locals.currentUser = req.user;
  // Make success flash messages available in all views
  res.locals.success = req.flash('success');
  // Make error flash messages available in all views
  res.locals.error = req.flash('error');
  next();
})
// Import unread messages middleware 
const { checkUnreadMessages } = require('./middleware');
app.use(checkUnreadMessages);

//specify the route we want to use for user
app.use('/', userRoute);
//specify the route we want to use for tasks
app.use('/tasks', tasksRoute);
//specify the route we want to use for schedules
app.use('/schedules', scheduleRoutes);
//specify the route we want to use for company
app.use('/companies', companiesRoute);
//specify the route we want for comments 
app.use('/tasks/:id/comments', commentRoutes);
//request routes
app.use('/requests', requestsRoute);
app.use('/notifications', notificationRoutes);
// message route
app.use('/messages', messageRoutes);

// specify route for analytics
app.use('/analytics', analyticRoute);

// Define the route for the home page
app.get('/', (req, res) => {
  res.render('home');  // Render the 'home.ejs' file located in the views directory
});

// Middleware to handle all unmatched routes
app.use('*', (req, res, next) => {
  // Create a new ExpressError with a "page not found" 
  // message and 404 status code
  next(new ExpressError('page not found', 404));
})

app.use((err, req, res, next) => {
  // Set the status code, default to 500 if not set
  const { status = 500 } = err;

  // Render the error template with error details
  res.status(status).render('error', { 
    title: 'Error', 
    message: err.message || 'Something went wrong!', 
    status 
  });
})


// Start the server and make it listen on port 3000
// When the server starts successfully, it logs a message to the console
app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});

module.exports = app; // Export the app instance
