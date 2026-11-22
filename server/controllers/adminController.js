const mongoose = require('mongoose');
const User = require('../models/User');
const Paper = require('../models/Paper');
const Message = require('../models/Message');

// @desc    Get aggregate statistics for the platform (Admin Only)
// @route   GET /api/admin/stats
// @access  Admin
const getStats = async (req, res) => {
    try {
        const [totalPapers, totalUsers, failedIndexings, paperAggregates] = await Promise.all([
            Paper.countDocuments(),
            User.countDocuments(),
            Paper.countDocuments({ ragStatus: 'failed' }),
            Paper.aggregate([
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: '$views' },
                        totalDownloads: { $sum: '$downloads' },
                        totalComments: { $sum: { $size: { $ifNull: ['$comments', []] } } }
                    }
                }
            ])
        ]);

        const totals = paperAggregates[0] || { totalViews: 0, totalDownloads: 0, totalComments: 0 };

        res.status(200).json({
            success: true,
            data: {
                papers: totalPapers,
                users: totalUsers,
                views: totals.totalViews || 0,
                downloads: totals.totalDownloads || 0,
                comments: totals.totalComments || 0,
                failedIndexings: failedIndexings
            }
        });
    } catch (error) {
        console.error('Admin get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve administrative statistics.' });
    }
};

// @desc    Get all registered users with optional search (Admin Only)
// @route   GET /api/admin/users
// @access  Admin
const getUsers = async (req, res) => {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : (req.query.q || '');
        const query = {};

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { email: { $regex: escaped, $options: 'i' } },
                { fullname: { $regex: escaped, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('fullname email role isVerified createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: users.length,
            data: users.map(u => ({
                id: u._id,
                name: u.fullname,
                fullname: u.fullname,
                email: u.email,
                role: u.role || 'user',
                isVerified: Boolean(u.isVerified),
                createdAt: u.createdAt
            }))
        });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
    }
};

// @desc    Update a user's role (Make Admin / Remove Admin) (Admin Only)
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
const updateUserRole = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid user identifier.' });
        }

        const targetUserId = req.params.id;
        const currentUserId = req.user._id.toString();
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be either "user" or "admin".' });
        }

        // 1. Prevent self-demotion
        if (targetUserId === currentUserId && role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Self-demotion prohibited: You cannot remove admin privileges from your own account.'
            });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 2. Prevent removing the last admin
        if (role !== 'admin' && targetUser.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Action rejected: Cannot demote the last remaining administrator in the system.'
                });
            }
        }

        targetUser.role = role;
        await targetUser.save();

        res.status(200).json({
            success: true,
            message: `User role updated successfully to "${role}".`,
            data: {
                id: targetUser._id,
                email: targetUser.email,
                role: targetUser.role
            }
        });
    } catch (error) {
        console.error('Admin update user role error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user role.' });
    }
};

// @desc    Get all recent comments across papers (Admin Only)
// @route   GET /api/admin/comments
// @access  Admin
const getAllComments = async (req, res) => {
    try {
        const papers = await Paper.find({ 'comments.0': { $exists: true } })
            .select('_id title comments')
            .lean();

        const allComments = [];
        for (const p of papers) {
            for (const c of (p.comments || [])) {
                allComments.push({
                    paperId: p._id,
                    paperTitle: p.title,
                    commentId: c._id,
                    userName: c.userName || 'Student',
                    text: c.text,
                    createdAt: c.createdAt,
                    replyCount: Array.isArray(c.replies) ? c.replies.length : 0
                });
            }
        }

        allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            count: allComments.length,
            data: allComments.slice(0, 100)
        });
    } catch (error) {
        console.error('Admin get comments error:', error);
        res.status(500).json({ success: false, message: 'Failed to load comments.' });
    }
};

// @desc    Delete a comment from a paper (Admin Only)
// @route   DELETE /api/admin/comments/:paperId/:commentId
// @access  Admin
const deleteCommentAdmin = async (req, res) => {
    try {
        const { paperId, commentId } = req.params;

        if (!mongoose.isValidObjectId(paperId) || !mongoose.isValidObjectId(commentId)) {
            return res.status(400).json({ success: false, message: 'Invalid identifier.' });
        }

        const paper = await Paper.findByIdAndUpdate(
            paperId,
            { $pull: { comments: { _id: commentId } } },
            { new: true }
        );

        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        res.status(200).json({ success: true, message: 'Comment removed successfully.' });
    } catch (error) {
        console.error('Admin delete comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment.' });
    }
};

// @desc    Mark a student message as read (Admin Only)
// @route   PATCH /api/admin/messages/:id/read
// @access  Admin
const markMessageRead = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid message identifier.' });
        }

        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { status: 'read' },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found.' });
        }

        res.status(200).json({ success: true, message: 'Message marked as read.', data: message });
    } catch (error) {
        console.error('Admin mark message read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update message status.' });
    }
};

// @desc    Delete a message (Admin Only)
// @route   DELETE /api/admin/messages/:id
// @access  Admin
const deleteMessageAdmin = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid message identifier.' });
        }

        const message = await Message.findByIdAndDelete(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found.' });
        }

        res.status(200).json({ success: true, message: 'Message deleted successfully.' });
    } catch (error) {
        console.error('Admin delete message error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message.' });
    }
};

module.exports = {
    getStats,
    getUsers,
    updateUserRole,
    getAllComments,
    deleteCommentAdmin,
    markMessageRead,
    deleteMessageAdmin
};
