const Message = require('../models/message');
const Notification = require('../models/notification');

// This controller integrates message system with the existing notifications system

// Creates a notification for new messages
async function createMessageNotification(message) {
    try {
        if (!message.recipient) return;
        
        // Create a notification entry for the recipient
        const notification = new Notification({
            user: message.recipient,
            message: `New message from ${message.senderName || 'a user'}: ${message.subject}`,
            type: 'message',
            relatedId: message._id,
            link: `/messages/${message.threadId}`
        });
        
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating message notification:', error);
    }
}

// Marks message notifications as read when viewing a thread
async function markNotificationsAsRead(threadId, userId) {
    try {
        // Find messages in this thread
        const messages = await Message.find({ threadId, recipient: userId });
        
        // Get message IDs
        const messageIds = messages.map(msg => msg._id);
        
        // Mark related notifications as read
        await Notification.updateMany(
            { 
                user: userId,
                type: 'message',
                relatedId: { $in: messageIds }
            },
            { isRead: true }
        );
    } catch (error) {
        console.error('Error marking message notifications as read:', error);
    }
}

module.exports = {
    createMessageNotification,
    markNotificationsAsRead
};