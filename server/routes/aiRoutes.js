const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { askStudyAssistant } = require('../controllers/aiController');

router.post('/study-assistant', protect, askStudyAssistant);

module.exports = router;
