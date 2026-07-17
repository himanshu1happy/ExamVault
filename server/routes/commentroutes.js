const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getCommentsByPaper, postComment, postReply, deleteComment } = require('../controllers/commentController');

router.get('/:paperId', getCommentsByPaper);
router.post('/', postComment);
router.post('/:commentId/reply', protect, admin, postReply);
router.delete('/:commentId', protect, admin, deleteComment);

module.exports = router;
