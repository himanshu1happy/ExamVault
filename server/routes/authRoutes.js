const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { registerUser, verifyOTP, loginUser, getSavedPapers, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.get('/saved-papers', protect, getSavedPapers);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
