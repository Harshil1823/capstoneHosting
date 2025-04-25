// Import the Schedule model
const Schedule = require("../models/schedule");
// Import utility to generate unique IDs
const generateUniqueId = require('../utils/generateUniqueId');

// Render the schedule page
exports.renderSchedulePage = async (req, res) => {
    // Render the "schedules" view
    res.render("schedules");
};

exports.createSchedule = async (req, res) => {
    try {
        // Destructure the request body to extract schedule details
        const { company, employeeName, weekStartDate, days } = req.body;

        // Ensure company is properly handled and valid
        if (!company || (Array.isArray(company) && company.length === 0)) {
            res.flash('error', 'Invalid company information provided.');
            // Redirect to the new schedule form
            return res.redirect('/schedules/new');
        }
        // Use the first company if it's an array
        const companyName = Array.isArray(company) ? company[0] : company;

        // Check if a schedule already exists for the employee and week
        const existingSchedule = await Schedule.findOne({
            employeeName,
            weekStartDate: new Date(weekStartDate),
            company: companyName,
        });
        if (existingSchedule) {
            res.flash('error', 'A schedule already exists for this employee during the specified week.');
            // Redirect to the new schedule form
            return res.redirect('/schedules/new');
        }

        // Create and save the new schedule
        const newSchedule = new Schedule({
            // Generate a unique ID for the schedule
            uniqueId: generateUniqueId(),
            company: companyName,
            employeeName,
            weekStartDate: new Date(weekStartDate),
            days: Object.fromEntries(
                Object.entries(days).map(([day, details]) => [
                    day,
                    {
                        // Convert date to Date object
                        date: new Date(details.date),
                        // Convert startTime to Date object
                        startTime: details.startTime ? new Date(`${details.date}T${details.startTime}`) : null,
                        // Convert endTime to Date object
                        endTime: details.endTime ? new Date(`${details.date}T${details.endTime}`) : null,
                    },
                ])
            ),
        });

        // Save the new schedule to the database
        await newSchedule.save();
        // Flash success message
        res.flash('success', 'Schedule submitted successfully!');
        // Redirect to the schedules page
        res.redirect('/schedules');
    } catch (err) {
        // Handle errors during schedule creation
        res.flash('error', 'An error occurred while creating the schedule.');
        // Redirect to the new schedule form
        res.redirect('/schedules/new');
    }
};

exports.getSchedules = async (req, res) => {
    try {
        // Fetch all schedules from the database, sorted by weekStartDate in descending order
        const schedules = await Schedule.find({}).sort({ weekStartDate: -1 });
        // Render the "schedules" view with the fetched schedules
        res.render("schedules", { schedules });
    } catch (err) {
        // Handle errors during schedule fetching
        res.flash('error', 'An error occurred while fetching schedules.');
        // Redirect to the schedules page
        res.redirect('/schedules');
    }
};

// Utility function to validate schedule data
exports.validateScheduleData = (scheduleData) => {
    const { company, employeeName, weekStartDate, days } = scheduleData;

    // Validate company information
    if (!company || (Array.isArray(company) && company.length === 0)) {
        return { isValid: false, message: 'Invalid company information provided.' };
    }

    // Validate required fields
    if (!employeeName || !weekStartDate || !days) {
        return { isValid: false, message: 'Missing required schedule fields.' };
    }

    // Validate each day's details
    for (const [day, details] of Object.entries(days)) {
        if (!details.date || !details.startTime || !details.endTime) {
            return { isValid: false, message: `Invalid or missing data for ${day}.` };
        }
    }

    // Return valid if all checks pass
    return { isValid: true };
};

// Utility function to format schedule data for saving
exports.formatScheduleData = (scheduleData) => {
    const { company, weekStartDate, days } = scheduleData;

    // Use the first company if it's an array
    const companyName = Array.isArray(company) ? company[0] : company;

    // Format the schedule data
    return {
        company: companyName,
        // Convert weekStartDate to Date object
        weekStartDate: new Date(weekStartDate),
        days: Object.fromEntries(
            Object.entries(days).map(([day, details]) => [
                day,
                {
                    // Convert date to Date object
                    date: new Date(details.date),
                    // Convert startTime to Date object
                    startTime: details.startTime ? new Date(`${details.date}T${details.startTime}`) : null,
                    // Convert endTime to Date object
                    endTime: details.endTime ? new Date(`${details.date}T${details.endTime}`) : null,
                },
            ])
        ),
    };
};