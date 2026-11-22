const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const User = require('../models/User');
const Chunk = require('../models/Chunk');
const { uploadBuffer, deleteFile } = require('../utils/cloudinaryUpload');
const { indexPaper, isPaperIndexing } = require('../services/indexPaper');

// @desc    Get all papers with optional filters (Exam Type, Year) with Pagination & Computed Likes/Dislikes
// @route   GET /api/papers
// @access  Public
const getPapers = async (req, res) => {
    try {
        const { examType, year, search } = req.query;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        let query = {};

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

        const [papers, total] = await Promise.all([
            Paper.find(query)
                .select('-ragChunks -likes -dislikes -comments -adminNotes')
                .sort({ uploadedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Paper.countDocuments(query)
        ]);

        const formattedPapers = papers.map(paper => ({
            ...paper,
            likesCount: paper.likesCount ?? (Array.isArray(paper.likes) ? paper.likes.length : 0),
            dislikesCount: paper.dislikesCount ?? (Array.isArray(paper.dislikes) ? paper.dislikes.length : 0)
        }));

        res.status(200).json({
            success: true,
            total,
            count: total,
            page,
            pages: Math.ceil(total / limit),
            data: formattedPapers
        });
    } catch (error) {
        console.error('Get papers error:', error);
        res.status(500).json({ success: false, message: 'Failed to load question papers.' });
    }
};

// @desc    Get a single paper's details by ID (Atomic view count increment)
// @route   GET /api/papers/:id
// @access  Public
const getPaperById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true, projection: '-ragChunks -ragAssetUrl -ragAssetPublicId -ragEmbeddingModel' }
        );

        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        const likesCount = Array.isArray(paper.likes) ? paper.likes.length : 0;
        const dislikesCount = Array.isArray(paper.dislikes) ? paper.dislikes.length : 0;
        const isLiked = req.user ? (paper.likes || []).some(id => id.equals(req.user._id)) : false;
        const isDisliked = req.user ? (paper.dislikes || []).some(id => id.equals(req.user._id)) : false;

        const paperObj = paper.toObject ? paper.toObject() : paper;
        delete paperObj.likes;
        delete paperObj.dislikes;

        res.status(200).json({
            success: true,
            data: {
                ...paperObj,
                likesCount,
                dislikesCount,
                isLiked,
                isDisliked
            }
        });
    } catch (error) {
        console.error('Get paper by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to load paper details.' });
    }
};

// @desc    Increment download count and get PDF URL (Atomic $inc)
// @route   POST /api/papers/:id/download
// @access  Public
const downloadPaper = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findByIdAndUpdate(
            req.params.id,
            { $inc: { downloads: 1 } },
            { new: true, select: 'pdfUrl downloads title' }
        );

        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        res.status(200).json({
            success: true,
            downloads: paper.downloads,
            url: paper.pdfUrl,
            title: paper.title
        });
    } catch (error) {
        console.error('Download paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to process download.' });
    }
};

// @desc    Like or Unlike a paper (Atomic $addToSet & $pull)
// @route   POST /api/papers/:id/like
// @access  Private
const likePaper = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const existing = await Paper.findById(req.params.id).select('likes dislikes');
        if (!existing) return res.status(404).json({ success: false, message: 'Paper not found.' });

        const alreadyLiked = (existing.likes || []).some(id => id.equals(userId));
        const update = alreadyLiked
            ? { $pull: { likes: userId } }
            : { $addToSet: { likes: userId }, $pull: { dislikes: userId } };

        const paper = await Paper.findByIdAndUpdate(req.params.id, update, { new: true, select: 'likes dislikes' });

        res.status(200).json({
            success: true,
            likesCount: paper.likes.length,
            dislikesCount: paper.dislikes.length,
            isLiked: !alreadyLiked
        });
    } catch (error) {
        console.error('Like paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to update like status.' });
    }
};

// @desc    Dislike or Undislike a paper (Atomic $addToSet & $pull)
// @route   POST /api/papers/:id/dislike
// @access  Private
const dislikePaper = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const existing = await Paper.findById(req.params.id).select('likes dislikes');
        if (!existing) return res.status(404).json({ success: false, message: 'Paper not found.' });

        const alreadyDisliked = (existing.dislikes || []).some(id => id.equals(userId));
        const update = alreadyDisliked
            ? { $pull: { dislikes: userId } }
            : { $addToSet: { dislikes: userId }, $pull: { likes: userId } };

        const paper = await Paper.findByIdAndUpdate(req.params.id, update, { new: true, select: 'likes dislikes' });

        res.status(200).json({
            success: true,
            likesCount: paper.likes.length,
            dislikesCount: paper.dislikes.length,
            isDisliked: !alreadyDisliked
        });
    } catch (error) {
        console.error('Dislike paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to update dislike status.' });
    }
};

