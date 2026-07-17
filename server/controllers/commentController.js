const Comment = require('../models/Comment');

// @desc    Get all comments for a specific question paper
// @route   GET /api/comments/:paperId
// @access  Public
const getCommentsByPaper = async (req, res) => {
    try {
        const comments = await Comment.find({ paperId: req.params.paperId }).sort({ timestamp: -1 });
        res.status(200).json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Post a new comment on a paper
// @route   POST /api/comments
// @access  Public (or Private if you prefer tracing logged-in user details)
const postComment = async (req, res) => {
    try {
        const { paperId, name, body } = req.body;
        const cleanBody = body ? body.trim() : '';

        if (!paperId || !name || !cleanBody) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const newComment = await Comment.create({ paperId, name, body: cleanBody });
        res.status(201).json({ success: true, data: newComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Post a reply to an existing comment
// @route   POST /api/comments/:commentId/reply
// @access  Public
const postReply = async (req, res) => {
    try {
        const { name, body } = req.body;
        const cleanBody = body ? body.trim() : '';
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) return res.status(404).json({ success: false, message: 'Root comment not found' });
        if (!cleanBody) return res.status(400).json({ success: false, message: 'Reply body is required' });

        // Push subdocument directly into array — clean and performant in Mongo
        comment.replies.push({ name: req.user?.fullname || name || 'Admin', body: cleanBody });
        await comment.save();

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a standalone comment
// @route   DELETE /api/comments/:commentId
// @access  Admin
const deleteComment = async (req, res) => {
    try {
        const deletedComment = await Comment.findByIdAndDelete(req.params.commentId);
        if (!deletedComment) return res.status(404).json({ success: false, message: 'Comment not found' });

        res.status(200).json({ success: true, message: 'Comment removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getCommentsByPaper, postComment, postReply, deleteComment };
