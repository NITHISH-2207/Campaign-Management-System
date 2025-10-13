// frontend/js/campaign/manager-dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Verify campaign manager access
    if (!['campaign_manager', 'admin'].includes(user.role)) {
        window.location.href = 'education-library.html';
        return;
    }

    // Display user name
    document.getElementById('userMenu').textContent = `Hi, ${user.name}`;

    // Load dashboard with mixed data (real + mock)
    loadDashboardDataMock();
    loadCampaignsMock();
    await loadRecentActivity();
});

// Mock dashboard stats
function loadDashboardDataMock() {
    const mockStats = {
        totalEngagement: 15847,
        activeUsers: 3256,
        surveyResponses: 892,
        moduleCompletions: 456
    };
    updateDashboardStats(mockStats);
}

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

// Mock campaigns data
function loadCampaignsMock() {
    const mockCampaigns = [
        {
            _id: '1',
            title: 'Clean Ocean Initiative',
            category: 'Environment',
            description: 'A campaign to reduce plastic waste in our oceans through community action and education.',
            status: 'active',
            stats: {
                posts: 24,
                engagement: 8542,
                surveys: 5,
                modules: 3
            }
        },
        {
            _id: '2',
            title: 'Digital Literacy for All',
            category: 'Education',
            description: 'Bridging the digital divide by providing free computer training to underserved communities.',
            status: 'active',
            stats: {
                posts: 18,
                engagement: 5234,
                surveys: 3,
                modules: 7
            }
        }
    ];
    
    displayCampaigns(mockCampaigns);
}

function displayCampaigns(campaigns) {
    const container = document.getElementById('campaignsGrid');
    
    if (campaigns.length === 0) {
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

async function loadRecentActivity() {
    // Load recent posts from API (dynamic)
    await loadRecentPosts();
    
    // Load mock data for surveys and modules
    loadRecentSurveyResponsesMock();
    loadModuleCompletionsMock();
}

// REAL DATA - Recent posts from API
async function loadRecentPosts() {
    try {
        const response = await fetch('http://localhost:3000/api/posts?limit=5', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const { posts } = await response.json();
            const container = document.getElementById('recentPosts');
            
            if (posts && posts.length > 0) {
                container.innerHTML = posts.map(post => `
                    <div class="activity-item">
                        <h4>${post.title}</h4>
                        <div class="activity-meta">
                            <span><i class="fas fa-heart"></i> ${post.engagement.likes} likes</span>
                            <span><i class="fas fa-comment"></i> ${post.engagement.comments} comments</span>
                            <span>${getTimeAgo(post.createdAt)}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="activity-item">No posts yet. Create your first post!</div>';
            }
        }
    } catch (error) {
        console.error('Error loading recent posts:', error);
        // Fallback to mock data if API fails
        loadRecentPostsMock();
    }
}

// Fallback mock posts
function loadRecentPostsMock() {
    const mockPosts = [
        {
            title: 'Beach Cleanup Success Story',
            engagement: { likes: 234, comments: 56 },
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
            title: 'New Recycling Guidelines Released',
            engagement: { likes: 189, comments: 42 },
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
        },
        {
            title: 'Digital Skills Workshop Announcement',
            engagement: { likes: 156, comments: 38 },
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
    ];
    
    const postsContainer = document.getElementById('recentPosts');
    postsContainer.innerHTML = mockPosts.map(post => `
        <div class="activity-item">
            <h4>${post.title}</h4>
            <div class="activity-meta">
                <span><i class="fas fa-heart"></i> ${post.engagement.likes} likes</span>
                <span><i class="fas fa-comment"></i> ${post.engagement.comments} comments</span>
                <span>${getTimeAgo(post.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// MOCK DATA - Survey responses
function loadRecentSurveyResponsesMock() {
    const mockSurveys = [
        {
            surveyTitle: 'Ocean Conservation Impact Survey',
            responseCount: 45,
            lastResponse: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
            surveyTitle: 'Digital Skills Pre-Assessment',
            responseCount: 28,
            lastResponse: new Date(Date.now() - 3 * 60 * 60 * 1000)
        },
        {
            surveyTitle: 'Community Feedback Survey',
            responseCount: 67,
            lastResponse: new Date(Date.now() - 8 * 60 * 60 * 1000)
        },
        {
            surveyTitle: 'Environmental Awareness Quiz',
            responseCount: 34,
            lastResponse: new Date(Date.now() - 20 * 60 * 60 * 1000)
        }
    ];
    
    const surveysContainer = document.getElementById('recentSurveys');
    surveysContainer.innerHTML = mockSurveys.map(survey => `
        <div class="activity-item">
            <h4>${survey.surveyTitle}</h4>
            <div class="activity-meta">
                <span><i class="fas fa-users"></i> ${survey.responseCount} responses</span>
                <span>${getTimeAgo(survey.lastResponse)}</span>
            </div>
        </div>
    `).join('');
}

// MOCK DATA - Module completions
function loadModuleCompletionsMock() {
    const mockCompletions = [
        {
            moduleTitle: 'Introduction to Ocean Conservation',
            completionCount: 89,
            averageScore: 85
        },
        {
            moduleTitle: 'Plastic Waste Reduction Strategies',
            completionCount: 67,
            averageScore: 78
        },
        {
            moduleTitle: 'Basic Computer Skills',
            completionCount: 134,
            averageScore: 92
        },
        {
            moduleTitle: 'Internet Safety Fundamentals',
            completionCount: 98,
            averageScore: 88
        }
    ];
    
    const modulesContainer = document.getElementById('moduleCompletions');
    modulesContainer.innerHTML = mockCompletions.map(completion => `
        <div class="activity-item">
            <h4>${completion.moduleTitle}</h4>
            <div class="activity-meta">
                <span><i class="fas fa-graduation-cap"></i> ${completion.completionCount} completions</span>
                <span><i class="fas fa-percentage"></i> ${completion.averageScore}% avg score</span>
            </div>
        </div>
    `).join('');
}

function viewCampaign(campaignId) {
    localStorage.setItem('currentCampaignId', campaignId);
    window.location.href = 'analytics-dashboard.html';
}

function editCampaign(campaignId) {
    alert('Edit campaign feature coming soon!');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('createCampaignModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}
