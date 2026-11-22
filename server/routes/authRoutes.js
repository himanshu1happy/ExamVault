const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { imageUpload } = require('../middleware/upload');
const {
    registerUser,
    verifyOTP,
    resendOTP,
    loginUser,
    getCurrentUser,
    getSavedPapers,
    forgotPassword,
    resetPassword,
    uploadProfilePhoto,
    removeProfilePhoto
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.get('/saved-papers', protect, getSavedPapers);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/profile-photo', protect, imageUpload.single('photo'), uploadProfilePhoto);
router.delete('/profile-photo', protect, removeProfilePhoto);

module.exports = router;
