const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); 
const { protect, admin } = require('../middleware/authMiddleware');

// FIX: Removed getPaperComments from imports
const { getPapers, getPaperById, getSaveStatus, toggleSavedPaper, likePaper, dislikePaper, uploadPaper, deletePaper, addComment, getComments, replyToComment, deleteComment } = require('../controllers/paperController');

const uploadPaperFiles = upload.fields([
    { name: 'paperFile', maxCount: 1 },
    { name: 'solutionFile', maxCount: 1 }
]);

const handlePaperUpload = (req, res, next) => {
    uploadPaperFiles(req, res, (error) => {
        if (!error) {
            console.log('✅ Multer upload completed successfully');
            return next();
        }

        console.error('❌ Multer upload error:', error.code, error.message);
        const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Upload failed.'
        });
    });
};

// Standard Routes
router.get('/', getPapers);
router.get('/:id', getPaperById);
router.post('/:id/like', protect, likePaper);
router.post('/:id/dislike', protect, dislikePaper);
router.get('/:id/save', protect, getSaveStatus);
router.post('/:id/save', protect, toggleSavedPaper);
router.delete('/:id', protect, admin, deletePaper);

// --- COMMENTS ROUTES ---
// GET: Anyone can view comments
router.get('/:id/comments', getComments);
router.get('/:id/comment', getComments); // Typo safety alias

// POST: Logged-in users can post a comment
router.post('/:id/comments', protect, addComment);
router.post('/:id/comment', protect, addComment); // Typo safety alias

// Admin-only comment moderation
router.post('/:id/comments/:commentId/replies', protect, admin, replyToComment);
router.delete('/:id/comments/:commentId', protect, admin, deleteComment);

// UPLOAD ROUTE: Fully Secured for Admin Only
router.post('/upload', protect, admin, handlePaperUpload, uploadPaper);

module.exports = router;
