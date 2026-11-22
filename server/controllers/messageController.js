const Message = require('../models/Message');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
};

// @desc    Create a new contact message
// @route   POST /api/messages
const createMessage = async (req, res) => {
    try {
        let { userName, userEmail, subject, body } = req.body;

        // If user token is provided in headers, attempt to autofill missing user details
        if ((!userName || !userEmail) && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('fullname email');
                if (user) {
                    userName = userName || user.fullname;
                    userEmail = userEmail || user.email;
                }
            } catch (err) {
                // Token parse failure is non-fatal for public contact endpoint
            }
        }

        const cleanEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
        const cleanName = typeof userName === 'string' && userName.trim() ? userName.trim() : 'Student';
        const cleanSubject = typeof subject === 'string' && subject.trim() ? subject.trim() : 'General Inquiry';
        const cleanBody = typeof body === 'string' ? body.trim() : '';

        if (!cleanEmail || !isValidEmail(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        if (!cleanBody) {
            return res.status(400).json({ success: false, message: 'Message body is required.' });
        }

        if (cleanSubject.length > 120) {
            return res.status(400).json({ success: false, message: 'Subject must be 120 characters or fewer.' });
        }

        if (cleanBody.length > 2000) {
            return res.status(400).json({ success: false, message: 'Message body must be 2000 characters or fewer.' });
        }

        await Message.create({
            userName: cleanName,
            userEmail: cleanEmail,
            subject: cleanSubject,
            body: cleanBody
        });

        // Security rule: Do not return the created document back to client
        res.status(201).json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.' });
    }
};

// @desc    Get all messages (Admin Only)
// @route   GET /api/messages
const getAllMessages = async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        console.error('Get all messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
    }
};

module.exports = {
    createMessage,
    getAllMessages
};
