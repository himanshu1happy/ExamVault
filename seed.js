const mongoose = require('mongoose');
require('dotenv').config();
const Paper = require('./server/models/Paper');

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
        likesCount: 88
    },
    {
        title: "NEET UG 2024 - Biology Question Paper",
        examType: "NEET",
        year: 2024,
        subject: "Biology",
        difficulty: "Easy",
        pdfUrl: "/uploads/neet_2024_biology.pdf",
        adminNotes: "Direct questions from NCERT. Human Physiology carries max weightage.",
        views: 3100,
        downloads: 1200,
        likesCount: 340
    },
    {
        title: "GATE CS 2025 - Data Structures & Algorithms",
        examType: "GATE",
        year: 2025,
        subject: "Computer Science",
        difficulty: "Hard",
        pdfUrl: "/uploads/gate_2025_cs.pdf",
        adminNotes: "Graph algorithms questions were tricky. Verify the time complexity analysis.",
        views: 950,
        downloads: 310,
        likesCount: 56
    },
    {
        title: "UPSC CSE 2024 - General Studies Paper 1",
        examType: "UPSC",
        year: 2024,
        subject: "General Studies",
        difficulty: "Hard",
        pdfUrl: "/uploads/upsc_2024_gs1.pdf",
        adminNotes: "Current affairs dominated the Environment section this year.",
        views: 4500,
        downloads: 2300,
        likesCount: 512
    }
];

const seedDB = async () => {
    try {
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