const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule');
const User = require('../models/user');
const { ensureAuthenticated, ensureAdminOrManager } = require('../middleware');
const generateUniqueId = require('../utils/generateUniqueId');

// Route to show the form to create a new schedule
router.get('/new', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        const employees = await User.find({ company: req.user.company });
        res.render('schedules/new', { currentUser: req.user, employees });
    } catch (err) {
        req.flash('error', 'Unable to load employees.');
        res.redirect('/schedules');
    }
});

// Route to show the confirm page before creating a schedule
router.post('/confirm', ensureAuthenticated, ensureAdminOrManager, (req, res) => {
    const schedule = req.body;
    res.render('schedules/confirm', { schedule, currentUser: req.user });
});

// Route to handle the creation of a schedule
router.post('/create', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        const { days, employeeName, company } = req.body;
        const weekStartDate = new Date(new Date(days.sunday.date).setDate(new Date(days.sunday.date).getDate() + 1));

        // Check if a schedule already exists for the given employee and week start date
        const existingSchedule = await Schedule.findOne({ employeeName, weekStartDate, company });
        if (existingSchedule) {
            req.flash('error', 'A schedule already exists for this employee during the specified week.');
            return res.redirect('/schedules/new');
        }

        const parseTime = (date, time) => {
            if (!time) return null;
            const [hours, minutes] = time.split(':');
            const parsedDate = new Date(date);
            parsedDate.setHours(hours, minutes);
            return parsedDate;
        };

        const newSchedule = new Schedule({
            uniqueId: generateUniqueId(),
            company: req.user.company,
            employeeName,
            weekStartDate,
            days: {
                sunday: {
                    date: new Date(new Date(days.sunday.date).setDate(new Date(days.sunday.date).getDate() + 1)),
                    startTime: parseTime(days.sunday.date, days.sunday.startTime),
                    endTime: parseTime(days.sunday.date, days.sunday.endTime)
                },
                monday: {
                    date: new Date(new Date(days.monday.date).setDate(new Date(days.monday.date).getDate() + 1)),
                    startTime: parseTime(days.monday.date, days.monday.startTime),
                    endTime: parseTime(days.monday.date, days.monday.endTime)
                },
                tuesday: {
                    date: new Date(new Date(days.tuesday.date).setDate(new Date(days.tuesday.date).getDate() + 1)),
                    startTime: parseTime(days.tuesday.date, days.tuesday.startTime),
                    endTime: parseTime(days.tuesday.date, days.tuesday.endTime)
                },
                wednesday: {
                    date: new Date(new Date(days.wednesday.date).setDate(new Date(days.wednesday.date).getDate() + 1)),
                    startTime: parseTime(days.wednesday.date, days.wednesday.startTime),
                    endTime: parseTime(days.wednesday.date, days.wednesday.endTime)
                },
                thursday: {
                    date: new Date(new Date(days.thursday.date).setDate(new Date(days.thursday.date).getDate() + 1)),
                    startTime: parseTime(days.thursday.date, days.thursday.startTime),
                    endTime: parseTime(days.thursday.date, days.thursday.endTime)
                },
                friday: {
                    date: new Date(new Date(days.friday.date).setDate(new Date(days.friday.date).getDate() + 1)),
                    startTime: parseTime(days.friday.date, days.friday.startTime),
                    endTime: parseTime(days.friday.date, days.friday.endTime)
                },
                saturday: {
                    date: new Date(new Date(days.saturday.date).setDate(new Date(days.saturday.date).getDate() + 1)),
                    startTime: parseTime(days.saturday.date, days.saturday.startTime),
                    endTime: parseTime(days.saturday.date, days.saturday.endTime)
                }
            }
        });

        await newSchedule.save();
        res.redirect(`/schedules/${newSchedule._id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/schedules/new');
    }
});

// Route to get all schedules for the current user's company
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const schedules = await Schedule.find({ company: req.user.company });
        res.render('schedules/index', { schedules, currentUser: req.user });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Route to get all schedules for the current user's company
router.get('/show', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        const schedules = await Schedule.find({ company: req.user.company });
        res.render('schedules/show', { schedules, currentUser: req.user });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Route to render the manager view
router.get('/managerView', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        const schedules = await Schedule.find({ company: req.user.company });
        res.render('schedules/managerView', { schedules, currentUser: req.user });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Route to show the delete confirmation page for a specific schedule
router.get('/:id/delete', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        res.render('schedules/delete', { schedule });
    } catch (err) {
        console.error(err);
        res.redirect('/schedules');
    }
});

// Route to handle the deletion of a schedule
router.delete('/:id', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        await Schedule.findByIdAndDelete(req.params.id);
        req.flash('success', 'Schedule deleted successfully!');
        res.redirect('/schedules');
    } catch (err) {
        console.error(err);
        res.redirect('/schedules');
    }
});

// Route to get a specific schedule by ID
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        res.render('schedules/view', { schedule });
    } catch (err) {
        console.error(err);
        res.redirect('/schedules');
    }
});

// Route to render the edit form
router.get('/:id/edit', async (req, res) => {
    try {
      const schedule = await Schedule.findById(req.params.id);
      res.render('schedules/edit', { schedule });
    } catch (err) {
      console.error(err);
      res.redirect('/schedules');
    }
  });
  
// Route to handle the edit form submission
router.put('/:id', ensureAuthenticated, ensureAdminOrManager, async (req, res) => {
    try {
        const { days } = req.body;

        const parseTime = (date, time) => {
            if (!time) return null;
            const [hours, minutes] = time.split(':');
            const parsedDate = new Date(date);
            parsedDate.setHours(hours, minutes, 0, 0);
            return parsedDate;
        };

        const updatedDays = {};
        for (const day in days) {
            updatedDays[day] = {
                date: new Date(days[day].date),
                startTime: parseTime(days[day].date, days[day].startTime),
                endTime: parseTime(days[day].date, days[day].endTime)
            };
        }

        const schedule = await Schedule.findByIdAndUpdate(req.params.id, { days: updatedDays }, { new: true });
        res.redirect(`/schedules/${schedule._id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/schedules');
    }
});

module.exports = router;