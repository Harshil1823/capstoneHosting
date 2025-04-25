const { authRegisterController, renderLoginForm, 
    logoutController, authLoginController, uploadProfilePhotoController, updateProfileController, changePasswordController, updateAdminUserController} = require('../controllers/auth');

const User = require('../models/user'); // Import the mocked User model.
const Analytics = require('../models/analytics');
const cloudinary = require('../cloudinary');
jest.mock('../models/user'); // Mock the User model.
jest.mock('../models/analytics');
jest.mock('../cloudinary');

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

describe('renderLoginform controller', () => {
    it('redirects to /tasks page when user is authenticated', () => {
        const req = {
            isAuthenticated : jest.fn().mockReturnValue(true),
        };
        const res = {
            redirect: jest.fn(),
            render: jest.fn(),
        };
        renderLoginForm(req, res);

        expect(req.isAuthenticated).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/tasks');
        expect(res.render).not.toHaveBeenCalled();
    });

    it('renders the login page when the user is not authenticated', () => {
        const req = {
            isAuthenticated : jest.fn().mockReturnValue(false),
        };
        const res = {
            redirect: jest.fn(),
            render: jest.fn(),
        };
        renderLoginForm(req, res);
        expect(req.isAuthenticated).toHaveBeenCalledWith();
        expect(res.redirect).not.toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('users/login');
    });
});

describe('logoutController', () => {
    let req, res, next;
    
    beforeEach(() => {
        req = {
            logout: jest.fn(),
            flash: jest.fn()
        };
        res = {
            redirect: jest.fn()
        };
        next = jest.fn();
    });

    it('logs out the user successfully', () => {
        // Simulate successful logout.
        req.logout.mockImplementation((cb) => cb(null));

        logoutController(req, res, next);

        expect(req.logout).toHaveBeenCalledWith(expect.any(Function));
        expect(req.flash).toHaveBeenCalledWith('success', 'You have successfully logged out!');
        expect(res.redirect).toHaveBeenCalledWith('/login');
        expect(next).not.toHaveBeenCalled();
    });
    it('calls next with error when logout fails', () => {
        const error = new Error('Logout failed');
        // Simulate logout failure.
        req.logout.mockImplementation((cb) => cb(error));

        logoutController(req, res, next);

        expect(req.logout).toHaveBeenCalledWith(expect.any(Function));
        expect(next).toHaveBeenCalledWith(error);
        // No flash or redirect should occur on error.
        expect(req.flash).not.toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
    });
});

describe('authLoginController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { company: 'TestCompany' },
            flash: jest.fn(),
            session: { returnTo: '/some/path' }
        };
        res = {
            locals: { returnTo: '/custom/path' },
            redirect: jest.fn()
        };
        next = jest.fn();
    });
    it('updates analytics, flashes success, and redirects using res.locals.returnTo', async () => {
        // Set Analytics.findOneAndUpdate to resolve successfully.
        Analytics.findOneAndUpdate.mockResolvedValue({});
        await authLoginController(req, res, next);
        // Verify Analytics is updated.
        expect(Analytics.findOneAndUpdate).toHaveBeenCalledWith(
            { 
                company: req.user.company,
                date: expect.any(Object) // today's date with time zeroed
            },
            { 
                $inc: { 'dailyStats.userLogins': 1 }
            },
            { upsert: true }
        );
        // Verify flash and redirect.
        expect(req.flash).toHaveBeenCalledWith('success', 'Welcome back!');
        expect(res.redirect).toHaveBeenCalledWith('/custom/path');
        // Ensure session.returnTo was removed.
        expect(req.session.returnTo).toBeUndefined();
        // next should not have been called.
        expect(next).not.toHaveBeenCalled();
    });
    it('calls next with error when Analytics update fails', async () => {
        const error = new Error('Analytics update failed');
        Analytics.findOneAndUpdate.mockRejectedValue(error);

        await authLoginController(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        // When an error happens, no flash or redirect should occur.
        expect(req.flash).not.toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
    });
});

