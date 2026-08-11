// frontend/js/campaign/manager-dashboard.js

var API_BASE_URL = window.API_BASE_URL || ((window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? 'http://localhost:3000/api'
    : 'https://campaign-management-system-zquy.onrender.com/api');

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Verify campaign manager access
    if (!token || !['campaign_manager', 'admin'].includes(user.role)) {
        window.location.href = 'education-library.html';
        return;
    }

    // Display user name
    if (user.name) {
        document.getElementById('userMenu').textContent = `Hi, ${user.name}`;
    }

    // Load dynamic dashboard data exclusively from database via backend API
    await loadManagerDashboardData(token);
});

// Fetch all manager dashboard data directly from the MongoDB backend API
async function loadManagerDashboardData(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/campaigns/manager/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            updateDashboardStats(data.stats || {});
            displayCampaigns(data.campaigns || []);
            displayRecentPosts(data.recentActivity?.recentPosts || []);
            displayRecentSurveys(data.recentActivity?.recentSurveys || []);
            displayModuleCompletions(data.recentActivity?.moduleCompletions || []);
        } else {
            console.error('Error fetching manager dashboard data:', data.message);
        }
    } catch (error) {
        console.error('Failed to load manager dashboard:', error);
    }
}

// Update performance metric counters
function updateDashboardStats(stats) {
    document.getElementById('totalEngagement').textContent =
        (stats.totalEngagement || 0).toLocaleString();
    document.getElementById('activeUsers').textContent =
        (stats.activeUsers || 0).toLocaleString();
    document.getElementById('surveyResponses').textContent =
        (stats.surveyResponses || 0).toLocaleString();
    document.getElementById('moduleComplete').textContent =
        (stats.moduleCompletions || 0).toLocaleString();
}

// Display manager's campaigns
function displayCampaigns(campaigns) {
    const container = document.getElementById('campaignsGrid');

    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No campaigns yet. Create your first campaign!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = campaigns.map(campaign => `
        <div class="campaign-card">
            <span class="campaign-status ${campaign.status}">${campaign.status}</span>
            <h3>${campaign.title}</h3>
            <p class="campaign-category">${campaign.category}</p>
            <p class="campaign-description">${campaign.description}</p>
            <div class="campaign-stats">
                <div class="stat">
                    <span class="stat-value">${campaign.stats?.posts || 0}</span>
                    <span class="stat-label">Posts</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${campaign.stats?.engagement || 0}</span>
                    <span class="stat-label">Engagement</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${campaign.stats?.surveys || 0}</span>
                    <span class="stat-label">Surveys</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${campaign.stats?.modules || 0}</span>
                    <span class="stat-label">Modules</span>
                </div>
            </div>
            <div class="campaign-actions">
                <button class="btn-view" onclick="viewCampaign('${campaign._id}')">View Details</button>
                <button class="btn-edit" onclick="editCampaign('${campaign._id}')">Edit</button>
            </div>
        </div>
    `).join('');
}

// Display real recent posts belonging to manager
function displayRecentPosts(posts) {
    const container = document.getElementById('recentPosts');

    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="activity-item">No posts yet. Create your first post!</div>';
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="activity-item">
            <h4>${post.title}</h4>
            <div class="activity-meta">
                <span><i class="fas fa-heart"></i> ${post.engagement?.likes || 0} likes</span>
                <span><i class="fas fa-comment"></i> ${post.engagement?.comments || 0} comments</span>
                <span>${getTimeAgo(post.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// Display real survey responses for manager's surveys
function displayRecentSurveys(surveys) {
    const container = document.getElementById('recentSurveys');

    if (!surveys || surveys.length === 0) {
        container.innerHTML = '<div class="activity-item">No survey responses yet.</div>';
        return;
    }

    container.innerHTML = surveys.map(survey => `
        <div class="activity-item">
            <h4>${survey.surveyTitle}</h4>
            <div class="activity-meta">
                <span><i class="fas fa-users"></i> ${survey.responseCount || 0} responses</span>
                <span>${survey.lastResponse ? getTimeAgo(survey.lastResponse) : 'No responses yet'}</span>
            </div>
        </div>
    `).join('');
}

// Display real module completions for manager's education modules
function displayModuleCompletions(modules) {
    const container = document.getElementById('moduleCompletions');

    if (!modules || modules.length === 0) {
        container.innerHTML = '<div class="activity-item">No module completions yet.</div>';
        return;
    }

    container.innerHTML = modules.map(completion => `
        <div class="activity-item">
            <h4>${completion.moduleTitle}</h4>
            <div class="activity-meta">
                <span><i class="fas fa-graduation-cap"></i> ${completion.completionCount || 0} completions</span>
                <span><i class="fas fa-percentage"></i> ${completion.averageScore || 0}% avg score</span>
            </div>
        </div>
    `).join('');
}

function viewCampaign(campaignId) {
    window.location.href = `analytics-dashboard.html?campaignId=${campaignId}`;
}

function editCampaign(campaignId) {
    alert('Edit campaign feature coming soon!');
}

function getTimeAgo(date) {
    if (!date) return 'N/A';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('createCampaignModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
