const Notification = require('../models/notification');
const Message = require('../models/message');
const { createMessageNotification, markNotificationsAsRead } = require('../controllers/messagesControllerTesting');

jest.mock('../models/notification');
jest.mock('../models/message');

describe('createMessageNotification', () => {
    // Clear all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create and save a notification when a valid message is provided', async () => {
        const mockMessage = {
            _id: 'message123',
            recipient: 'user456',
            senderName: 'John Doe',
            subject: 'Test Message',
            threadId: 'thread789'
        };

        const mockSave = jest.fn();
        Notification.mockImplementation(() => ({ save: mockSave }));

        await createMessageNotification(mockMessage);

        expect(Notification).toHaveBeenCalledWith({
            user: mockMessage.recipient,
            message: `New message from John Doe: ${mockMessage.subject}`,
            type: 'message',
            relatedId: mockMessage._id,
            link: `/messages/${mockMessage.threadId}`
        });

        expect(mockSave).toHaveBeenCalled();
    });

    it('should not create a notification if recipient is missing', async () => {
        const mockMessage = { _id: 'message123', subject: 'No Recipient' };

        await createMessageNotification(mockMessage);

        expect(Notification).not.toHaveBeenCalled();
    });
});

describe('markNotificationsAsRead', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should mark notifications as read for messages in a thread', async () => {
        // Setup test data
        const threadId = 'thread123';
        const userId = 'user456';
        
        // Mock the messages that would be found in the thread
        const mockMessages = [
            { _id: 'message1', threadId, recipient: userId },
            { _id: 'message2', threadId, recipient: userId }
        ];
        
        // Setup mock for Message.find to return our mock messages
        Message.find = jest.fn().mockResolvedValue(mockMessages);
        
        // Setup mock for Notification.updateMany
        Notification.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
        
        // Call the function
        await markNotificationsAsRead(threadId, userId);
        
        // Verify Message.find was called with correct parameters
        expect(Message.find).toHaveBeenCalledWith({ 
            threadId, 
            recipient: userId 
        });
        
        // Verify Notification.updateMany was called with correct parameters
        expect(Notification.updateMany).toHaveBeenCalledWith(
            { 
                user: userId,
                type: 'message',
                relatedId: { $in: ['message1', 'message2'] }
            },
            { isRead: true }
        );
    });
    
    it('should not update notifications if no messages are found', async () => {
        // Setup test data
        const threadId = 'emptyThread';
        const userId = 'user456';
        
        // Mock Message.find to return empty array (no messages found)
        Message.find = jest.fn().mockResolvedValue([]);
        
        // Setup mock for Notification.updateMany
        Notification.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
        
        // Call the function
        await markNotificationsAsRead(threadId, userId);
        
        // Verify Message.find was called
        expect(Message.find).toHaveBeenCalledWith({ 
            threadId, 
            recipient: userId 
        });
        
        // Verify Notification.updateMany was called with empty array of message IDs
        expect(Notification.updateMany).toHaveBeenCalledWith(
            { 
                user: userId,
                type: 'message',
                relatedId: { $in: [] }
            },
            { isRead: true }
        );
    });
    
    it('should handle errors gracefully', async () => {
        // Setup test data
        const threadId = 'thread123';
        const userId = 'user456';
        
        // Mock Message.find to throw an error
        const mockError = new Error('Database connection failed');
        Message.find = jest.fn().mockRejectedValue(mockError);
        
        // Spy on console.error
        console.error = jest.fn();
        
        // Call the function - should not throw
        await markNotificationsAsRead(threadId, userId);
        
        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
            'Error marking message notifications as read:', 
            mockError
        );
    });
});