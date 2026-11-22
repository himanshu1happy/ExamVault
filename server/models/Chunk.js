const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
    paperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paper',
        required: true,
        index: true
    },
    kind: {
        type: String,
        enum: ['question', 'solution'],
        required: true
    },
    questionNo: {
        type: Number,
        index: true
    },
    section: {
        type: String,
        trim: true
    },
    text: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number],
        default: []
    },
    pageNumber: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index on { paperId: 1, kind: 1, questionNo: 1 }
chunkSchema.index({ paperId: 1, kind: 1, questionNo: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
