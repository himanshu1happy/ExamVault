const express = require('express');
const router = express.Router();

// 1. Import your controllers
const { createMessage, getAllMessages } = require('../controllers/messageController');

// 2. Import the Security Guards
const { protect, admin } = require('../middleware/authMiddleware');

// 3. Set up the Routes
// POST is PUBLIC: Anyone can send a message from the contact page
router.post('/', createMessage); 

// GET is STRICTLY PROTECTED: Only Logged-in Admins can view the inbox
router.get('/', protect, admin, getAllMessages); 

module.exports = router;