const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { protect, admin } = require('../middleware/authMiddleware');

const {
    getPapers,
    getPaperById,
    downloadPaper,
    getSaveStatus,
    toggleSavedPaper,
    likePaper,
    dislikePaper,
    uploadPaper,
    deletePaper,
    addComment,
    getComments,
    replyToComment,
    deleteComment,
    reindexPaper,
    getPaperIndexStatus,
    editPaperDetails,
    replaceSolutionPdf
} = require('../controllers/paperController');

const uploadPaperFiles = upload.fields([
    { name: 'paperFile', maxCount: 1 },
    { name: 'solutionFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]);

const handlePaperUpload = (req, res, next) => {
    uploadPaperFiles(req, res, (error) => {
        if (!error) {
            return next();
        }

        console.error('Multer upload error:', error.code, error.message);
        const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'File upload failed. Only PDFs up to 20MB and images up to 3MB are allowed.'
        });
    });
};

// Standard Routes
router.get('/', getPapers);
router.get('/:id', getPaperById);
router.post('/:id/download', downloadPaper);
router.post('/:id/like', protect, likePaper);
router.post('/:id/dislike', protect, dislikePaper);
router.get('/:id/save', protect, getSaveStatus);
router.post('/:id/save', protect, toggleSavedPaper);
router.delete('/:id', protect, admin, deletePaper);

// --- COMMENTS ROUTES ---
router.get('/:id/comments', getComments);
router.get('/:id/comment', getComments);

router.post('/:id/comments', protect, addComment);
router.post('/:id/comment', protect, addComment);

router.post('/:id/comments/:commentId/replies', protect, admin, replyToComment);
router.delete('/:id/comments/:commentId', protect, admin, deleteComment);

// Admin-only upload & RAG indexing management
router.patch('/:id', protect, admin, editPaperDetails);
router.post('/upload', protect, admin, handlePaperUpload, uploadPaper);
router.post('/:id/reindex', protect, admin, reindexPaper);
router.get('/:id/index-status', protect, admin, getPaperIndexStatus);
router.post('/:id/replace-solution', protect, admin, upload.single('solutionFile'), replaceSolutionPdf);

module.exports = router;
