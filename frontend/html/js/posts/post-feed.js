// frontend/js/posts/post-feed.js
var API_BASE_URL = window.API_BASE_URL || 'https://campaign-management-system-zquy.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Check authentication
    if (!user.id) {
        window.location.href = 'login.html';
        return;
    }

    // Setup navigation based on role
    setupNavigation(user);

    // Load posts
    await loadPosts();

    // Set up filter buttons
    setupFilterButtons();
});

function setupNavigation(user) {
    // Update user menu
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.textContent = `Hi, ${user.name}`;
    }

    // Show/hide role-specific elements
    if (['campaign_manager', 'admin'].includes(user.role)) {
        const managerLinks = document.getElementById('managerLinks');
        if (managerLinks) {
            managerLinks.style.display = 'block';
        }
    }

    // Show create post link for all users
    const createPostLink = document.getElementById('createPostLink');
    if (createPostLink) {
        createPostLink.style.display = 'block';
    }
}

function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            loadPosts(e.target.dataset.filter);
        });
    });
}

async function loadPosts(filter = 'all') {
    try {
        let url = `${API_BASE_URL}/api/posts?`;

        // Apply filters
        switch (filter) {
            case 'trending':
                url += 'sort=engagement&limit=10';
                break;
            case 'recent':
                url += 'sort=createdAt&limit=10';
                break;
            case 'campaign':
                url += 'postType=campaign';
                break;
            case 'personal':
                url += 'postType=personal';
                break;
            default:
                url += 'filter=all';
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load posts');

        const { posts } = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('postsContainer').innerHTML =
            '<div class="error-message">Error loading posts. Please refresh the page.</div>';
    }
}

function displayPosts(posts) {
    const container = document.getElementById('postsContainer');

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="no-posts">
                <p>No posts available yet.</p>
                <a href="create-post.html" class="btn btn-primary">Create the first post!</a>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => createPostHTML(post)).join('');
}

function createPostHTML(post) {
    const isAuthor = post.isAuthor;
    const postTypeClass = post.postType === 'personal' ? 'personal-post' : 'campaign-post';
    const sentimentData = calculateSentimentPercentages(post.sentiment);
    const currentUserId = getCurrentUserId();
    const isLiked = post.likedBy && post.likedBy.includes(currentUserId);

    return `
        <article class="post-card ${postTypeClass} ${isAuthor ? 'author-post' : ''}" data-post-id="${post._id}">
            ${post.postType === 'personal' ? '<div class="post-type-badge personal-badge">Personal Experience</div>' : ''}
            ${post.postType === 'campaign' ? '<div class="post-type-badge campaign-badge">Campaign Post</div>' : ''}
            
            <div class="post-header">
                <img src="${post.authorId.avatar || 'https://via.placeholder.com/40'}" alt="User" class="user-avatar">
                <div class="post-meta">
                    <h3 class="post-author">${post.authorId.name}</h3>
                    <span class="post-role">${getRoleDisplay(post.authorId.role)}</span>
                    <span class="post-time">${getTimeAgo(post.createdAt)}</span>
                </div>
                ${isAuthor ? `
                    <div class="post-options">
                        <button class="post-options-btn" onclick="togglePostOptions('${post._id}')">⋮</button>
                        <div class="post-options-menu" id="options-${post._id}" style="display: none;">
                            <a href="#" onclick="editPost('${post._id}')">Edit</a>
                            <a href="#" onclick="deletePost('${post._id}')">Delete</a>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="post-content">
                <h2 class="post-title">${escapeHtml(post.title)}</h2>
                <p class="post-text">${escapeHtml(post.content)}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image" onerror="handleImageError(this)">` : ''}
                <div class="post-tags">
                    ${post.tags.map(tag => `<span class="tag" onclick="filterByTag('${tag}')">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>

            ${isAuthor && post.engagement.comments > 0 ? `
                <div class="post-sentiment">
                    <h4 class="sentiment-title">Community Sentiment Analysis</h4>
                    <div class="sentiment-bar">
                        <div class="sentiment-positive" style="width: ${sentimentData.positive}%" title="Positive: ${sentimentData.positive}%"></div>
                        <div class="sentiment-neutral" style="width: ${sentimentData.neutral}%" title="Neutral: ${sentimentData.neutral}%"></div>
                        <div class="sentiment-negative" style="width: ${sentimentData.negative}%" title="Negative: ${sentimentData.negative}%"></div>
                    </div>
                    <div class="sentiment-details">
                        <span class="sentiment-label">Overall: ${getSentimentEmoji(post.sentiment.overall)} ${post.sentiment.overall}</span>
                        <span class="sentiment-breakdown">(${post.engagement.comments} comments analyzed)</span>
                        <button class="refresh-sentiment" onclick="refreshPost('${post._id}')" title="Refresh sentiment">🔄</button>
                    </div>
                </div>
            ` : ''}

            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post._id}')">
                    <span class="action-icon">${isLiked ? '❤️' : '🤍'}</span> 
                    <span class="action-text">Like</span>
                    <span class="action-count">(${post.engagement.likes})</span>
                </button>
                <button class="action-btn" onclick="toggleComments('${post._id}')">
                    <span class="action-icon">💬</span> 
                    <span class="action-text">Comment</span>
                    <span class="action-count">(${post.engagement.comments})</span>
                </button>
                <button class="action-btn" onclick="sharePost('${post._id}')">
                    <span class="action-icon">🔗</span> 
                    <span class="action-text">Share</span>
                    <span class="action-count">(${post.engagement.shares})</span>
                </button>
                <button class="action-btn" onclick="showPostStats('${post._id}')">
                    <span class="action-icon">📊</span> 
                    <span class="action-text">Stats</span>
                </button>
            </div>

            <div class="comments-section" id="comments-${post._id}" style="display: none;">
                ${post.enableComments || isAuthor ? `
                    <div class="comment-form">
                        <textarea 
                            placeholder="Add a thoughtful comment..." 
                            class="comment-input" 
                            id="comment-input-${post._id}"
                            rows="2"
                            onkeydown="handleCommentKeypress(event, '${post._id}')"
                        ></textarea>
                        <div class="comment-actions">
                            <span class="char-count" id="comment-char-${post._id}">0/500</span>
                            <button class="comment-submit" onclick="submitComment('${post._id}')">Post Comment</button>
                        </div>
                    </div>
                ` : '<p class="comments-disabled">Comments are disabled for this post.</p>'}
                <div class="comments-list" id="comments-list-${post._id}">
                    <div class="loading">Loading comments...</div>
                </div>
            </div>
        </article>
    `;
}

function getRoleDisplay(role) {
    const roleMap = {
        'campaign_manager': 'Campaign Manager',
        'admin': 'Administrator',
        'user': 'Community Member',
        'participant': 'Community Participant'
    };
    return roleMap[role] || 'Member';
}

function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || user._id;
}

function calculateSentimentPercentages(sentiment) {
    if (!sentiment || !sentiment.scores) {
        return { positive: 33, neutral: 34, negative: 33 };
    }

    const { positive = 0, neutral = 0, negative = 0 } = sentiment.scores;
    const total = positive + neutral + negative;

    if (total === 0) {
        return { positive: 33, neutral: 34, negative: 33 };
    }

    return {
        positive: Math.round((positive / total) * 100),
        neutral: Math.round((neutral / total) * 100),
        negative: Math.round((negative / total) * 100)
    };
}

function getSentimentEmoji(sentiment) {
    const emojiMap = {
        'positive': '😊',
        'negative': '😢',
        'mixed': '🤔',
        'neutral': '😐'
    };
    return emojiMap[sentiment] || '😐';
}

async function likePost(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Update UI without full reload
            updatePostLikes(postId, data.liked, data.likes);
        }
    } catch (error) {
        console.error('Error liking post:', error);
    }
}

