const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getStats,
    getUsers,
    updateUserRole,
    getAllComments,
    deleteCommentAdmin,
    markMessageRead,
    deleteMessageAdmin
} = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(protect, admin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/comments', getAllComments);
router.delete('/comments/:paperId/:commentId', deleteCommentAdmin);
router.patch('/messages/:id/read', markMessageRead);
router.delete('/messages/:id', deleteMessageAdmin);

module.exports = router;
