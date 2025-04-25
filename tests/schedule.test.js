// Import the Schedule model and controller functions to be tested
const Schedule = require('../models/schedule');
const { renderSchedulePage, createSchedule, validateScheduleData, formatScheduleData, getSchedules } = require('../controllers/schedule');

// Mock the Schedule model to isolate tests from the database
jest.mock('../models/schedule');

describe('Schedule Controller', () => {
    let req, res;

    beforeEach(() => {
        // Mock request and response objects for testing
        req = {
            body: {
                // Mock employee name
                employeeName: 'admin',
                // Mock start date of the week
                weekStartDate: '2025-04-27',
                // Mock valid company data
                company: ['Test Company'],
                // Mock schedule for each day of the week
                days: {
                    sunday: {
                        date: '2025-04-27',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    monday: {
                        date: '2025-04-28',
                        startTime: '09:00',
                        endTime: '17:00',
                    }, 
                    tuesday: {
                        date: '2025-04-29',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    wednesday: {
                        date: '2025-04-30',
                        startTime: '09:00',
                        endTime: '17:00',
                    }, 
                    thursday: {
                        date: '2025-05-01',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    friday: {
                        date: '2025-05-02',
                        startTime: '09:00',
                        endTime: '17:00',
                    }, 
                    saturday: {
                        date: '2025-05-03',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                },
            },
        };
        res = {
            // Mock redirect function
            redirect: jest.fn(),
            // Mock flash function for displaying messages
            flash: jest.fn(),
        };
    });

    afterEach(() => {
        // Clear all mocks after each test to avoid interference
        jest.clearAllMocks();
    });

    it('should render the schedule form', () => {
        // Mock the render function of the response object
        res = {
            render: jest.fn(),
        };

        // Call the renderSchedulePage function
        renderSchedulePage(req, res);

        // Verify that the correct view is rendered
        expect(res.render).toHaveBeenCalledWith('schedules');
    });

    it('should create a new schedule successfully', async () => {
        // Mock database behavior: no existing schedule found
        Schedule.findOne = jest.fn().mockResolvedValue(null);
        // Mock save method of the Schedule model
        Schedule.prototype.save = jest.fn().mockResolvedValue({});

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that the database is queried with the correct parameters
        expect(Schedule.findOne).toHaveBeenCalledWith({
            employeeName: req.body.employeeName,
            weekStartDate: new Date(req.body.weekStartDate),
            // Use the first company in the array
            company: req.body.company[0],
        });
        // Verify that the save method is called
        expect(Schedule.prototype.save).toHaveBeenCalled();
        // Verify that a success message is flashed
        expect(res.flash).toHaveBeenCalledWith('success', 'Schedule submitted successfully!');
        // Verify that the user is redirected to the schedules page
        expect(res.redirect).toHaveBeenCalledWith('/schedules');
    });

    it('should not create a schedule if one already exists', async () => {
        // Mock database behavior: existing schedule found
        Schedule.findOne = jest.fn().mockResolvedValue({});

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that the database is queried
        expect(Schedule.findOne).toHaveBeenCalled();
        // Verify that an error message is flashed
        expect(res.flash).toHaveBeenCalledWith('error', 'A schedule already exists for this employee during the specified week.');
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should handle errors during schedule creation', async () => {
        // Mock database behavior: throw an error
        Schedule.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that the database is queried
        expect(Schedule.findOne).toHaveBeenCalled();
        // Verify that a generic error message is flashed
        expect(res.flash).toHaveBeenCalledWith('error', 'An error occurred while creating the schedule.');
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });
});

describe('getSchedules', () => {
    let req, res;

    beforeEach(() => {
        // Mock request and response objects for testing
        req = {};
        res = {
            // Mock render function
            render: jest.fn(),
            // Mock flash function for displaying messages
            flash: jest.fn(),
            // Mock redirect function
            redirect: jest.fn(),
        };
    });

    it('should render schedules page with fetched schedules', async () => {
        // Mock database behavior: return a list of schedules
        const mockSchedules = [
            { employeeName: 'admin', weekStartDate: new Date('2025-04-27') },
            { employeeName: 'user1', weekStartDate: new Date('2025-05-04') },
        ];
        Schedule.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockSchedules),
        });

        // Call the getSchedules function
        await getSchedules(req, res);

        // Verify that schedules are fetched and rendered
        expect(Schedule.find).toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('schedules', { schedules: mockSchedules });
    });

    it('should handle errors during schedule fetching', async () => {
        // Mock database behavior: throw an error
        Schedule.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('Database error')),
        });

        // Call the getSchedules function
        await getSchedules(req, res);

        // Verify that an error message is flashed and the user is redirected
        expect(Schedule.find).toHaveBeenCalled();
        expect(res.flash).toHaveBeenCalledWith('error', 'An error occurred while fetching schedules.');
        expect(res.redirect).toHaveBeenCalledWith('/schedules');
    });
});

