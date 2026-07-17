const Message = require('../models/Message'); // Ensure model path is correct

// @desc    Create a new contact message
// @route   POST /api/messages
const createMessage = async (req, res) => {
    try {
        const { userName, userEmail, subject, body } = req.body;

        if (!userName || !userEmail || !body) {
            return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
        }

        const newMessage = await Message.create({
            userName,
            userEmail,
            subject: subject || 'General Inquiry',
            body
        });

        res.status(201).json({ success: true, message: 'Message sent successfully!', data: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all messages (Admin Only)
// @route   GET /api/messages
const getAllMessages = async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚨 THIS EXPORT MUST EXACTLY MATCH WHAT ROUTES FILE IMPORTS
module.exports = {
    createMessage,
    getAllMessages
};