describe('uploadProfilePhotoController', () => {
    let req, res, next;
    beforeEach(() => {
        req = {
            file: { path: 'new/path', filename: 'newfilename' },
            user: {
                _id: '123',
                company: 'TestCompany',
                profileImage: { filename: 'oldfilename' } // for tests where an old image exists
            },
            flash: jest.fn()
        };
        res = {
            redirect: jest.fn()
        };
        next = jest.fn();

        // Reset all mocks before each test.
        jest.clearAllMocks();
    });
    it('should redirect with error when no file is provided', async () => {
        req.file = undefined;

        await uploadProfilePhotoController(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('error', 'No file selected');
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });
    it('should update profile photo successfully when file is provided and old image exists', async () => {
        // Simulate cloudinary destroy resolving successfully.
        cloudinary.uploader = {
            destroy: jest.fn().mockResolvedValue({})
        };

        const updatedUser = { _id: '123', profileImage: { url: 'new/path', filename: 'newfilename' } };
        User.findByIdAndUpdate.mockResolvedValue(updatedUser);
        Analytics.findOneAndUpdate.mockResolvedValue({});

        await uploadProfilePhotoController(req, res, next);

        // Verify that the old image was deleted.
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('oldfilename');

        // Verify that the user is updated with the new image info.
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            req.user._id,
            { profileImage: { url: req.file.path, filename: req.file.filename } },
            { new: true }
        );

        // Verify that analytics are updated.
        expect(Analytics.findOneAndUpdate).toHaveBeenCalledWith(
            { company: req.user.company, date: expect.any(Object) },
            { $inc: { 'dailyStats.profileUpdates': 1 } },
            { upsert: true }
        );

        // Verify flash and redirect.
        expect(req.flash).toHaveBeenCalledWith('success', 'Profile photo updated successfully');
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });
    it('should catch errors, flash error message, and redirect when an error occurs', async () => {
        // Simulate cloudinary destroy resolving.
        cloudinary.uploader = {
            destroy: jest.fn().mockResolvedValue({})
        };

        // Simulate an error in User.findByIdAndUpdate.
        const error = new Error('Update failed');
        User.findByIdAndUpdate.mockRejectedValue(error);

        await uploadProfilePhotoController(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('error', 'Error updating profile image: ' + error.message);
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });
});

describe('updateProfileController', () => {
    let req, res, next;
    
    // Define common variables in an outer beforeEach block.
    beforeEach(() => {
        req = {
            body: {
                firstName: 'John',
                lastName: 'Doe',
                workEmail: 'john.doe@example.com',
                phoneNumber: '1234567890'
            },
            user: {
                _id: 'user123',
                role: 'User',
                company: 'TestCompany',
                profileImage: { filename: 'oldImage' }
            },
            file: { path: 'new/path', filename: 'newImage' },
            flash: jest.fn()
        };
        res = {
            redirect: jest.fn()
        };
        next = jest.fn();
        
        jest.clearAllMocks();
    });

    describe('Non-Admin Users', () => {
        beforeEach(() => {
            req.user.role = 'User';
        });
        
        it('updates profile without image upload (non-admin)', async () => {
            req.file = undefined;
            User.findByIdAndUpdate.mockResolvedValue({ _id: 'user123' });
            Analytics.findOneAndUpdate.mockResolvedValue({});
            
            await updateProfileController(req, res, next);
            
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                req.user._id,
                { firstName: 'John', lastName: 'Doe', phoneNumber: '1234567890' },
                { new: true, runValidators: true }
            );
            expect(Analytics.findOneAndUpdate).toHaveBeenCalledWith(
                { company: req.user.company, date: expect.any(Object) },
                { $inc: { 'dailyStats.profileUpdates': 1 } },
                { upsert: true }
            );
            expect(req.flash).toHaveBeenCalledWith('success', 'Profile updated successfully');
            expect(res.redirect).toHaveBeenCalledWith('/profile');
        });

        it('updates profile with image upload (non-admin)', async () => {
            cloudinary.uploader = { destroy: jest.fn().mockResolvedValue({}) };
            User.findByIdAndUpdate.mockResolvedValue({ _id: 'user123', profileImage: { url: 'new/path', filename: 'newImage' } });
            Analytics.findOneAndUpdate.mockResolvedValue({});
            
            await updateProfileController(req, res, next);
            
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('oldImage');
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                req.user._id,
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890',
                    profileImage: { url: 'new/path', filename: 'newImage' }
                },
                { new: true, runValidators: true }
            );
            expect(req.flash).toHaveBeenCalledWith('success', 'Profile updated successfully');
            expect(res.redirect).toHaveBeenCalledWith('/profile');
        });
    });

    describe('Admin Users', () => {
        beforeEach(() => {
            // Now that req is defined, we can modify it safely.
            req.user.role = 'Admin';
        });

        it('rejects update if email format is invalid', async () => {
            req.body.workEmail = 'invalid-email';
            
            await updateProfileController(req, res, next);
            
            expect(req.flash).toHaveBeenCalledWith('error', 'Invalid email format');
            expect(res.redirect).toHaveBeenCalledWith('/profile');
            expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        });
        
        it('rejects update if email is already in use', async () => {
            req.body.workEmail = 'admin@example.com';
            User.findOne.mockResolvedValue({ _id: 'anotherUser' });
            
            await updateProfileController(req, res, next);
            
            expect(User.findOne).toHaveBeenCalledWith({
                workEmail: 'admin@example.com',
                _id: { $ne: req.user._id }
            });
            expect(req.flash).toHaveBeenCalledWith('error', 'Email address is already in use');
            expect(res.redirect).toHaveBeenCalledWith('/profile');
            expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        });
        
        it('updates profile successfully for admin without image upload', async () => {
            req.body.workEmail = 'admin@example.com';
            User.findOne.mockResolvedValue(null);
            User.findByIdAndUpdate.mockResolvedValue({ _id: 'user123' });
            Analytics.findOneAndUpdate.mockResolvedValue({});
            req.file = undefined;
            
            await updateProfileController(req, res, next);
            
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                req.user._id,
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    workEmail: 'admin@example.com',
                    phoneNumber: '1234567890'
                },
                { new: true, runValidators: true }
            );
            expect(req.flash).toHaveBeenCalledWith('success', 'Profile updated successfully');
            expect(res.redirect).toHaveBeenCalledWith('/profile');
        });
        
        it('updates profile successfully for admin with image upload', async () => {
            req.body.workEmail = 'admin@example.com';
            User.findOne.mockResolvedValue(null);
            cloudinary.uploader = { destroy: jest.fn().mockResolvedValue({}) };
            User.findByIdAndUpdate.mockResolvedValue({ _id: 'user123', profileImage: { url: 'new/path', filename: 'newImage' } });
            Analytics.findOneAndUpdate.mockResolvedValue({});
            
            await updateProfileController(req, res, next);
            
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('oldImage');
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                req.user._id,
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    workEmail: 'admin@example.com',
                    phoneNumber: '1234567890',
                    profileImage: { url: 'new/path', filename: 'newImage' }
                },
                { new: true, runValidators: true }
            );
            expect(req.flash).toHaveBeenCalledWith('success', 'Profile updated successfully');
            expect(res.redirect).toHaveBeenCalledWith('/profile');
        });
    });
});
describe('changePasswordController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                currentPassword: 'oldPass',
                newPassword: 'newPass',
                confirmPassword: 'newPass'
            },
            user: {
                _id: 'user123',
                company: 'TestCompany'
            },
            flash: jest.fn()
        };
        res = {
            redirect: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });
    it('should redirect and flash error if new passwords do not match', async () => {
        req.body.confirmPassword = 'differentPass';

        await changePasswordController(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('error', 'New passwords do not match');
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });
    it('should change the password successfully and update analytics', async () => {
        // Create a fake user with a changePassword method.
        const fakeUser = {
            changePassword: jest.fn().mockResolvedValue(true)
        };
        User.findById.mockResolvedValue(fakeUser);
        Analytics.findOneAndUpdate.mockResolvedValue({});

        await changePasswordController(req, res, next);

        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(fakeUser.changePassword).toHaveBeenCalledWith('oldPass', 'newPass');
        expect(Analytics.findOneAndUpdate).toHaveBeenCalledWith(
            { 
                company: 'TestCompany',
                date: expect.any(Object)
            },
            { 
                $inc: { 'dailyStats.passwordChanges': 1 }
            },
            { upsert: true }
        );
        expect(req.flash).toHaveBeenCalledWith('success', 'Password changed successfully');
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });
    it('should flash an error and redirect if changePassword fails', async () => {
        // Simulate an error (e.g., current password incorrect)
        const fakeUser = {
            changePassword: jest.fn().mockRejectedValue(new Error('Update failed'))
        };
        User.findById.mockResolvedValue(fakeUser);

        await changePasswordController(req, res, next);

        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(fakeUser.changePassword).toHaveBeenCalledWith('oldPass', 'newPass');
        expect(req.flash).toHaveBeenCalledWith('error', 'Current password is incorrect');
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });
});

