// backend/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const { postController, upload } = require('../controllers/postController');
const authMiddleware = require('../middleware/auth');

// Get all posts
router.get('/', authMiddleware, postController.getPosts);

// Get single post
router.get('/:id', authMiddleware, postController.getPost);

// Create new post - Now allows ALL authenticated users
router.post('/create', 
    authMiddleware,  // Only authentication required, no role check
    upload.single('image'),
    postController.createPost
);

// Toggle like on post
router.post('/:id/like', authMiddleware, postController.toggleLike);

module.exports = router;
