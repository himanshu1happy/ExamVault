const mongoose = require('mongoose');

const PaperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    examType: { type: String, required: true, enum: ['JEE Main', 'JEE Advanced', 'NEET', 'GATE', 'UPSC', 'SSC', 'CAT', 'CUET'] },
    year: { type: Number, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, default: 'Moderate', enum: ['Easy', 'Moderate', 'Hard'] },
    pdfUrl: { type: String, required: true },
    solutionUrl: { type: String }, // Path to folder file or AWS S3 bucket string
    adminNotes: { type: String , select : false},
    
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    }],
    // Purane dislikesCount ko replace karke yeh daalo:
    dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    }],
    
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: { type: String, default: 'Student' },
        text: { type: String, required: true },
        replies: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            userName: { type: String, default: 'Admin' },
            text: { type: String, required: true },
            isAdmin: { type: Boolean, default: true },
            createdAt: { type: Date, default: Date.now }
        }],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Paper', PaperSchema);
