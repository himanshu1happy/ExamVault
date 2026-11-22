const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Paper = require('./server/models/Paper');

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed in production.');
    process.exit(1);
}

if (!process.argv.includes('--confirm')) {
    console.error('Refusing destructive seed. Re-run with: node seed.js --confirm');
    process.exit(1);
}
try {
    const mongoHost = new URL(process.env.MONGO_URI).hostname.toLowerCase();
    if (!['localhost', '127.0.0.1', '::1'].includes(mongoHost)) {
        console.error('Refusing to seed a remote MongoDB host.');
        process.exit(1);
    }
} catch (error) {
    console.error('Refusing to seed: MONGO_URI is invalid.');
    process.exit(1);
}

const samplePapers = [
    {
        title: "JEE Main 2025 - Physics Detailed Solution",
        examType: "JEE Main",
        year: 2025,
        subject: "Physics",
        difficulty: "Moderate",
        pdfUrl: "/uploads/jee_main_2025_physics.pdf",
        adminNotes: "Mechanics section was heavy this year. Focus on rotation mechanics.",
        views: 1240,
        downloads: 450,
    },
    {
        title: "NEET UG 2024 - Biology Question Paper",
        examType: "NEET",
        year: 2024,
        subject: "Biology",
        difficulty: "Easy",
        pdfUrl: "/uploads/jee_main_2025_physics.pdf",
        adminNotes: "Direct questions from NCERT. Human Physiology carries max weightage.",
        views: 3100,
        downloads: 1200,
    },
    {
        title: "GATE CS 2025 - Data Structures & Algorithms",
        examType: "GATE",
        year: 2025,
        subject: "Computer Science",
        difficulty: "Hard",
        pdfUrl: "/uploads/jee_main_2025_physics.pdf",
        adminNotes: "Graph algorithms questions were tricky. Verify the time complexity analysis.",
        views: 950,
        downloads: 310,
    },
    {
        title: "UPSC CSE 2024 - General Studies Paper 1",
        examType: "UPSC",
        year: 2024,
        subject: "General Studies",
        difficulty: "Hard",
        pdfUrl: "/uploads/jee_main_2025_physics.pdf",
        adminNotes: "Current affairs dominated the Environment section this year.",
        views: 4500,
        downloads: 2300,
    }
];

const seedDB = async () => {
    try {
        const missingFiles = samplePapers
            .map(paper => {
                const pubPath = path.join(__dirname, 'public', paper.pdfUrl.replace(/^\/uploads\//, 'uploads/'));
                const rootPath = path.join(__dirname, paper.pdfUrl.replace(/^\//, ''));
                return fs.existsSync(pubPath) || fs.existsSync(rootPath) ? null : paper.pdfUrl;
            })
            .filter(Boolean);
        if (missingFiles.length) {
            console.error('Refusing to seed: one or more sample PDFs are missing from uploads directory.');
            process.exitCode = 1;
            return;
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("🍃 Seeder: Connected to MongoDB...");

        // Pehle se agar koi purana data ho toh use clean karo
        await Paper.deleteMany();
        console.log("🗑️ Cleaned existing papers collection...");

        // Naya sample data insert karo
        await Paper.insertMany(samplePapers);
        console.log("🎯 Database populated with competitive exam papers successfully!");

        mongoose.connection.close();
        console.log("🔌 Database connection closed cleanly.");
    } catch (error) {
        console.error("❌ Seeding Error:", error.message);
        process.exit(1);
    }
};

seedDB();