// @desc    Upload a new paper (Admin Only, Cloudinary Direct, Rollback on Failure, Sets ragStatus: 'pending')
// @route   POST /api/papers/upload
// @access  Admin
const uploadPaper = async (req, res) => {
    const uploadedFiles = [];
    try {
        const { title, examType, year, subject, difficulty } = req.body;
        const currentYear = new Date().getFullYear();
        const parsedYear = Number(year);

        const cleanTitle = typeof title === 'string' ? title.trim() : '';
        const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
        const validExamTypes = ['JEE Main', 'JEE Advanced', 'NEET', 'GATE', 'UPSC', 'SSC', 'CAT', 'CUET'];

        // 1. Validations
        if (!cleanTitle || cleanTitle.length < 3) {
            return res.status(400).json({ success: false, message: 'Paper title must be at least 3 characters.' });
        }

        if (!examType || !validExamTypes.includes(examType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid exam type. Must be one of: ${validExamTypes.join(', ')}`
            });
        }

        if (!parsedYear || parsedYear < 1990 || parsedYear > currentYear + 1) {
            return res.status(400).json({
                success: false,
                message: `Year must be between 1990 and ${currentYear + 1}.`
            });
        }

        if (!cleanSubject) {
            return res.status(400).json({ success: false, message: 'Subject is required.' });
        }

        const paperFile = req.files?.paperFile?.[0];
        if (!paperFile || !paperFile.buffer) {
            return res.status(400).json({ success: false, message: 'Question Paper PDF is required.' });
        }

        // 2. Cloudinary Uploads
        const paperUpload = await uploadBuffer(paperFile.buffer, {
            folder: 'ExamVault_Vault/papers',
            resourceType: 'raw',
            publicIdPrefix: 'paper'
        });
        uploadedFiles.push(paperUpload);

        let solutionUpload = null;
        const solutionFile = req.files?.solutionFile?.[0];
        if (solutionFile && solutionFile.buffer) {
            solutionUpload = await uploadBuffer(solutionFile.buffer, {
                folder: 'ExamVault_Vault/solutions',
                resourceType: 'raw',
                publicIdPrefix: 'solution'
            });
            uploadedFiles.push(solutionUpload);
        }

        let thumbnailUpload = null;
        const thumbnailFile = req.files?.thumbnail?.[0];
        if (thumbnailFile && thumbnailFile.buffer) {
            thumbnailUpload = await uploadBuffer(thumbnailFile.buffer, {
                folder: 'ExamVault_Vault/thumbnails',
                resourceType: 'image',
                publicIdPrefix: 'thumb'
            });
            uploadedFiles.push(thumbnailUpload);
        }

        // 3. Database Persistence (RAG indexing deferred to Stage 4)
        const newPaper = await Paper.create({
            title: cleanTitle,
            examType,
            year: parsedYear,
            subject: cleanSubject,
            difficulty: difficulty || 'Moderate',
            videoUrl: String(req.body.videoUrl || '').trim(),
            pdfUrl: paperUpload.url,
            pdfPublicId: paperUpload.publicId,
            pdfResourceType: paperUpload.resourceType || 'raw',
            solutionUrl: solutionUpload?.url || '',
            solutionPublicId: solutionUpload?.publicId || '',
            solutionResourceType: solutionUpload?.resourceType || 'raw',
            thumbnailUrl: thumbnailUpload?.url || '',
            thumbnailPublicId: thumbnailUpload?.publicId || '',
            ragStatus: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Paper uploaded successfully.',
            data: newPaper
        });

        // Trigger RAG indexing in the background with memory buffers
        const paperFileObj = req.files && req.files.paperFile && req.files.paperFile[0];
        const solutionFileObj = req.files && req.files.solutionFile && req.files.solutionFile[0];
        indexPaper(newPaper._id, {
            questionBuffer: paperFileObj ? paperFileObj.buffer : null,
            solutionBuffer: solutionFileObj ? solutionFileObj.buffer : null
        }).catch(err => {
            console.error(`Background RAG indexing initiation error for paper ${newPaper._id}:`, err);
        });
    } catch (error) {
        // Rollback uploaded Cloudinary files if DB creation fails
        for (const file of uploadedFiles) {
            try {
                await deleteFile(file.publicId, file.resourceType);
            } catch (delError) {
                console.error(`Rollback deletion failed for ${file.publicId}:`, delError.message);
            }
        }
        console.error('Upload paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload paper. Please try again.' });
    }
};

// @desc    Delete a paper and its Cloudinary assets (Admin Only)
// @route   DELETE /api/papers/:id
// @access  Admin
const deletePaper = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        // Delete associated Cloudinary assets with exact resource_type
        if (paper.pdfPublicId) {
            await deleteFile(paper.pdfPublicId, paper.pdfResourceType || 'raw').catch(err => console.error('Cloudinary paper PDF delete failed:', err.message));
        }
        if (paper.solutionPublicId) {
            await deleteFile(paper.solutionPublicId, paper.solutionResourceType || 'raw').catch(err => console.error('Cloudinary solution PDF delete failed:', err.message));
        }
        if (paper.thumbnailPublicId) {
            await deleteFile(paper.thumbnailPublicId, 'image').catch(err => console.error('Cloudinary thumbnail delete failed:', err.message));
        }
        if (paper.ragAssetPublicId) {
            await deleteFile(paper.ragAssetPublicId, 'raw').catch(err => console.error('Cloudinary RAG asset delete failed:', err.message));
        }

        // Delete associated Chunk documents from Chunk collection
        await Chunk.deleteMany({ paperId: paper._id });

        await Paper.deleteOne({ _id: paper._id });
        await User.updateMany(
            { savedPapers: paper._id },
            { $pull: { savedPapers: paper._id } }
        );

        res.status(200).json({ success: true, message: 'Paper removed successfully.' });
    } catch (error) {
        console.error('Delete paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove paper.' });
    }
};

// @desc    Add a comment to a paper
// @route   POST /api/papers/:id/comments
// @access  Private
const addComment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found.' });

        const { text } = req.body;
        const cleanText = typeof text === 'string' ? text.trim() : '';
        if (!cleanText) return res.status(400).json({ success: false, message: 'Comment text is required.' });

        paper.comments.push({
            user: req.user._id,
            userName: req.user.fullname || 'Student',
            text: cleanText
        });
        await paper.save();

        const newComment = paper.comments[paper.comments.length - 1];
        res.status(201).json({ success: true, data: newComment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment.' });
    }
};

// @desc    Get the authenticated user's saved status for one paper
// @route   GET /api/papers/:id/save
// @access  Private
const getSaveStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const user = await User.findById(req.user._id).select('savedPapers');
        const saved = (user?.savedPapers || []).some((savedPaperId) => savedPaperId.equals(req.params.id));

        res.status(200).json({ success: true, saved });
    } catch (error) {
        console.error('Get save status error:', error);
        res.status(500).json({ success: false, message: 'Failed to load save status.' });
    }
};

// @desc    Save or remove a paper from the authenticated user's library
// @route   POST /api/papers/:id/save
// @access  Private
const toggleSavedPaper = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id).select('_id');
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        const user = await User.findById(req.user._id).select('savedPapers');
        const savedPaperIndex = (user.savedPapers || []).findIndex((savedPaperId) => savedPaperId.equals(paper._id));

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
        console.error('Toggle save paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to update saved paper.' });
    }
};

// @desc    Admin reply to a paper comment
// @route   POST /api/papers/:id/comments/:commentId/replies
// @access  Admin
const replyToComment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found.' });

        const comment = paper.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

        const { text } = req.body;
        const cleanText = typeof text === 'string' ? text.trim() : '';
        if (!cleanText) return res.status(400).json({ success: false, message: 'Reply text is required.' });

        comment.replies.push({
            user: req.user._id,
            userName: req.user.fullname || 'Admin',
            text: cleanText,
            isAdmin: true
        });
        await paper.save();

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        console.error('Reply to comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to post reply.' });
    }
};

// @desc    Admin delete a paper comment
// @route   DELETE /api/papers/:id/comments/:commentId
// @access  Admin
const deleteComment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found.' });

        const comment = paper.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

        paper.comments.pull(req.params.commentId);
        await paper.save();

        res.status(200).json({ success: true, message: 'Comment removed.' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove comment.' });
    }
};

// @desc    Get all comments for a specific paper (Public - Populates ONLY fullname, never email)
// @route   GET /api/papers/:id/comments
// @access  Public
const getComments = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id)
            .select('comments')
            .populate('comments.user', 'fullname')
            .populate('comments.replies.user', 'fullname');

        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        const comments = [...(paper.comments || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            count: comments.length,
            data: comments
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ success: false, message: 'Server error loading comments.' });
    }
};

// @desc    Re-index paper RAG in background (Admin Only)
// @route   POST /api/papers/:id/reindex
// @access  Admin
const reindexPaper = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        if (isPaperIndexing(paper._id)) {
            return res.status(409).json({
                success: false,
                message: 'RAG indexing is already in progress for this paper.'
            });
        }

        indexPaper(paper._id, {}).catch(err => {
            console.error(`Background reindexing error for paper ${paper._id}:`, err);
        });

        res.status(202).json({
            success: true,
            message: 'Paper re-indexing started in background.',
            paperId: paper._id,
            ragStatus: 'pending'
        });
    } catch (error) {
        console.error('Reindex paper error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate paper re-indexing.' });
    }
};

// @desc    Get paper RAG index status & chunk counts (Admin Only)
// @route   GET /api/papers/:id/index-status
// @access  Admin
const getPaperIndexStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id).select('title ragStatus ragError');
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        const [questionChunksCount, solutionChunksCount] = await Promise.all([
            Chunk.countDocuments({ paperId: paper._id, kind: 'question' }),
            Chunk.countDocuments({ paperId: paper._id, kind: 'solution' })
        ]);

        res.status(200).json({
            success: true,
            paperId: paper._id,
            title: paper.title,
            ragStatus: paper.ragStatus || 'none',
            ragError: paper.ragError || '',
            questionChunksCount,
            solutionChunksCount,
            totalChunks: questionChunksCount + solutionChunksCount,
            isIndexing: isPaperIndexing(paper._id)
        });
    } catch (error) {
        console.error('Get paper index status error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve indexing status.' });
    }
};

// @desc    Edit paper details (Admin Only)
// @route   PATCH /api/papers/:id
// @access  Admin
const editPaperDetails = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const { title, examType, year, subject, difficulty, videoUrl, adminNotes } = req.body;

        const updateData = {};
        if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
        if (typeof examType === 'string' && examType.trim()) updateData.examType = examType.trim();
        if (year !== undefined && !Number.isNaN(Number(year))) updateData.year = Number(year);
        if (typeof subject === 'string') updateData.subject = subject.trim();
        if (typeof difficulty === 'string') updateData.difficulty = difficulty.trim();
        if (typeof videoUrl === 'string') updateData.videoUrl = videoUrl.trim();
        if (typeof adminNotes === 'string') updateData.adminNotes = adminNotes.trim();

        const paper = await Paper.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Paper details updated successfully.',
            data: paper
        });
    } catch (error) {
        console.error('Edit paper details error:', error);
        res.status(500).json({ success: false, message: 'Failed to update paper details.' });
    }
};

// @desc    Replace solution PDF file (Admin Only)
// @route   POST /api/papers/:id/replace-solution
// @access  Admin
const replaceSolutionPdf = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid paper identifier.' });
        }

        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found.' });
        }

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'Please provide a solution PDF file.' });
        }

        // Upload new solution PDF to Cloudinary
        const uploadResult = await uploadBuffer(req.file.buffer, {
            folder: 'ExamVault_Solutions',
            resourceType: 'raw',
            publicIdPrefix: `sol_${(paper.examType || 'exam').replace(/\s+/g, '_')}_${paper.year || 'year'}`
        });

        // Delete old solution PDF from Cloudinary if exists
        if (paper.solutionPublicId) {
            await deleteFile(paper.solutionPublicId, paper.solutionResourceType || 'raw').catch(err => {
                console.error('Failed to delete old solution PDF from Cloudinary:', err.message);
            });
        }

        paper.solutionUrl = uploadResult.url;
        paper.solutionPublicId = uploadResult.publicId;
        paper.solutionResourceType = uploadResult.resourceType || 'raw';
        paper.ragStatus = 'pending';
        paper.ragError = '';
        await paper.save();

        // Trigger background re-indexing with the new solution buffer
        indexPaper(paper._id, {
            solutionBuffer: req.file.buffer
        }).catch(err => {
            console.error(`Background reindexing error after solution replacement for paper ${paper._id}:`, err);
        });

        res.status(200).json({
            success: true,
            message: 'Solution PDF replaced successfully. Re-indexing in progress.',
            data: paper
        });
    } catch (error) {
        console.error('Replace solution PDF error:', error);
        res.status(500).json({ success: false, message: 'Failed to replace solution PDF.' });
    }
};

module.exports = {
    getPapers,
    getPaperById,
    getComments,
    downloadPaper,
    getSaveStatus,
    toggleSavedPaper,
    likePaper,
    dislikePaper,
    uploadPaper,
    deletePaper,
    addComment,
    replyToComment,
    deleteComment,
    reindexPaper,
    getPaperIndexStatus,
    editPaperDetails,
    replaceSolutionPdf
};
