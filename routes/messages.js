const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const { isLoggedin } = require('../middleware');
const Message = require('../models/message');
const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');
const messageNotificationController = require('../controllers/messageNotifications');

// Get inbox messages
router.get('/inbox', isLoggedin, catchAsync(async (req, res) => {
    // Find unique threads where user is the recipient
    const messages = await Message.aggregate([
        {
            $match: {
                recipient: req.user._id
            }
        },
        {
            $sort: { createdAt: -1 } // Sort by newest first
        },
        {
            $group: {
                _id: "$threadId",
                messageId: { $first: "$_id" },
                sender: { $first: "$sender" },
                subject: { $first: "$subject" },
                content: { $first: "$content" },
                read: { $first: "$read" },
                createdAt: { $first: "$createdAt" }
            }
        }
    ]);

    // Populate sender information
    const populatedMessages = await User.populate(messages, { path: 'sender', select: 'username firstName lastName company' });
    
    // Count unread messages
    const unreadCount = await Message.countDocuments({ 
        recipient: req.user._id, 
        read: false 
    });

    res.render('messages/inbox', { messages: populatedMessages, unreadCount });
}));

// Get sent messages
router.get('/sent', isLoggedin, catchAsync(async (req, res) => {
    // Find unique threads where user is the sender
    const messages = await Message.aggregate([
        {
            $match: {
                sender: req.user._id
            }
        },
        {
            $sort: { createdAt: -1 } // Sort by newest first
        },
        {
            $group: {
                _id: "$threadId",
                messageId: { $first: "$_id" },
                recipient: { $first: "$recipient" },
                subject: { $first: "$subject" },
                content: { $first: "$content" },
                createdAt: { $first: "$createdAt" }
            }
        }
    ]);

    // Populate recipient information
    const populatedMessages = await User.populate(messages, { path: 'recipient', select: 'username firstName lastName company' });
    
    res.render('messages/sent', { messages: populatedMessages });
}));

router.get('/new', isLoggedin, catchAsync(async (req, res) => {
  console.log('New message route accessed');
  try {
      // Find all users in the same company
      const users = await User.find({ 
          company: req.user.company,
          _id: { $ne: req.user._id } // Exclude current user
      });
      
      // If a recipient ID is provided (for replying)
      const recipientId = req.query.to;
      const subject = req.query.subject ? `Re: ${req.query.subject}` : '';
      
      // Count unread messages
      const unreadCount = await Message.countDocuments({ 
          recipient: req.user._id, 
          read: false 
      });
      
      // Include an empty messages array
      const messages = [];
      
      console.log('Rendering new message form');
      res.render('messages/new', { users, recipientId, subject, unreadCount, messages });
  } catch (err) {
      console.error('Error in new message route:', err);
      req.flash('error', 'Something went wrong');
      res.redirect('/messages');
  }
}));

// View a thread
router.get('/:threadId', isLoggedin, catchAsync(async (req, res) => {
    const { threadId } = req.params;
    
    // Get all messages in this thread
    const messages = await Message.find({ threadId })
        .populate('sender', 'username firstName lastName')
        .sort({ createdAt: 1 }); // Oldest first
    
    // Mark messages as read if user is the recipient
    await Message.updateMany(
        { threadId, recipient: req.user._id, read: false },
        { read: true }
    );
    
    // Also mark related notifications as read
    await messageNotificationController.markNotificationsAsRead(threadId, req.user._id);
    
    // Determine the other participant (not the current user)
    let otherParticipant;
    if (messages.length > 0) {
        const firstMessage = messages[0];
        if (firstMessage.sender._id.equals(req.user._id)) {
            otherParticipant = await User.findById(firstMessage.recipient);
        } else {
            otherParticipant = firstMessage.sender;
        }
    }
    
    res.render('messages/thread', { messages, threadId, otherParticipant });
}));

// Send a new message
router.post('/', isLoggedin, catchAsync(async (req, res) => {
    const { recipient, subject, content, replyToThread } = req.body;
    
    // Validate recipient exists and is in the same company
    const recipientUser = await User.findById(recipient);
    if (!recipientUser || !recipientUser.company.equals(req.user.company)) {
        req.flash('error', 'Invalid recipient');
        return res.redirect('/messages/new');
    }
    
    let threadId = replyToThread || uuidv4(); // Generate new thread ID or use existing one
    
    const message = new Message({
        sender: req.user._id,
        recipient,
        subject,
        content,
        threadId,
        company: req.user.company
    });
    
    await message.save();
    
    // Create notification for the recipient
    await messageNotificationController.createMessageNotification({
        _id: message._id,
        recipient,
        senderName: req.user.firstName && req.user.lastName 
            ? `${req.user.firstName} ${req.user.lastName}` 
            : req.user.username,
        subject,
        threadId
    });
    
    req.flash('success', 'Message sent successfully');
    res.redirect('/messages/sent');
}));

// Delete a message (for the future)
router.delete('/:id', isLoggedin, catchAsync(async (req, res) => {
    const { id } = req.params;
    const message = await Message.findById(id);
    
    if (!message) {
        req.flash('error', 'Message not found');
        return res.redirect('/messages/inbox');
    }
    
    // Ensure the user is either the sender or recipient
    if (!message.sender.equals(req.user._id) && !message.recipient.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to delete this message');
        return res.redirect('/messages/inbox');
    }
    
    await Message.findByIdAndDelete(id);
    req.flash('success', 'Message deleted');
    res.redirect('/messages/inbox');
}));

// API endpoint to check for new messages (used by the notification system)
router.get('/check-new', isLoggedin, catchAsync(async (req, res) => {
    // Find unread messages
    const unreadCount = await Message.countDocuments({
        recipient: req.user._id,
        read: false
    });
    
    // Check for messages received in the last minute (for notifications)
    const oneMinuteAgo = new Date(Date.now() - 60000); // 1 minute ago
    const newMessages = await Message.find({
        recipient: req.user._id,
        read: false,
        createdAt: { $gt: oneMinuteAgo }
    }).populate('sender', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5);
    
    // Format new messages for the frontend
    const formattedNewMessages = newMessages.map(msg => ({
        id: msg._id,
        threadId: msg.threadId,
        subject: msg.subject,
        senderName: msg.sender.firstName && msg.sender.lastName 
            ? `${msg.sender.firstName} ${msg.sender.lastName}` 
            : msg.sender.username,
        createdAt: msg.createdAt
    }));
    
    res.json({
        unreadCount,
        newMessages: formattedNewMessages
    });
}));

module.exports = router;