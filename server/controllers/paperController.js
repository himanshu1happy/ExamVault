const Paper = require('../models/Paper');
const User = require('../models/User');

// @desc    Get all papers with optional filters (Exam Type, Year)
// @route   GET /api/papers
// @access  Public
const getPapers = async (req, res) => {
    try {
        const { examType, year, search } = req.query;
        let query = {};

        // Apply filters dynamically if provided in the URL query string
        if (examType && examType !== 'all') query.examType = examType;
        if (year && year !== 'all') query.year = Number(year);

        const searchTerm = typeof search === 'string' ? search.trim().slice(0, 100) : '';
        if (searchTerm) {
            const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { title: { $regex: escapedSearchTerm, $options: 'i' } },
                { subject: { $regex: escapedSearchTerm, $options: 'i' } },
                { examType: { $regex: escapedSearchTerm, $options: 'i' } }
            ];
        }

        // FIX: Model 'Paper' use karo na ki local variable 'papers'
        const papers = await Paper.find(query).sort({ uploadedAt: -1 });
        res.status(200).json({ success: true, count: papers.length, data: papers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get a single paper's details by ID
// @route   GET /api/papers/:id
// @access  Public
const getPaperById = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }
        
        // Automatically increment view count when a user clicks into a solution page
        paper.views = (paper.views || 0) + 1;
        await paper.save();

        res.status(200).json({ success: true, data: paper });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get comments for a paper without changing view count
// @route   GET /api/papers/:id/comments
const getPaperComments = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).select('comments');
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        res.status(200).json({ success: true, data: paper.comments || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Like or Unlike a paper (Toggle & Anti-Spam)
// @route   POST /api/papers/:id/like
const likePaper = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        const userId = req.user._id;
        const alreadyLikedIndex = paper.likes.findIndex((likedUserId) => likedUserId.equals(userId));
        const alreadyDislikedIndex = paper.dislikes.findIndex((dislikedUserId) => dislikedUserId.equals(userId));

        // STEP 1: Agar pehle Dislike kiya tha, toh pehle use chup-chaap hata do
        if (alreadyDislikedIndex !== -1) {
            paper.dislikes.splice(alreadyDislikedIndex, 1);
        }

        // STEP 2: Ab Like ka normal Toggle logic chalao
        if (alreadyLikedIndex === -1) {
            // Case A: Like list mein nahi tha -> Add karo (LIKE)
            paper.likes.push(userId);
        } else {
            // Case B: Pehle se Like list mein tha -> Nikaal do (UNLIKE)
            paper.likes.splice(alreadyLikedIndex, 1);
        }

        await paper.save();

        // Frontend ko array ki length (total likes count) bhej do
        res.status(200).json({ 
            success: true, 
            likesCount: paper.likes.length,
            isLiked: alreadyLikedIndex === -1 // True agar abhi like kiya, False agar unlike kiya
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Upload a new paper (Admin Only)
// @route   POST /api/papers/upload
const uploadPaper = async (req, res) => {
    try {
        const { title, examType, year, subject, difficulty } = req.body;
        
        // 1. Check Question Paper
        if (!req.files || !req.files['paperFile']) {
            return res.status(400).json({ success: false, message: 'Please attach Question Paper PDF.' });
        }
        const pdfUrl = '/uploads/' + req.files['paperFile'][0].filename;

        // 2. Check Solution File (Optional)
        let solutionUrl = '';
        if (req.files['solutionFile']) {
            solutionUrl = '/uploads/' + req.files['solutionFile'][0].filename;
        }

        const newPaper = await Paper.create({
            title, examType, year: Number(year), subject, difficulty, pdfUrl, solutionUrl
        });

        res.status(201).json({ success: true, message: 'Paper & Solution uploaded!', data: newPaper });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Add a comment to a paper
// @route   POST /api/papers/:id/comment
const addComment = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

        const { text } = req.body;
        const cleanText = text ? text.trim() : '';
        if (!cleanText) return res.status(400).json({ success: false, message: 'Comment text is required' });

        paper.comments.push({
            user: req.user._id,
            userName: req.user.fullname || 'Student',
            text: cleanText
        });
        await paper.save();

        const newComment = paper.comments[paper.comments.length - 1];
        res.status(201).json({ success: true, data: newComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get the authenticated user's saved status for one paper
// @route   GET /api/papers/:id/save
// @access  Private
const getSaveStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('savedPapers');
        const saved = user.savedPapers.some((savedPaperId) => savedPaperId.equals(req.params.id));

        res.status(200).json({ success: true, saved });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Save or remove a paper from the authenticated user's library
// @route   POST /api/papers/:id/save
// @access  Private
const toggleSavedPaper = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).select('_id');
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        const user = await User.findById(req.user._id).select('savedPapers');
        const savedPaperIndex = user.savedPapers.findIndex((savedPaperId) => savedPaperId.equals(paper._id));

        let saved;
        if (savedPaperIndex === -1) {
            user.savedPapers.push(paper._id);
            saved = true;
        } else {
            user.savedPapers.splice(savedPaperIndex, 1);
            saved = false;
        }

        await user.save();

        res.status(200).json({
            success: true,
            saved,
            savedPapersCount: user.savedPapers.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin reply to a paper comment
// @route   POST /api/papers/:id/comments/:commentId/replies
const replyToComment = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

        const comment = paper.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        const { text } = req.body;
        const cleanText = text ? text.trim() : '';
        if (!cleanText) return res.status(400).json({ success: false, message: 'Reply text is required' });

        comment.replies.push({
            user: req.user._id,
            userName: req.user.fullname || 'Admin',
            text: cleanText,
            isAdmin: true
        });
        await paper.save();

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin delete a paper comment
// @route   DELETE /api/papers/:id/comments/:commentId
const deleteComment = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

        const comment = paper.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        paper.comments.pull(req.params.commentId);
        await paper.save();

        res.status(200).json({ success: true, message: 'Comment removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Dislike or Undislike a paper (Mutually Exclusive with Like)
// @route   POST /api/papers/:id/dislike
const dislikePaper = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

        const userId = req.user._id;
        const alreadyDislikedIndex = paper.dislikes.findIndex((dislikedUserId) => dislikedUserId.equals(userId));
        const alreadyLikedIndex = paper.likes.findIndex((likedUserId) => likedUserId.equals(userId));

        // 1. Agar user ne pehle Like kiya tha, toh Like list se nikaal do
        if (alreadyLikedIndex !== -1) {
            paper.likes.splice(alreadyLikedIndex, 1);
        }

        // 2. Dislike Toggle Logic
        if (alreadyDislikedIndex === -1) {
            paper.dislikes.push(userId); // DISLIKE ADDED
        } else {
            paper.dislikes.splice(alreadyDislikedIndex, 1); // UNDISLIKED
        }

        await paper.save();

        res.status(200).json({
            success: true,
            likesCount: paper.likes.length,
            dislikesCount: paper.dislikes.length,
            isDisliked: alreadyDislikedIndex === -1
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all comments for a specific paper
// @route   GET /api/papers/:id/comments
const getComments = async (req, res) => {
    try {
        // Paper ko dhoondho aur uske comments array ko fetch karo
        // Agar tumne user reference diya hai toh populate use kar sakte ho, otherwise direct paper.comments
        const paper = await Paper.findById(req.params.id)
            .select('comments')
            .populate('comments.user', 'fullname name email')
            .populate('comments.replies.user', 'fullname name email');
        
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        const comments = [...(paper.comments || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            count: comments.length,
            data: comments
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ success: false, message: 'Server Error loading comments' });
    }
};


module.exports = { getPapers, getPaperById, getComments, getSaveStatus, toggleSavedPaper, likePaper, dislikePaper, uploadPaper, addComment, replyToComment, deleteComment };
