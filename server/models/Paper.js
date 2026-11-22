const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userName: { type: String, default: 'Admin' },
    text: { type: String, required: true },
    isAdmin: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userName: { type: String, default: 'Student' },
    text: { type: String, required: true },
    replies: [replySchema],
    createdAt: { type: Date, default: Date.now }
});

const paperSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    examType: {
        type: String,
        required: true,
        enum: ['JEE Main', 'JEE Advanced', 'NEET', 'GATE', 'UPSC', 'SSC', 'CAT', 'CUET']
    },
    year: { type: Number, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, default: 'Moderate', enum: ['Easy', 'Moderate', 'Hard'] },
    pdfUrl: { type: String, required: true },
    pdfPublicId: { type: String },
    pdfResourceType: { type: String, default: 'raw' },
    solutionUrl: { type: String },
    solutionPublicId: { type: String },
    solutionResourceType: { type: String, default: 'raw' },
    thumbnailUrl: { type: String },
    thumbnailPublicId: { type: String },
    videoUrl: { type: String },
    adminNotes: { type: String, select: false },
    ragStatus: {
        type: String,
        enum: ['none', 'pending', 'ready', 'failed'],
        default: 'none'
    },
    ragError: { type: String },
    ragAssetUrl: { type: String },
    ragAssetPublicId: { type: String },
    ragChunkCount: { type: Number, default: 0 },
    ragEmbeddingModel: { type: String },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [commentSchema],
    uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
