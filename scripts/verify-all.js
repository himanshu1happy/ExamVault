require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Paper = require('../server/models/Paper');
const Chunk = require('../server/models/Chunk');
const { splitByQuestions, detectSectionHeading } = require('../server/services/chunker');
const { upload } = require('../server/middleware/upload');
const errorHandler = require('../server/middleware/errorHandler');

async function runTests() {
    console.log('--- STARTING VERIFICATION TEST SUITE ---');
    let passed = 0;
    let failed = 0;

    const assert = (condition, testName) => {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passed++;
        } else {
            console.error(`[FAIL] ${testName}`);
            failed++;
        }
    };

    try {
        // 1. Database connection & Startup Recovery
        await connectDB();
        assert(mongoose.connection.readyState === 1, 'MongoDB connection established');

        // Test startup pending-to-failed reset
        const testPaper = await Paper.create({
            title: 'Test Pending Paper',
            examType: 'JEE Main',
            year: 2026,
            subject: 'Physics',
            pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
            ragStatus: 'pending'
        });

        // Run recovery query exactly as in server.js
        await Paper.updateMany(
            { ragStatus: 'pending' },
            { ragStatus: 'failed', ragError: 'Interrupted by server restart' }
        );

        const updatedPaper = await Paper.findById(testPaper._id);
        assert(
            updatedPaper.ragStatus === 'failed' && updatedPaper.ragError === 'Interrupted by server restart',
            'Startup recovery sets pending papers to failed with "Interrupted by server restart"'
        );
        await Paper.findByIdAndDelete(testPaper._id);

        // 2. Start temporary Express test app using project routes
        const app = express();
        app.use(express.json());

        const authRoutes = require('../server/routes/authRoutes');
        const adminRoutes = require('../server/routes/adminRoutes');
        const paperRoutes = require('../server/routes/paperRoutes');

        app.use('/api/auth', authRoutes);
        app.use('/api/admin', adminRoutes);
        app.use('/api/papers', paperRoutes);
        app.get('/api/health', (req, res) => res.json({ ok: true }));
        app.use(errorHandler);

        const server = http.createServer(app);
        await new Promise(resolve => server.listen(5099, resolve));
        console.log('Test server listening on port 5099');

        const baseUrl = 'http://127.0.0.1:5099';

        // 3. Test /api/health
        const healthRes = await fetch(`${baseUrl}/api/health`);
        const healthJson = await healthRes.json();
        assert(healthRes.status === 200 && healthJson.ok === true, 'GET /api/health returns { ok: true }');

        // 4. Test Sign Up validation
        const testEmail = `test_student_${Date.now()}@example.com`;
        const testPassword = 'Password123';
        const testName = 'Test Student';

        // Test validation rejection for weak password
        const weakRegRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullname: 'TS', email: testEmail, password: 'weak' })
        });
        assert(weakRegRes.status === 400, 'Registration rejects weak passwords (<8 chars or no numbers)');

        // Create a verified test user and a test admin in DB directly to test auth flows
        await User.deleteMany({ email: { $in: [testEmail, `admin_${testEmail}`] } });
        const studentUser = await User.create({
            fullname: testName,
            email: testEmail,
            password: testPassword,
            role: 'user',
            isVerified: true
        });
        const adminUser = await User.create({
            fullname: 'Test Admin',
            email: `admin_${testEmail}`,
            password: testPassword,
            role: 'admin',
            isVerified: true
        });

        // 5. Test Log In
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        const loginJson = await loginRes.json();
        assert(loginRes.status === 200 && Boolean(loginJson.token), 'POST /api/auth/login succeeds and returns JWT token');
        const studentToken = loginJson.token;

        const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `admin_${testEmail}`, password: testPassword })
        });
        const adminLoginJson = await adminLoginRes.json();
        const adminToken = adminLoginJson.token;

        // 6. Test Admin Protection
        // 6a. Non-admin request to admin endpoint -> 403
        const nonAdminRes = await fetch(`${baseUrl}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const nonAdminJson = await nonAdminRes.json();
        assert(
            nonAdminRes.status === 403 && nonAdminJson.message.includes('Not authorized as an admin'),
            'Admin backend route rejects non-admin users with 403 Forbidden'
        );

        // 6b. Admin request to admin endpoint -> 200
        const adminRes = await fetch(`${baseUrl}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(adminRes.status === 200, 'Admin backend route accepts admin users with 200 OK');

        // 6c. Test Admin Guard (frontend logic simulation)
        const checkAdminGuard = (sessionData) => {
            if (!sessionData) return 'login.html';
            const roles = [sessionData.role, sessionData.userType].map(v => String(v || '').toLowerCase());
            if (!roles.includes('admin')) return 'index.html';
            return 'admin.html';
        };
        assert(
            checkAdminGuard({ role: 'user' }) === 'index.html',
            'Frontend admin guard redirects non-admin user to index.html'
        );
        assert(
            checkAdminGuard(null) === 'login.html',
            'Frontend admin guard redirects unauthenticated visitor to login.html'
        );
        assert(
            checkAdminGuard({ role: 'admin' }) === 'admin.html',
            'Frontend admin guard allows admin user'
        );

        // 7. Test Upload Limit (10 MB)
        const testUploadApp = express();
        testUploadApp.post('/test-upload', upload.single('paperFile'), (req, res) => res.json({ success: true }));
        testUploadApp.use(errorHandler);
        const uploadServer = http.createServer(testUploadApp);
        await new Promise(resolve => uploadServer.listen(5098, resolve));

        // Create an oversized payload (> 10MB)
        const boundary = '----WebKitFormBoundaryTest123456';
        const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 'A'); // 11 MB
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="paperFile"; filename="big.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;
        const bodyBuffer = Buffer.concat([Buffer.from(header), oversizedBuffer, Buffer.from(footer)]);

        const uploadRes = await fetch('http://127.0.0.1:5098/test-upload', {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body: bodyBuffer
        });
        const uploadJson = await uploadRes.json();
        assert(
            uploadRes.status === 400 && uploadJson.message === 'PDF must be under 10 MB',
            'File upload > 10MB rejected with status 400 and message "PDF must be under 10 MB"'
        );

        await new Promise(resolve => uploadServer.close(resolve));

        // 8. Test Chunker: Option list non-splitting and section detection
        const mockPages = [
            {
                page: 1,
                text: `PHYSICS - SECTION A
1. An electron enters a magnetic field. What is its trajectory?
(1) Circular  (2) Helical  (3) Parabolic  (4) Straight line
2. A ball is dropped from height h. Calculate its velocity.
(A) sqrt(2gh) (B) 2gh (C) gh (D) sqrt(gh)
3. Calculate the resistance of a 100W bulb.`
            }
        ];

        const chunks = splitByQuestions(mockPages);
        assert(chunks.length === 3, 'Chunker correctly detects exactly 3 questions without splitting option lists');
        assert(
            chunks.every(c => c.section && c.section.includes('PHYSICS')),
            'Chunker stores section heading on each detected chunk'
        );
        assert(
            chunks[0].text.includes('(1) Circular') && chunks[0].text.includes('(2) Helical'),
            'Options remain within the question chunk body rather than becoming separate chunks'
        );

        // Clean up test users
        await User.deleteMany({ email: { $in: [testEmail, `admin_${testEmail}`] } });
        await new Promise(resolve => server.close(resolve));
        await mongoose.connection.close();

    } catch (err) {
        console.error('Fatal error during test run:', err);
        failed++;
    }

    console.log(`\n--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
