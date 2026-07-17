const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); 
const { protect, admin } = require('../middleware/authMiddleware');

// FIX: Removed getPaperComments from imports
const { getPapers, getPaperById, getSaveStatus, toggleSavedPaper, likePaper, dislikePaper, uploadPaper, addComment, getComments, replyToComment, deleteComment } = require('../controllers/paperController');

// Standard Routes
router.get('/', getPapers);
router.get('/:id', getPaperById);
router.post('/:id/like', protect, likePaper);
router.post('/:id/dislike', protect, dislikePaper);
router.get('/:id/save', protect, getSaveStatus);
router.post('/:id/save', protect, toggleSavedPaper);

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
router.post('/upload', protect, admin, upload.fields([
    { name: 'paperFile', maxCount: 1 },
    { name: 'solutionFile', maxCount: 1 }
]), uploadPaper);

module.exports = router;
