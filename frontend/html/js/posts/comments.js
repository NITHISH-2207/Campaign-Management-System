// frontend/js/posts/comments.js
class CommentManager {
    constructor() {
        this.currentPostId = null;
        this.isPostAuthor = false;
    }

    async loadComments(postId, isPostAuthor = false) {
        this.currentPostId = postId;
        this.isPostAuthor = isPostAuthor;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/comments/post/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load comments');

            const data = await response.json();
            if (data.success) {
                this.displayComments(postId, data.comments, data.isPostAuthor);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            this.showError(postId, 'Failed to load comments');
        }
    }

    displayComments(postId, comments, isPostAuthor) {
        const container = document.getElementById(`comments-list-${postId}`);
        
        if (!container) return;
        
        if (comments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }

        const commentsHTML = comments.map(comment => this.createCommentHTML(comment, isPostAuthor)).join('');
        container.innerHTML = commentsHTML;
    }

    createCommentHTML(comment, isPostAuthor) {
        const currentUserId = getCurrentUserId();
        const isCommentAuthor = comment.authorId._id === currentUserId;
        const showSentiment = isPostAuthor && comment.sentiment;
        
        let repliesHTML = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHTML = `
                <div class="comment-replies">
                    ${comment.replies.map(reply => this.createReplyHTML(reply, isPostAuthor)).join('')}
                </div>
            `;
        }
        
        return `
            <div class="comment" data-comment-id="${comment._id}">
                <div class="comment-content">
                    <div class="comment-header">
                        <img src="${comment.authorId.avatar || 'https://via.placeholder.com/30'}" alt="${comment.authorId.name}" class="comment-avatar">
                        <div class="comment-meta">
                            <strong>${comment.authorId.name}</strong>
                            <span class="comment-time">${getTimeAgo(comment.createdAt)}</span>
                            ${showSentiment ? this.createSentimentBadge(comment.sentiment) : ''}
                        </div>
                        ${isCommentAuthor ? `
                            <button class="comment-delete" onclick="deleteComment('${comment._id}', '${this.currentPostId}')">
                                <span><i class="fas fa-trash-can"></i></span>
                            </button>
                        ` : ''}
                    </div>
                    <p class="comment-text">${this.escapeHtml(comment.content)}</p>
                    <div class="comment-actions">
                        <button class="comment-like" onclick="likeComment('${comment._id}')">
                            <i class="fas fa-thumbs-up"></i> ${comment.likes || 0}
                        </button>
                        <button class="comment-reply" onclick="showReplyForm('${comment._id}')">
                            Reply
                        </button>
                    </div>
                    <div class="reply-form-container" id="reply-form-${comment._id}" style="display: none;">
                        <input type="text" class="reply-input" placeholder="Write a reply..." id="reply-input-${comment._id}">
                        <button onclick="submitReply('${this.currentPostId}', '${comment._id}')">Reply</button>
                        <button onclick="hideReplyForm('${comment._id}')">Cancel</button>
                    </div>
                </div>
                ${repliesHTML}
            </div>
        `;
    }

    createReplyHTML(reply, isPostAuthor) {
        const currentUserId = getCurrentUserId();
        const isReplyAuthor = reply.authorId._id === currentUserId;
        const showSentiment = isPostAuthor && reply.sentiment;
        
        return `
            <div class="comment-reply" data-comment-id="${reply._id}">
                <div class="comment-header">
                    <img src="${reply.authorId.avatar || 'https://via.placeholder.com/25'}" alt="${reply.authorId.name}" class="comment-avatar small">
                    <div class="comment-meta">
                        <strong>${reply.authorId.name}</strong>
                        <span class="comment-time">${getTimeAgo(reply.createdAt)}</span>
                        ${showSentiment ? this.createSentimentBadge(reply.sentiment) : ''}
                    </div>
                    ${isReplyAuthor ? `
                        <button class="comment-delete" onclick="deleteComment('${reply._id}', '${this.currentPostId}')">
                            <span><i class="fas fa-trash-can"></i></span>
                        </button>
                    ` : ''}
                </div>
                <p class="comment-text">${this.escapeHtml(reply.content)}</p>
            </div>
        `;
    }

    createSentimentBadge(sentiment) {
        if (!sentiment) return '';
        
        const emoji = getSentimentEmoji(sentiment.label);
        const colorClass = `sentiment-${sentiment.label}`;
        
        return `
            <span class="comment-sentiment ${colorClass}" title="Sentiment: ${sentiment.label} (${sentiment.score}% confidence)">
                ${emoji} ${sentiment.label}
            </span>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(postId, message) {
        const container = document.getElementById(`comments-list-${postId}`);
        if (container) {
            container.innerHTML = `<p class="error-message">${message}</p>`;
        }
    }
}

// Global comment manager instance
const commentManager = new CommentManager();

// Global functions called from HTML
async function submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) {
        alert('Please enter a comment');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ postId, content })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            input.value = '';
            // Reload comments to show the new one
            await commentManager.loadComments(postId);
            // Update comment count
            await loadPosts();
        } else {
            alert(data.message || 'Failed to post comment');
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        alert('Failed to post comment');
    }
}

async function submitReply(postId, parentCommentId) {
    const input = document.getElementById(`reply-input-${parentCommentId}`);
    const content = input.value.trim();
    
    if (!content) {
        alert('Please enter a reply');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ postId, content, parentCommentId })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            input.value = '';
            hideReplyForm(parentCommentId);
            await commentManager.loadComments(postId);
            await loadPosts();
        } else {
            alert(data.message || 'Failed to post reply');
        }
    } catch (error) {
        console.error('Error posting reply:', error);
        alert('Failed to post reply');
    }
}

async function deleteComment(commentId, postId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            await commentManager.loadComments(postId);
            await loadPosts();
        } else {
            alert('Failed to delete comment');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment');
    }
}

async function likeComment(commentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Update like count in UI
            const likeButton = document.querySelector(`[data-comment-id="${commentId}"] .comment-like`);
            if (likeButton) {
                likeButton.innerHTML = `<i class="fas fa-thumbs-up"></i> ${data.likes || 0}`;
            }
        }
    } catch (error) {
        console.error('Error liking comment:', error);
    }
}

function showReplyForm(commentId) {
    document.getElementById(`reply-form-${commentId}`).style.display = 'block';
    document.getElementById(`reply-input-${commentId}`).focus();
}

function hideReplyForm(commentId) {
    document.getElementById(`reply-form-${commentId}`).style.display = 'none';
    document.getElementById(`reply-input-${commentId}`).value = '';
}
