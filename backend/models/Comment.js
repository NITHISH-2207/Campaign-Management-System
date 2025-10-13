// backend/models/Comment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    authorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 500
    },
    sentiment: {
        label: {
            type: String,
            enum: ['positive', 'negative', 'neutral'],
            default: 'neutral'
        },
        score: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        analyzedAt: Date
    },
    likes: {
        type: Number,
        default: 0
    },
    isReply: {
        type: Boolean,
        default: false
    },
    parentCommentId: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
commentSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
