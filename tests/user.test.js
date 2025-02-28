const { authRegisterController } = require('../controllers/auth');
jest.mock('../models/user'); // Mock the User model.
const User = require('../models/user'); // Import the mocked User model.

describe('authRegisterController - Else Part', () => {
    it('Registers a new user and logs them in successfully', async () => {
        // Mock `req`, `res`, and `next`
        const req = {
            body: {
                username: 'Testing',
                companyName: 'HarshilLLC',
                workEmail: 'Harshil@email.com',
                password: 'testing',
                confirmPassword: 'testing',
            },
            flash: jest.fn(),
            login: jest.fn((user, callback) => callback(null)), // Simulate successful login.
        };

        const res = {
            redirect: jest.fn(),
        };

        const next = jest.fn();

        // Mock the `User` constructor
        const mockNewUser = { username: 'Testing', companyName: 'HarshilLLC', workEmail: 'Harshil@email.com' };
        User.mockImplementation(() => mockNewUser);

        // Mock `User.register` to return a mock registered user
        const mockRegisteredUser = { id: '123', username: 'Testing' };
        User.register.mockResolvedValue(mockRegisteredUser);

        // Call the function
        await authRegisterController(req, res, next);

        // Assertions
        expect(User).toHaveBeenCalledWith({
            username: 'Testing',
            companyName: 'HarshilLLC',
            workEmail: 'Harshil@email.com',
        });

        expect(User.register).toHaveBeenCalledWith(mockNewUser, 'testing');
        expect(req.login).toHaveBeenCalledWith(mockRegisteredUser, expect.any(Function));
        expect(req.flash).toHaveBeenCalledWith('success', 'Welcome to our page!');
        expect(res.redirect).toHaveBeenCalledWith('/tasks');
        expect(next).not.toHaveBeenCalled(); // Ensure no errors occurred.
    });

    it('Handles login errors and calls next with error', async () => {
        // Mock `req`, `res`, and `next`
        const req = {
            body: {
                username: 'Testing',
                companyName: 'HarshilLLC',
                workEmail: 'Harshil@email.com',
                password: 'testing',
                confirmPassword: 'testing',
            },
            flash: jest.fn(),
            login: jest.fn((user, callback) => callback(new Error('Login failed'))),
        };

        const res = {
            redirect: jest.fn(),
        };

        const next = jest.fn();

        // Mock the `User` constructor
        const mockNewUser = { username: 'Testing', companyName: 'HarshilLLC', workEmail: 'Harshil@email.com' };
        User.mockImplementation(() => mockNewUser);

        // Mock `User.register` to return a mock registered user
        const mockRegisteredUser = { id: '123', username: 'Testing' };
        User.register.mockResolvedValue(mockRegisteredUser);

        // Call the function
        await authRegisterController(req, res, next);

        // Assertions
        expect(User).toHaveBeenCalledWith({
            username: 'Testing',
            companyName: 'HarshilLLC',
            workEmail: 'Harshil@email.com',
        });

        expect(User.register).toHaveBeenCalledWith(mockNewUser, 'testing');
        expect(req.login).toHaveBeenCalledWith(mockRegisteredUser, expect.any(Function));
        expect(next).toHaveBeenCalledWith(expect.any(Error)); // Ensure error is passed to `next`.
        expect(req.flash).not.toHaveBeenCalledWith('success', 'Welcome to our page!');
        expect(res.redirect).not.toHaveBeenCalledWith('/tasks');
    });

    it('Handles password mismatch', async () => {
        const req = {
            body: {
                username: 'Testing',
                companyName: 'HarshilLLC',
                workEmail: 'Harshil@email.com',
                password: 'testing',
                confirmPassword: 'differentPassword',  // different password to test mismatch
            },
            flash: jest.fn(),
        };
    
        const res = {
            redirect: jest.fn(),
        };
    
        const next = jest.fn();
    
        await authRegisterController(req, res, next);
    
        expect(req.flash).toHaveBeenCalledWith('error', 'Passwords do not match! Try again.'); // expected error message
        expect(res.redirect).toHaveBeenCalledWith('/register');
        expect(next).not.toHaveBeenCalled();
    });
    
});