describe('updateAdminUserController', () => {
    let req, res, next;
    
    beforeEach(() => {
        req = {
            params: { id: 'user123' },
            body: {
                firstName: 'Jane',
                lastName: 'Smith',
                workEmail: 'jane.smith@example.com',
                phoneNumber: '5551234567',
                role: 'Manager',
                //hireDate: '2025-05-15'
            },
            user: {
                _id: 'admin456',
                company: 'CompanyA'
            },
            file: { path: 'new/path', filename: 'newImage' },
            flash: jest.fn()
        };
        res = {
            redirect: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });
    it('should flash error and redirect if user not found', async () => {
        User.findById.mockResolvedValue(null);
        
        await updateAdminUserController(req, res, next);
        
        expect(req.flash).toHaveBeenCalledWith('error', 'User not found');
        expect(res.redirect).toHaveBeenCalledWith('/admin/users');
    });


    it('should flash error and redirect if user not found', async () => {
        // Simulate user not found
        User.findById.mockResolvedValue(null);
        
        await updateAdminUserController(req, res, next);
        
        expect(req.flash).toHaveBeenCalledWith('error', 'User not found');
        expect(res.redirect).toHaveBeenCalledWith('/admin/users');
    });
    
    it('should update user successfully', async () => {
        // Simulate found user
        const foundUser = { 
            _id: 'user123',
            role: 'Employee' 
        };
        User.findById.mockResolvedValue(foundUser);
        User.findByIdAndUpdate.mockResolvedValue(foundUser);
        
        await updateAdminUserController(req, res, next);
        
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            'user123',
            {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                workEmail: req.body.workEmail,
                phoneNumber: req.body.phoneNumber,
                hireDate: req.body.hireDate ? new Date(req.body.hireDate) : null,
                role: req.body.role
            },
            { new: true }
        );
        expect(req.flash).toHaveBeenCalledWith('success', 'User updated successfully');
        expect(res.redirect).toHaveBeenCalledWith('/admin/users');
    });
    
    it('should update user without changing role if provided role is invalid', async () => {
        req.body.role = 'InvalidRole';
        const foundUser = { 
            _id: 'user123', 
            role: 'Employee' // Original role
        };
        User.findById.mockResolvedValue(foundUser);
        User.findByIdAndUpdate.mockResolvedValue(foundUser);
        
        await updateAdminUserController(req, res, next);
        
        // Role should be the original user's role since 'InvalidRole' is not valid
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            'user123',
            {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                workEmail: req.body.workEmail,
                phoneNumber: req.body.phoneNumber,
                hireDate: req.body.hireDate ? new Date(req.body.hireDate) : null,
                role: 'Employee' // Should use the original role
            },
            { new: true }
        );
        expect(req.flash).toHaveBeenCalledWith('success', 'User updated successfully');
        expect(res.redirect).toHaveBeenCalledWith('/admin/users');
    });
});