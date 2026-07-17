const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// 🚨 FAIL-FAST SECURITY CHECK (Added Here!)
if (!process.env.JWT_SECRET) {
    console.error("🚨 FATAL ERROR: JWT_SECRET is not defined in .env file!");
    process.exit(1); // Stop the server immediately
}

// 1. Initialize Express App BEFORE mounting anything
const app = express();
const PORT = process.env.PORT || 5001;

// 2. Import Database connection
const connectDB = require('./server/config/db.js');
connectDB(); // Execute connection

// 3. Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. REQUIRE Route Handlers (Ensuring no name conflicts)
const authRoutes = require('./server/routes/authRoutes');
const paperRoutes = require('./server/routes/paperRoutes');
const commentRoutes = require('./server/routes/commentroutes');
const messageRoutes = require('./server/routes/messageRoutes');
const aiRoutes = require('./server/routes/aiRoutes');

// 6. MOUNT API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

// 7. Strict Catch-All Route for SPA Frontends
app.get('/:splat(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 8. Start Listener
app.listen(PORT, () => {
    console.log(`🚀 ExamVault Stack listening operational on port ${PORT}`);
});
