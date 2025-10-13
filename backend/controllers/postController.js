// backend/controllers/postController.js
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import analytics controller for tracking
const { updateAnalytics } = require('./analyticsController');

// Fix the upload path - it should be inside backend folder
const uploadPath = path.join(__dirname, '..', 'uploads', 'posts');
console.log('Upload path:', uploadPath);

// Ensure upload directory exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('Created upload directory:', uploadPath);
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const postController = {
    // Create new post
    createPost: async (req, res) => {
        try {
            console.log('Creating post with data:', req.body);
            console.log('File uploaded:', req.file ? req.file.filename : 'No file');
            console.log('User role:', req.user.role);
            
            const { campaignId, title, content, tags, enableComments, postType } = req.body;
            const authorId = req.user.id || req.user._id;
            
            // Determine post type based on user role and selection
            const isRegularUser = ['user', 'participant'].includes(req.user.role);
            const finalPostType = (isRegularUser || postType === 'personal') ? 'personal' : 'campaign';
            
            // For personal posts, campaignId is optional
            const postData = {
                authorId,
                title,
                content,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                enableComments: enableComments === 'true' || enableComments === true,
                imageUrl: req.file ? `/uploads/posts/${req.file.filename}` : null,
                postType: finalPostType,
                authorRole: req.user.role
            };
            
            // Only add campaignId if it's a campaign post
            if (finalPostType === 'campaign' && campaignId && campaignId !== 'personal') {
                postData.campaignId = campaignId;
            }

            const newPost = new Post(postData);
            await newPost.save();

            // Populate author details
            await newPost.populate('authorId', 'name avatar role');

            console.log('Post created successfully:', newPost._id);

            // Track analytics for campaign posts
            if (newPost.campaignId) {
                await updateAnalytics(newPost._id, 'posts');
            }

            res.status(201).json({
                success: true,
                message: 'Post created successfully',
                post: newPost
            });
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create post',
                error: error.message
            });
        }
    },

    // Get posts with pagination and filtering
    getPosts: async (req, res) => {
        try {
            const { campaignId, page = 1, limit = 10, filter = 'all', sort = 'recent' } = req.query;
            const userId = req.user.id || req.user._id;
            
            let query = {};
            
            // Apply filters
            if (campaignId && campaignId !== 'all') {
                query.campaignId = campaignId;
            }
            
            // Filter by post type
            if (filter === 'campaign') {
                query.postType = 'campaign';
            } else if (filter === 'personal') {
                query.postType = 'personal';
            }
            
            // Determine sort order
            let sortOptions = { createdAt: -1 }; // Default: recent first
            
            if (sort === 'trending') {
                // Sort by total engagement
                sortOptions = { 
                    'engagement.likes': -1,
                    'engagement.comments': -1,
                    'engagement.views': -1 
                };
            } else if (sort === 'popular') {
                sortOptions = { 'engagement.likes': -1 };
            }
            
            const posts = await Post.find(query)
                .populate('authorId', 'name avatar role')
                .populate('campaignId', 'title')
                .sort(sortOptions)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            // Add user-specific data and calculate engagement metrics
            const postsWithMetrics = posts.map(post => {
                const totalEngagement = (post.engagement.views || 0) + 
                                      (post.engagement.likes || 0) + 
                                      (post.engagement.shares || 0) + 
                                      (post.engagement.comments || 0);
                
                return {
                    ...post,
                    isAuthor: post.authorId._id.toString() === userId.toString(),
                    isLiked: post.likedBy && post.likedBy.some(id => id.toString() === userId.toString()),
                    imageUrl: post.imageUrl ? `http://localhost:3000${post.imageUrl}` : null,
                    totalEngagement
                };
            });

            const totalPosts = await Post.countDocuments(query);

            res.json({
                success: true,
                posts: postsWithMetrics,
                totalPages: Math.ceil(totalPosts / limit),
                currentPage: parseInt(page),
                totalPosts
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch posts',
                error: error.message
            });
        }
    },

    // Get single post with comments
    getPost: async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const postId = req.params.id;
            
            const post = await Post.findById(postId)
                .populate('authorId', 'name avatar role')
                .populate('campaignId', 'title')
                .lean();

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            // Increment view count and track analytics
            await Post.findByIdAndUpdate(postId, {
                $inc: { 'engagement.views': 1 },
                $addToSet: { viewedBy: userId } // Track unique views
            });

            // Track view analytics
            if (post.campaignId) {
                await updateAnalytics(postId, 'views');
            }

            const isAuthor = post.authorId._id.toString() === userId.toString();
            const isLiked = post.likedBy && post.likedBy.some(id => id.toString() === userId.toString());
            
            // Get comments with sentiment analysis
            let comments = [];
            if (isAuthor || post.enableComments) {
                comments = await Comment.find({ postId: post._id })
                    .populate('authorId', 'name avatar')
                    .sort({ createdAt: -1 })
                    .lean();
            }

            // Calculate engagement metrics
            const totalEngagement = (post.engagement.views || 0) + 
                                  (post.engagement.likes || 0) + 
                                  (post.engagement.shares || 0) + 
                                  (post.engagement.comments || 0);

            res.json({
                success: true,
                post: {
                    ...post,
                    isAuthor,
                    isLiked,
                    imageUrl: post.imageUrl ? `http://localhost:3000${post.imageUrl}` : null,
                    totalEngagement
                },
                comments: isAuthor ? comments : comments.map(c => ({
                    ...c,
                    sentiment: isAuthor ? c.sentiment : null // Hide sentiment from non-authors
                }))
            });
        } catch (error) {
            console.error('Error fetching post:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch post',
                error: error.message
            });
        }
    },

    // Like/Unlike post
    toggleLike: async (req, res) => {
        try {
            const postId = req.params.id;
            const userId = req.user.id || req.user._id;
            
            const post = await Post.findById(postId);

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            const likeIndex = post.likedBy.findIndex(id => id.toString() === userId.toString());
            
            if (likeIndex > -1) {
                // Unlike
                post.likedBy.splice(likeIndex, 1);
                post.engagement.likes = Math.max(0, post.engagement.likes - 1);
            } else {
                // Like
                post.likedBy.push(userId);
                post.engagement.likes += 1;
                
                // Track like analytics
                if (post.campaignId) {
                    await updateAnalytics(postId, 'likes');
                }
            }

            await post.save();

            res.json({
                success: true,
                liked: likeIndex === -1,
                likes: post.engagement.likes
            });
        } catch (error) {
            console.error('Error toggling like:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle like',
                error: error.message
            });
        }
    },

    // Share post (new method)
    sharePost: async (req, res) => {
        try {
            const postId = req.params.id;
            const userId = req.user.id || req.user._id;
            
            const post = await Post.findById(postId);

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            // Increment share count
            post.engagement.shares = (post.engagement.shares || 0) + 1;
            
            // Track who shared (optional)
            if (!post.sharedBy) {
                post.sharedBy = [];
            }
            if (!post.sharedBy.includes(userId)) {
                post.sharedBy.push(userId);
            }

            await post.save();

            // Track share analytics
            if (post.campaignId) {
                await updateAnalytics(postId, 'shares');
            }

            res.json({
                success: true,
                shares: post.engagement.shares,
                message: 'Post shared successfully'
            });
        } catch (error) {
            console.error('Error sharing post:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to share post',
                error: error.message
            });
        }
    },

    // Get trending posts (new method)
    getTrendingPosts: async (req, res) => {
        try {
            const { limit = 10, timeframe = 7 } = req.query;
            const userId = req.user.id || req.user._id;
            
            // Calculate date threshold
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - timeframe);

            // Find posts with high engagement in the timeframe
            const posts = await Post.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateThreshold }
                    }
                },
                {
                    $addFields: {
                        engagementScore: {
                            $add: [
                                { $multiply: ['$engagement.views', 1] },
                                { $multiply: ['$engagement.likes', 5] },
                                { $multiply: ['$engagement.comments', 3] },
                                { $multiply: ['$engagement.shares', 10] }
                            ]
                        }
                    }
                },
                {
                    $sort: { engagementScore: -1 }
                },
                {
                    $limit: parseInt(limit)
                }
            ]);

            // Populate references
            await Post.populate(posts, [
                { path: 'authorId', select: 'name avatar role' },
                { path: 'campaignId', select: 'title' }
            ]);

            // Add user-specific data
            const postsWithUserData = posts.map(post => ({
                ...post,
                isAuthor: post.authorId._id.toString() === userId.toString(),
                isLiked: post.likedBy && post.likedBy.some(id => id.toString() === userId.toString()),
                imageUrl: post.imageUrl ? `http://localhost:3000${post.imageUrl}` : null
            }));

            res.json({
                success: true,
                posts: postsWithUserData,
                timeframe,
                message: `Top ${limit} trending posts from last ${timeframe} days`
            });
        } catch (error) {
            console.error('Error fetching trending posts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch trending posts',
                error: error.message
            });
        }
    },

    // Update post (for authors only)
    updatePost: async (req, res) => {
        try {
            const postId = req.params.id;
            const userId = req.user.id || req.user._id;
            const { title, content, tags, enableComments } = req.body;

            const post = await Post.findById(postId);

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            // Check if user is the author
            if (post.authorId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only edit your own posts'
                });
            }

            // Update fields
            if (title) post.title = title;
            if (content) post.content = content;
            if (tags) post.tags = tags.split(',').map(tag => tag.trim());
            if (enableComments !== undefined) post.enableComments = enableComments;

            post.updatedAt = new Date();

            await post.save();

            // Populate author details
            await post.populate('authorId', 'name avatar role');

            res.json({
                success: true,
                message: 'Post updated successfully',
                post
            });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update post',
                error: error.message
            });
        }
    },

    // Delete post (for authors only)
    deletePost: async (req, res) => {
        try {
            const postId = req.params.id;
            const userId = req.user.id || req.user._id;

            const post = await Post.findById(postId);

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            // Check if user is the author
            if (post.authorId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own posts'
                });
            }

            // Delete associated comments
            await Comment.deleteMany({ postId });

            // Delete the post
            await post.deleteOne();

            // Delete associated image file if exists
            if (post.imageUrl) {
                const imagePath = path.join(__dirname, '..', post.imageUrl);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            res.json({
                success: true,
                message: 'Post deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete post',
                error: error.message
            });
        }
    }
};

module.exports = { postController, upload };
