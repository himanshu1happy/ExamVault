const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const requiredSecrets = ['JWT_SECRET', 'MONGO_URI'];
for (const key of requiredSecrets) {
    if (!process.env[key] || process.env[key].includes('replace_with')) {
        console.error(`FATAL ERROR: ${key} is missing or still uses a placeholder.`);
        process.exit(1);
    }
}
if (Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 64) {
    console.error('FATAL ERROR: JWT_SECRET must contain at least 64 random bytes. Generate it with: node -e "console.log(require(\"crypto\").randomBytes(64).toString(\"base64\"))"');
    process.exit(1);
}
const productionRequired = ['APP_URL', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'GEMINI_API_KEY'];
if (process.env.NODE_ENV === 'production') {
    for (const key of productionRequired) {
        if (!process.env[key]) {
            console.error(`FATAL ERROR: ${key} is required in production.`);
            process.exit(1);
        }
    }
}

// 1. Initialize Express App BEFORE mounting anything
const app = express();
app.set('trust proxy', 1);
mongoose.set('sanitizeFilter', true);
const PORT = process.env.PORT || 5001;
const publicDir = path.join(__dirname, 'public');
const publicUploadsDir = path.join(publicDir, 'uploads');
const legacyUploadsDir = path.join(__dirname, 'uploads');

// 2. Import Database connection
const connectDB = require('./server/config/db.js');

// 3. Global Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            scriptSrcAttr: ["'none'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
            connectSrc: ["'self'"],
            frameSrc: ["'self'", 'https://res.cloudinary.com'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = [process.env.CORS_ORIGINS, process.env.APP_URL]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => Boolean(origin));
const isLocalDevelopmentOrigin = origin => {
    if (process.env.NODE_ENV === 'production') return false;
    try {
        const parsedOrigin = new URL(origin);
        return parsedOrigin.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);
    } catch (error) {
        return false;
    }
};
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) return callback(null, true);
        const error = new Error('Origin is not allowed by CORS');
        error.status = 403;
        return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});
const authEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: req => {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const accountKey = email ? crypto.createHash('sha256').update(email).digest('hex') : 'unknown';
        return `${ipKeyGenerator(req.ip)}:${accountKey}`;
    }
});
app.use('/api', apiLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/resend-otp', '/api/auth/verify-otp', '/api/auth/forgot-password'], authLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/resend-otp', '/api/auth/verify-otp', '/api/auth/forgot-password'], authEmailLimiter);

// 4. Serve Static Assets
app.use(express.static(publicDir, { extensions: ['html'] }));
app.use('/uploads', express.static(publicUploadsDir));
app.use('/uploads', express.static(legacyUploadsDir));

// 5. REQUIRE Route Handlers (Ensuring no name conflicts)
const authRoutes = require('./server/routes/authRoutes');
const paperRoutes = require('./server/routes/paperRoutes');
const messageRoutes = require('./server/routes/messageRoutes');
const aiRoutes = require('./server/routes/aiRoutes');
const adminRoutes = require('./server/routes/adminRoutes');

// 6. MOUNT API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check route added here, before the 404 handler
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
});

// 7. Strict Catch-All Route for SPA Frontends
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const errorHandler = require('./server/middleware/errorHandler');
app.use(errorHandler);

// 8. Start Listener only after the database is ready
(async () => {
    await connectDB();

    // Reset any interrupted indexing tasks from previous crashes/restarts
    const Paper = require('./server/models/Paper');
    try {
        const resetResult = await Paper.updateMany(
            { ragStatus: 'pending' },
            { ragStatus: 'failed', ragError: 'Interrupted by server restart' }
        );
        if (resetResult.modifiedCount > 0) {
            console.log(`[Startup] Marked ${resetResult.modifiedCount} pending paper(s) as failed (Interrupted by server restart).`);
        }
    } catch (err) {
        console.error('[Startup] Error resetting pending papers:', err.message);
    }

    app.listen(PORT, () => {
        console.log(`🚀 ExamVault Stack listening operational on port ${PORT}`);
    });
})();