function updatePostLikes(postId, isLiked, likeCount) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
        const likeBtn = postElement.querySelector('.action-btn');
        likeBtn.classList.toggle('liked', isLiked);
        likeBtn.querySelector('.action-icon').textContent = isLiked ? '❤️' : '🤍';
        likeBtn.querySelector('.action-count').textContent = `(${likeCount})`;
    }
}

async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);

    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        await loadComments(postId);
        // Focus on comment input
        const input = document.getElementById(`comment-input-${postId}`);
        if (input) input.focus();
    } else {
        commentsSection.style.display = 'none';
    }
}

async function loadComments(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    const isPostAuthor = postElement && postElement.classList.contains('author-post');

    if (typeof commentManager !== 'undefined') {
        await commentManager.loadComments(postId, isPostAuthor);
    } else {
        // Fallback if comment manager isn't loaded
        console.error('Comment manager not loaded');
    }
}

async function refreshPost(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const { post } = await response.json();

            // Update sentiment display
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement && post.isAuthor) {
                const sentimentData = calculateSentimentPercentages(post.sentiment);
                const sentimentBar = postElement.querySelector('.sentiment-bar');

                if (sentimentBar) {
                    sentimentBar.innerHTML = `
                        <div class="sentiment-positive" style="width: ${sentimentData.positive}%" title="Positive: ${sentimentData.positive}%"></div>
                        <div class="sentiment-neutral" style="width: ${sentimentData.neutral}%" title="Neutral: ${sentimentData.neutral}%"></div>
                        <div class="sentiment-negative" style="width: ${sentimentData.negative}%" title="Negative: ${sentimentData.negative}%"></div>
                    `;

                    postElement.querySelector('.sentiment-label').innerHTML =
                        `Overall: ${getSentimentEmoji(post.sentiment.overall)} ${post.sentiment.overall}`;
                    postElement.querySelector('.sentiment-breakdown').textContent =
                        `(${post.engagement.comments} comments analyzed)`;
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing post:', error);
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleImageError(img) {
    img.style.display = 'none';
    console.error('Failed to load image:', img.src);
}

function filterByTag(tag) {
    // Implement tag filtering
    console.log('Filter by tag:', tag);
}

function togglePostOptions(postId) {
    const menu = document.getElementById(`options-${postId}`);
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function editPost(postId) {
    // Implement edit functionality
    console.log('Edit post:', postId);
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    // Implement delete functionality
    console.log('Delete post:', postId);
}

function showPostStats(postId) {
    // Implement stats display
    console.log('Show stats for post:', postId);
}

function sharePost(postId) {
    const url = `${window.location.origin}/post/${postId}`;

    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on ChangeWave',
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        navigator.clipboard.writeText(url);
        alert('Post link copied to clipboard!');
    }
}

function handleCommentKeypress(event, postId) {
    // Update character count
    const input = event.target;
    const charCount = document.getElementById(`comment-char-${postId}`);
    charCount.textContent = `${input.value.length}/500`;

    // Submit on Ctrl+Enter
    if (event.ctrlKey && event.key === 'Enter') {
        submitComment(postId);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return count === 1 ? `1 ${interval.label} ago` : `${count} ${interval.label}s ago`;
        }
    }

    return 'Just now';
}

// Global functions
window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
};

window.loadMorePosts = function () {
    // Implement pagination
    console.log('Load more posts');
};
