const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    
    isVerified: { type: Boolean, default: false }, // Default status: unverified
    otp: { type: String }, // 6-digit code store karne ke liye
    otpExpires: { type: Date }, // Security ke liye OTP 10 min mein expire hoga
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    savedPapers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paper'
    }],

    createdAt: { type: Date, default: Date.now }
});

// FIX: Removing 'next' parameter parameter conflict from modern Mongoose asynchronous pipeline hooks
userSchema.pre('save', async function() {
    // If the password field wasn't touched or modified, skip hashing step completely
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw new Error('Cryptographic configuration failed processing payload pipeline.');
    }
});

// Helper validation framework layout execution
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