describe('Additional tests for createSchedule', () => {
    let req, res;

    beforeEach(() => {
        // Mock request and response objects for testing
        req = {
            body: {
                // Mock employee name
                employeeName: 'admin',
                // Mock start date of the week
                weekStartDate: '2025-04-27',
                // Mock valid company data
                company: ['Test Company'],
                // Mock schedule for each day of the week
                days: {
                    sunday: {
                        date: '2025-04-27',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    monday: {
                        date: '2025-04-28',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    tuesday: {
                        date: '2025-04-29',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    wednesday: {
                        date: '2025-04-30',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    thursday: {
                        date: '2025-05-01',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    friday: {
                        date: '2025-05-02',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    saturday: {
                        date: '2025-05-03',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                },
            },
        };
        res = {
            // Mock redirect function
            redirect: jest.fn(),
            // Mock flash function for displaying messages
            flash: jest.fn(),
        };
    });

    it('should handle invalid company data', async () => {
        // Invalid company data
        req.body.company = [];

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that an error message is flashed
        expect(res.flash).toHaveBeenCalledWith('error', 'Invalid company information provided.');
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should handle missing days data', async () => {
        // Missing days data
        req.body.days = null;

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that a generic error message is flashed
        expect(res.flash).toHaveBeenCalledWith('error', 'An error occurred while creating the schedule.');
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should handle invalid date format in days', async () => {
        // Invalid date format
        req.body.days.sunday.date = 'invalid-date';

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that a generic error message is flashed
        expect(res.flash).toHaveBeenCalledWith('error', 'An error occurred while creating the schedule.');
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should handle missing startTime or endTime in days', async () => {
        // Missing startTime
        req.body.days.sunday.startTime = null;

        // Mock database behavior: no existing schedule found
        Schedule.findOne = jest.fn().mockResolvedValue(null);
        // Mock save method of the Schedule model
        Schedule.prototype.save = jest.fn().mockResolvedValue({});

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that the save method is called
        expect(Schedule.prototype.save).toHaveBeenCalled();
        // Verify that a success message is flashed
        expect(res.flash).toHaveBeenCalledWith('success', 'Schedule submitted successfully!');
        // Verify that the user is redirected to the schedules page
        expect(res.redirect).toHaveBeenCalledWith('/schedules');
    });

    it('should handle duplicate company names in the company array', async () => {
        // Duplicate company names
        req.body.company = ['Test Company', 'Test Company'];

        // Mock database behavior: no existing schedule found
        Schedule.findOne = jest.fn().mockResolvedValue(null);
        // Mock save method of the Schedule model
        Schedule.prototype.save = jest.fn().mockResolvedValue({});

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that the database is queried with the correct parameters
        expect(Schedule.findOne).toHaveBeenCalledWith({
            employeeName: req.body.employeeName,
            weekStartDate: new Date(req.body.weekStartDate),
            // First company name should be used
            company: 'Test Company',
        });
        // Verify that the save method is called
        expect(Schedule.prototype.save).toHaveBeenCalled();
        // Verify that a success message is flashed
        expect(res.flash).toHaveBeenCalledWith('success', 'Schedule submitted successfully!');
        // Verify that the user is redirected to the schedules page
        expect(res.redirect).toHaveBeenCalledWith('/schedules');
    });
});

describe('Edge case tests for createSchedule', () => {
    let req, res;

    beforeEach(() => {
        // Mock request and response objects for testing
        req = {
            body: {
                // Mock employee name
                employeeName: 'admin',
                // Mock start date of the week
                weekStartDate: '2025-04-27', // Mock start date of the week
                // Mock valid company data
                company: ['Test Company'], 
                // Mock schedule for each day of the week
                days: {
                    sunday: {
                        date: '2025-04-27',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    monday: {
                        date: '2025-04-28',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    tuesday: {
                        date: '2025-04-29',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    wednesday: {
                        date: '2025-04-30',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    thursday: {
                        date: '2025-05-01',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    friday: {
                        date: '2025-05-02',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                    saturday: {
                        date: '2025-05-03',
                        startTime: '09:00',
                        endTime: '17:00',
                    },
                },
            },
        };
        res = {
            // Mock redirect function
            redirect: jest.fn(),
            // Mock flash function for displaying messages
            flash: jest.fn(),
        };
    });

    it('should handle missing company array', async () => {
        // Missing company array
        req.body.company = null;

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that an error message is flashed
        expect(res.flash).toHaveBeenCalledWith("error", "Invalid company information provided.");
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should handle empty company array', async () => {
        // Empty company array
        req.body.company = [];

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that an error message is flashed
        expect(res.flash).toHaveBeenCalledWith('error', 'Invalid company information provided.');
        // Verify that the user is redirected to the new schedule form
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });
});

describe('Utility function tests', () => {
    describe('validateScheduleData', () => {
        it('should return valid for correct schedule data', () => {
            // Mock valid schedule data
            const scheduleData = {
                company: ['Test Company'],
                employeeName: 'admin',
                weekStartDate: '2025-04-27',
                days: {
                    sunday: { date: '2025-04-27', startTime: '09:00', endTime: '17:00' },
                },
            };

            // Call the validateScheduleData function
            const result = validateScheduleData(scheduleData);

            // Verify that the data is valid
            expect(result).toEqual({ isValid: true });
        });

        it('should return invalid for missing company', () => {
            // Mock schedule data with missing company
            const scheduleData = {
                company: null,
                employeeName: 'admin',
                weekStartDate: '2025-04-27',
                days: {
                    sunday: { date: '2025-04-27', startTime: '09:00', endTime: '17:00' },
                },
            };

            // Call the validateScheduleData function
            const result = validateScheduleData(scheduleData);

            // Verify that the data is invalid and the correct error message is returned
            expect(result).toEqual({ isValid: false, message: 'Invalid company information provided.' });
        });

        it('should return invalid for missing days', () => {
            // Mock schedule data with missing days
            const scheduleData = {
                company: ['Test Company'],
                employeeName: 'admin',
                weekStartDate: '2025-04-27',
                days: null,
            };

            // Call the validateScheduleData function
            const result = validateScheduleData(scheduleData);

            // Verify that the data is invalid and the correct error message is returned
            expect(result).toEqual({ isValid: false, message: 'Missing required schedule fields.' });
        });

        it('should return invalid for missing startTime in days', () => {
            // Mock schedule data with missing startTime
            const scheduleData = {
                company: ['Test Company'],
                employeeName: 'admin',
                weekStartDate: '2025-04-27',
                days: {
                    sunday: { date: '2025-04-27', startTime: null, endTime: '17:00' },
                },
            };

            // Call the validateScheduleData function
            const result = validateScheduleData(scheduleData);

            // Verify that the data is invalid and the correct error message is returned
            expect(result).toEqual({ isValid: false, message: 'Invalid or missing data for sunday.' });
        });
    });

    describe('formatScheduleData', () => {
        it('should format schedule data correctly', () => {
            // Mock valid schedule data
            const scheduleData = {
                company: ['Test Company'],
                weekStartDate: '2025-04-27',
                days: {
                    sunday: { date: '2025-04-27', startTime: '09:00', endTime: '17:00' },
                },
            };

            // Call the formatScheduleData function
            const result = formatScheduleData(scheduleData);

            // Verify that the data is formatted correctly
            expect(result).toEqual({
                company: 'Test Company',
                weekStartDate: new Date('2025-04-27'),
                days: {
                    sunday: {
                        date: new Date('2025-04-27'),
                        startTime: new Date('2025-04-27T09:00'),
                        endTime: new Date('2025-04-27T17:00'),
                    },
                },
            });
        });

        it('should handle empty company array', () => {
            // Mock schedule data with an empty company array
            const scheduleData = {
                company: [],
                weekStartDate: '2025-04-27',
                days: {
                    sunday: { date: '2025-04-27', startTime: '09:00', endTime: '17:00' },
                },
            };

            // Call the formatScheduleData function
            const result = formatScheduleData(scheduleData);

            // Verify that the company is undefined
            expect(result.company).toBeUndefined();
        });
    });
});

describe('Uncovered lines in schedule.js', () => {
    let req, res;

    beforeEach(() => {
        // Mock request and response objects for testing
        req = {
            body: {
                employeeName: 'admin',
                weekStartDate: '2025-04-27',
                company: ['Test Company'],
                days: {
                    sunday: { date: '2025-04-27', startTime: '09:00', endTime: '17:00' },
                },
            },
        };
        res = {
            redirect: jest.fn(),
            flash: jest.fn(),
        };
    });

    it('should handle invalid company data (line 24)', async () => {
        // Set invalid company data
        req.body.company = null;

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that an error message is flashed and the user is redirected
        expect(res.flash).toHaveBeenCalledWith('error', 'Invalid company information provided.');
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should handle existing schedule (line 54)', async () => {
        // Mock database behavior: existing schedule found
        Schedule.findOne = jest.fn().mockResolvedValue({});

        // Call the createSchedule function
        await createSchedule(req, res);

        // Verify that an error message is flashed and the user is redirected
        expect(Schedule.findOne).toHaveBeenCalled();
        expect(res.flash).toHaveBeenCalledWith('error', 'A schedule already exists for this employee during the specified week.');
        expect(res.redirect).toHaveBeenCalledWith('/schedules/new');
    });

    it('should validate schedule data (lines 118-134)', () => {
        // Mock valid schedule data
        const validScheduleData = {
            company: ['Test Company'],
            employeeName: 'admin',
            weekStartDate: '2025-04-27',
            days: {
                sunday: { date: '2025-04-27', startTime: '09:00', endTime: '17:00' },
            },
        };

        // Call the validateScheduleData function
        const result = validateScheduleData(validScheduleData);

        // Verify that the data is valid
        expect(result).toEqual({ isValid: true });

        // Mock invalid schedule data (missing startTime)
        const invalidScheduleData = {
            ...validScheduleData,
            days: {
                sunday: { date: '2025-04-27', startTime: null, endTime: '17:00' }
            },
        };

        // Call the validateScheduleData function
        const invalidResult = validateScheduleData(invalidScheduleData);

        // Verify that the data is invalid and the correct error message is returned
        expect(invalidResult).toEqual({ isValid: false, message: 'Invalid or missing data for sunday.' });
    });
});