const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Guard 1: Verify if the user is Logged In
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (Bearer <token>)
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from the token and attach to request
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists' });
            }
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};

// Guard 2: Verify if the user is an Admin
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Allow entry
    } else {
        res.status(403).json({ success: false, message: 'Security Alert: Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
