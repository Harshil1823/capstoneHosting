const Notification = require('../models/notification');
const { markNotificationAsRead, clearAllNotifications } = require('../controllers/notificationRoute');

jest.mock('../models/notification');

describe('Notification Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: '123' },
            user: { _id: 'user123' },
            flash: jest.fn(),
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn(),
        };
    });

    describe('markNotificationAsRead', () => {
        it('should mark a notification as read', async () => {
            Notification.findByIdAndUpdate.mockResolvedValue({});

            await markNotificationAsRead(req, res);

            expect(Notification.findByIdAndUpdate).toHaveBeenCalledWith('123', { read: true });
            expect(res.json).toHaveBeenCalledWith({ message: 'Notification marked as read' });
        });

        it('should return a server error if an error occurs', async () => {
            Notification.findByIdAndUpdate.mockRejectedValue(new Error('Database Error'));

            await markNotificationAsRead(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
        });
    });

    describe('clearAllNotifications', () => {
        it('should delete all notifications for the user', async () => {
            Notification.deleteMany.mockResolvedValue({});

            await clearAllNotifications(req, res);

            expect(Notification.deleteMany).toHaveBeenCalledWith({ user: 'user123' });
            expect(req.flash).toHaveBeenCalledWith('success', 'All notifications cleared.');
            expect(res.redirect).toHaveBeenCalledWith('/notifications');
        });

        it('should handle errors and redirect back', async () => {
            Notification.deleteMany.mockRejectedValue(new Error('Database Error'));

            await clearAllNotifications(req, res);

            expect(req.flash).toHaveBeenCalledWith('error', 'Unable to clear notifications.');
            expect(res.redirect).toHaveBeenCalledWith('back');
        });
    });
});
