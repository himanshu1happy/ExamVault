const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, default: 'unread' }, // Admin can later mark as 'read'
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);