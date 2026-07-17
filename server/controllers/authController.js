const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail'); // Email bhejne wala utility

const generateToken = (id) => {
    // Ab yeh strictly sirf .env se hi secret lega!
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user & Send OTP (With Unverified Overwrite Protection)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        // 1. Check if user already exists in DB
        let user = await User.findOne({ email });
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins expiry

        if (user) {
            // CASE A: User exists and is ALREADY verified -> Real Conflict
            if (user.isVerified) {
                return res.status(400).json({ success: false, message: 'Email already registered and verified.' });
            }
            
            // CASE B: User exists but is NOT verified -> Overwrite ghost record with new data and new OTP
            user.fullname = fullname;
            user.password = password; // Mongoose pre-save hook will automatically re-hash this password
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            // CASE C: Fresh Email -> Create a brand new record
            user = await User.create({ fullname, email, password, otp, otpExpires });
        }

        // 2. Email Design & Sending Pipeline
        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px; background: #f4f4f4; text-align: center;">
                <h2 style="color: #6c5ce7;">Welcome to ExamVault! 🎓</h2>
                <p>Hi ${fullname},</p>
                <p>Your 6-digit account verification code is:</p>
                <h1 style="background: #ffffff; padding: 10px; letter-spacing: 5px; border-radius: 5px; color: #d63031;">${otp}</h1>
                <p>This code is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
        `;

        try {
            await sendEmail({ email: user.email, subject: 'Verify Your ExamVault Account', message });
            res.status(200).json({ success: true, message: 'OTP sent to your email. Please verify.' });
        } catch (emailError) {
            console.error("Email delivery failed:", emailError);
            return res.status(500).json({ success: false, message: 'Account initiated, but failed to send OTP email. Please click register again to retry.' });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify OTP & Activate Account
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        if (user.isVerified) return res.status(400).json({ success: false, message: 'Account is already verified.' });

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or Expired OTP.' });
        }

        // Agar OTP sahi hai, toh account activate kar do
        user.isVerified = true;
        user.otp = undefined; // OTP clear kar do taaki dubara use na ho
        user.otpExpires = undefined;
        await user.save();

        // Verification successful, now send JWT token to log them in
        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, fullname: user.fullname, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login User (Also strictly check if verified)
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // NEW: Check if user actually verified their email
        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email to access your account.' });
        }

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, fullname: user.fullname, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send password reset link
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const responseMessage = 'If that email exists, a password reset link has been sent.';
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            return res.status(200).json({ success: true, message: responseMessage });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px; background: #f4f4f4;">
                <h2 style="color: #6c5ce7;">Reset Your ExamVault Password</h2>
                <p>We received a request to reset your password.</p>
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
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
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
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { registerUser, verifyOTP, loginUser, getSavedPapers, forgotPassword, resetPassword };
