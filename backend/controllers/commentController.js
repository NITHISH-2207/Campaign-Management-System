// backend/controllers/commentController.js
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const sentimentAnalyzer = require('../services/sentimentAnalysis');

const commentController = {
    // Add comment with sentiment analysis
    addComment: async (req, res) => {
        try {
            const { postId, content, parentCommentId } = req.body;
            const authorId = req.user.id || req.user._id;

            // Validate content
            if (!content || content.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Comment content cannot be empty'
                });
            }

            // Check if post exists and allows comments
            const post = await Post.findById(postId);
            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            if (!post.enableComments) {
                return res.status(403).json({
                    success: false,
                    message: 'Comments are disabled for this post'
                });
            }

            // Analyze sentiment
            const sentimentResult = sentimentAnalyzer.analyzeText(content);

            const newComment = new Comment({
                postId,
                authorId,
                content: content.trim(),
                parentCommentId,
                isReply: !!parentCommentId,
                sentiment: {
                    label: sentimentResult.label,
                    score: sentimentResult.score,
                    analyzedAt: new Date()
                }
            });

            await newComment.save();

            // Update post comment count
            post.engagement.comments += 1;
            await post.save();
            
            // Update post sentiment after delay to avoid blocking
            setTimeout(async () => {
                try {
                    await post.updateSentiment();
                } catch (error) {
                    console.error('Error updating post sentiment:', error);
                }
            }, 100);

            // Populate author details
            await newComment.populate('authorId', 'name avatar');

            res.status(201).json({
                success: true,
                message: 'Comment added successfully',
                comment: newComment
            });
        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add comment',
                error: error.message
            });
        }
    },

    // Get comments for a post with conditional sentiment visibility
    getComments: async (req, res) => {
        try {
            const { postId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const userId = req.user.id || req.user._id;

            // Get the post to check if user is author
            const post = await Post.findById(postId).populate('authorId');
            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Post not found'
                });
            }

            const isPostAuthor = post.authorId._id.toString() === userId.toString();

            // Get main comments (not replies)
            const comments = await Comment.find({ postId, isReply: false })
                .populate('authorId', 'name avatar')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            // Get replies for each comment
            const commentsWithReplies = await Promise.all(
                comments.map(async (comment) => {
                    const replies = await Comment.find({ 
                        parentCommentId: comment._id 
                    }).populate('authorId', 'name avatar').lean();
                    
                    // Only include sentiment if user is post author
                    const processedReplies = replies.map(reply => ({
                        ...reply,
                        sentiment: isPostAuthor ? reply.sentiment : undefined,
                        showSentiment: isPostAuthor
                    }));
                    
                    return {
                        ...comment,
                        sentiment: isPostAuthor ? comment.sentiment : undefined,
                        showSentiment: isPostAuthor,
                        replies: processedReplies
                    };
                })
            );

            const totalComments = await Comment.countDocuments({ postId });

            res.json({
                success: true,
                comments: commentsWithReplies,
                totalPages: Math.ceil(totalComments / limit),
                currentPage: page,
                isPostAuthor
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch comments',
                error: error.message
            });
        }
    },

    // Delete comment (optional)
    deleteComment: async (req, res) => {
        try {
            const { commentId } = req.params;
            const userId = req.user.id || req.user._id;

            const comment = await Comment.findById(commentId);
            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: 'Comment not found'
                });
            }

            // Check if user is comment author
            if (comment.authorId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own comments'
                });
            }

            await comment.deleteOne();

            // Update post comment count
            await Post.findByIdAndUpdate(comment.postId, {
                $inc: { 'engagement.comments': -1 }
            });

            res.json({
                success: true,
                message: 'Comment deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete comment',
                error: error.message
            });
        }
    },

    // Like comment (optional)
    likeComment: async (req, res) => {
        try {
            const { commentId } = req.params;

            const comment = await Comment.findByIdAndUpdate(
                commentId,
                { $inc: { likes: 1 } },
                { new: true }
            );

            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: 'Comment not found'
                });
            }

            res.json({
                success: true,
                likes: comment.likes
            });
        } catch (error) {
            console.error('Error liking comment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to like comment',
                error: error.message
            });
        }
    }
};

module.exports = commentController;
