const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
    name: { type: String, required: true },
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const CommentSchema = new mongoose.Schema({
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
    name: { type: String, required: true }, // Simplifies standalone display
    body: { type: String, required: true },
    likes: { type: Number, default: 0 },
    replies: [ReplySchema], // Nested reply arrays map beautifully to MongoDB documents
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);