// backend/routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const commentController = require('../controllers/commentController');

// Add a new comment
router.post('/', authMiddleware, commentController.addComment);

// Get comments for a specific post
router.get('/post/:postId', authMiddleware, commentController.getComments);

// Delete comment (optional - for comment authors only)
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

// Like a comment (optional)
router.post('/:commentId/like', authMiddleware, commentController.likeComment);

module.exports = router;
