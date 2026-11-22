const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { toPublicUser } = require('../utils/userRole');
const { uploadBuffer, deleteFile } = require('../utils/cloudinaryUpload');

const escapeHtml = (text) => {
    return String(text || '').replace(/[&<>'"]/g, (tag) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
};

const normalizeEmail = (email) => {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
};

const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    return typeof password === 'string' && passwordRegex.test(password);
};

const hashToken = (token) => {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user & Send OTP (With SHA-256 Hashing & Strict Validation)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;
        const cleanEmail = normalizeEmail(email);
        const cleanFullname = typeof fullname === 'string' ? fullname.trim() : '';

        // 1. Validation
        if (!cleanFullname || cleanFullname.length < 2 || cleanFullname.length > 60) {
            return res.status(400).json({ success: false, message: 'Full name must be between 2 and 60 characters.' });
        }

        if (!cleanEmail || !isValidEmail(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one letter and one number.'
            });
        }

        // 2. Check existing user
        let user = await User.findOne({ email: cleanEmail });

        const rawOtp = crypto.randomInt(100000, 1000000).toString();
        const hashedOtp = hashToken(rawOtp);
        const otpExpires = Date.now() + 10 * 60 * 1000;

        if (user) {
            if (user.isVerified) {
                return res.status(400).json({ success: false, message: 'Email already registered and verified.' });
            }

            user.fullname = cleanFullname;
            user.password = password;
            user.otp = hashedOtp;
            user.otpExpires = otpExpires;
            user.otpAttempts = 0;
            user.otpLastSent = Date.now();
            await user.save();
        } else {
            user = await User.create({
                fullname: cleanFullname,
                email: cleanEmail,
                password,
                otp: hashedOtp,
                otpExpires,
                otpAttempts: 0,
                otpLastSent: Date.now()
            });
        }

        // 3. Send email with HTML-escaped fullname
        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px; background: #f4f4f4; text-align: center;">
                <h2 style="color: #6c5ce7;">Welcome to ExamVault! 🎓</h2>
                <p>Hi ${escapeHtml(cleanFullname)},</p>
                <p>Your 6-digit account verification code is:</p>
                <h1 style="background: #ffffff; padding: 10px; letter-spacing: 5px; border-radius: 5px; color: #d63031;">${rawOtp}</h1>
                <p>This code is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
        `;

        try {
            await sendEmail({ email: user.email, subject: 'Verify Your ExamVault Account', message });
            res.status(200).json({ success: true, message: 'OTP sent to your email. Please verify.' });
        } catch (emailError) {
            console.error('Email delivery failed during registration:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Account initiated, but failed to send OTP email. Please click register again to retry.'
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
};

// @desc    Verify OTP & Activate Account
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const cleanEmail = normalizeEmail(email);
        const cleanOtp = typeof otp === 'string' ? otp.trim() : '';

        if (!cleanEmail || !cleanOtp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Account is already verified.' });
        }

        if (!user.otp || !user.otpExpires) {
            return res.status(400).json({ success: false, message: 'No pending verification code found. Please request a new one.' });
        }

        if (user.otpAttempts >= 5) {
            user.otp = undefined;
            user.otpExpires = undefined;
            user.otpAttempts = 0;
            await user.save({ validateBeforeSave: false });
            return res.status(400).json({
                success: false,
                message: 'Maximum verification attempts exceeded. Verification code invalidated. Please request a new one.'
            });
        }

        if (new Date(user.otpExpires).getTime() < Date.now()) {
            user.otp = undefined;
            user.otpExpires = undefined;
            user.otpAttempts = 0;
            await user.save({ validateBeforeSave: false });
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        }

        const candidateHash = hashToken(cleanOtp);
        const storedHash = user.otp;
        const candidateBuffer = Buffer.from(candidateHash, 'hex');
        const storedBuffer = Buffer.from(storedHash, 'hex');

        const isMatch = candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);

        if (!isMatch) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            const remainingAttempts = Math.max(0, 5 - user.otpAttempts);

            if (user.otpAttempts >= 5) {
                user.otp = undefined;
                user.otpExpires = undefined;
                user.otpAttempts = 0;
                await user.save({ validateBeforeSave: false });
                return res.status(400).json({
                    success: false,
                    message: 'Maximum verification attempts exceeded. Verification code invalidated. Please request a new one.'
                });
            }

            await user.save({ validateBeforeSave: false });
            return res.status(400).json({
                success: false,
                message: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
            });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        user.otpAttempts = 0;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: toPublicUser(user)
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
    }
};

// @desc    Resend OTP (60-second cooldown per user)
// @route   POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = normalizeEmail(email);

        if (!cleanEmail || !isValidEmail(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Account is already verified.' });
        }

        const COOLDOWN_MS = 60 * 1000;
        if (user.otpLastSent && (Date.now() - new Date(user.otpLastSent).getTime()) < COOLDOWN_MS) {
            const remainingSec = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(user.otpLastSent).getTime())) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${remainingSec} second(s) before requesting another verification code.`
            });
        }

        const rawOtp = crypto.randomInt(100000, 1000000).toString();
        user.otp = hashToken(rawOtp);
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        user.otpAttempts = 0;
        user.otpLastSent = Date.now();
        await user.save({ validateBeforeSave: false });

        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px; background: #f4f4f4; text-align: center;">
                <h2 style="color: #6c5ce7;">Your New ExamVault Verification Code 🎓</h2>
                <p>Hi ${escapeHtml(user.fullname)},</p>
                <p>Your new 6-digit account verification code is:</p>
                <h1 style="background: #ffffff; padding: 10px; letter-spacing: 5px; border-radius: 5px; color: #d63031;">${rawOtp}</h1>
                <p>This code is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
        `;

        try {
            await sendEmail({ email: user.email, subject: 'Your New ExamVault Verification Code', message });
            res.status(200).json({ success: true, message: 'New verification code sent to your email.' });
        } catch (emailError) {
            console.error('Email delivery failed during resend OTP:', emailError);
            res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again later.' });
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to resend verification code. Please try again.' });
    }
};

// @desc    Login User
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = normalizeEmail(email);

        if (!cleanEmail || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: cleanEmail });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email to access your account.' });
        }

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: toPublicUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
};

// @desc    Return the current authenticated user's public session data
// @route   GET /api/auth/me
const getCurrentUser = async (req, res) => {
    res.status(200).json({ success: true, user: toPublicUser(req.user) });
};

// @desc    Get the authenticated user's saved papers
// @route   GET /api/auth/saved-papers
// @access  Private
const getSavedPapers = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('savedPapers')
            .populate('savedPapers', 'title examType year subject pdfUrl');

        const savedPapers = (user.savedPapers || []).filter(Boolean);
        res.status(200).json({ success: true, count: savedPapers.length, data: savedPapers });
    } catch (error) {
        console.error('Get saved papers error:', error);
        res.status(500).json({ success: false, message: 'Failed to load saved papers.' });
    }
};

// @desc    Send password reset link (Uses APP_URL, checks production)
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = normalizeEmail(email);

        if (!cleanEmail) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
        if (!appUrl && process.env.NODE_ENV === 'production') {
            console.error('FATAL ERROR: APP_URL environment variable is required in production.');
            return res.status(500).json({ success: false, message: 'Server configuration error. Please try again later.' });
        }

        const responseMessage = 'If that email exists, a password reset link has been sent.';
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(200).json({ success: true, message: responseMessage });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = hashToken(resetToken);
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        const port = process.env.PORT || 5001;
        const baseUrl = appUrl || `http://localhost:${port}`;
        const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px; background: #f4f4f4;">
                <h2 style="color: #6c5ce7;">Reset Your ExamVault Password</h2>
                <p>Hi ${escapeHtml(user.fullname)},</p>
                <p>We received a request to reset your password. Click the link below to set a new password:</p>
                <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #6c5ce7; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
                <p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>
            </div>
        `;

        try {
            await sendEmail({ email: user.email, subject: 'Reset Your ExamVault Password', message });
            res.status(200).json({ success: true, message: responseMessage });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            console.error('Password reset email failed:', emailError);
            res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Failed to process request. Please try again later.' });
    }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one letter and one number.'
            });
        }

        const hashedToken = hashToken(req.params.token);
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful. You can now sign in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Password reset failed. Please try again.' });
    }
};

// @desc    Upload profile photo directly to Cloudinary (Protected)
// @route   POST /api/auth/profile-photo
// @access  Private
const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'Please attach an image file.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Upload new photo to Cloudinary
        const uploadResult = await uploadBuffer(req.file.buffer, {
            folder: 'ExamVault_Profiles',
            resourceType: 'image',
            publicIdPrefix: `user-${user._id}`
        });

        // Delete old photo if existed
        if (user.photoPublicId) {
            await deleteFile(user.photoPublicId, 'image').catch((err) => {
                console.error('Failed to delete old profile photo:', err.message);
            });
        }

        user.photoUrl = uploadResult.url;
        user.photoPublicId = uploadResult.publicId;
        user.profilePhoto = uploadResult.url;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile photo updated successfully.',
            photoUrl: user.photoUrl,
            data: { photoUrl: user.photoUrl }
        });
    } catch (error) {
        console.error('Upload profile photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload profile photo.' });
    }
};

// @desc    Remove profile photo (Protected)
// @route   DELETE /api/auth/profile-photo
// @access  Private
const removeProfilePhoto = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.photoPublicId) {
            await deleteFile(user.photoPublicId, 'image').catch((err) => {
                console.error('Failed to delete profile photo from Cloudinary:', err.message);
            });
        }

        user.photoUrl = '';
        user.photoPublicId = '';
        user.profilePhoto = '';
        await user.save();

        res.status(200).json({ success: true, message: 'Profile photo removed.' });
    } catch (error) {
        console.error('Remove profile photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove profile photo.' });
    }
};

module.exports = {
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
};
