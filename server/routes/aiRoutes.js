const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const { askStudyAssistant } = require('../controllers/aiController');

// Per-user rate limit for the AI assistant: 20 requests per 10 minutes
const aiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?._id?.toString() || req.ip;
    },
    message: {
        success: false,
        message: 'AI request limit reached. You can make up to 20 requests every 10 minutes. Please wait before asking again.'
    }
});

router.post('/study-assistant', protect, aiLimiter, askStudyAssistant);

module.exports = router;
