// frontend/js/campaign/manager-dashboard.js

var API_BASE_URL = window.API_BASE_URL || ((window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? 'http://localhost:3000/api'
    : 'https://campaign-management-system-zquy.onrender.com/api');

let currentManagerCampaigns = [];

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

    setupEditFormListener();

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
    currentManagerCampaigns = campaigns || [];
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
                <button class="btn-edit" data-id="${campaign._id}" onclick="editCampaign('${campaign._id}')">Edit</button>
            </div>
        </div>
    `).join('');

    if (!container.dataset.listenerAdded) {
        container.dataset.listenerAdded = 'true';
        container.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit');
            if (btnEdit) {
                const id = btnEdit.getAttribute('data-id');
                if (id) {
                    editCampaign(id);
                }
            }
        });
    }
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

// Open edit campaign modal and pre-fill data
async function editCampaign(campaignId) {
    const token = localStorage.getItem('token');
    const modal = document.getElementById('editCampaignModal');
    const errorBanner = document.getElementById('editFormError');
    if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
    }

    let campaign = currentManagerCampaigns.find(c => c._id === campaignId);

    // If not found in loaded memory, fetch from API
    if (!campaign) {
        try {
            const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) campaign = data.campaign;
            }
        } catch (e) {
            console.error('Error fetching campaign details for edit:', e);
        }
    }

    if (!campaign) {
        showNotification('Unable to load campaign details.', 'error');
        return;
    }

    // Pre-fill form fields
    document.getElementById('editCampaignId').value = campaign._id || '';
    document.getElementById('editTitle').value = campaign.title || '';
    document.getElementById('editCategory').value = campaign.category || '';
    document.getElementById('editType').value = campaign.type || '';
    document.getElementById('editDescription').value = campaign.description || '';

    // Format dates as YYYY-MM-DD for date inputs
    document.getElementById('editStartDate').value = campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '';
    document.getElementById('editEndDate').value = campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '';

    document.getElementById('editLocation').value = campaign.location || '';
    document.getElementById('editTargetAudience').value = campaign.targetAudience || '';
    document.getElementById('editGoals').value = campaign.goals || '';
    document.getElementById('editActionPlan').value = campaign.actionPlan || '';
    document.getElementById('editExpectedImpact').value = campaign.expectedImpact || '';

    document.getElementById('editContactEmail').value = campaign.contactInfo?.email || '';
    document.getElementById('editContactPhone').value = campaign.contactInfo?.phone || '';
    document.getElementById('editVideoUrl').value = campaign.media?.videoUrl || '';
    document.getElementById('editHashtags').value = (campaign.hashtags || []).join(' ');

    const imageInput = document.getElementById('editCampaignImage');
    if (imageInput) imageInput.value = '';

    // Open modal
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeEditModal() {
    const modal = document.getElementById('editCampaignModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const errorBanner = document.getElementById('editFormError');
    if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
    }
}

function setupEditFormListener() {
    const editForm = document.getElementById('editCampaignForm');
    if (!editForm) return;

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const campaignId = document.getElementById('editCampaignId').value;
        const token = localStorage.getItem('token');
        const errorBanner = document.getElementById('editFormError');

        if (!campaignId) {
            if (errorBanner) {
                errorBanner.textContent = 'Invalid campaign ID';
                errorBanner.style.display = 'block';
            }
            return;
        }

        const formData = new FormData(editForm);

        try {
            const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                closeEditModal();
                showNotification(data.message || 'Campaign updated successfully!', 'success');
                await loadManagerDashboardData(token);
            } else {
                if (errorBanner) {
                    errorBanner.textContent = data.message || data.error || 'Failed to update campaign';
                    errorBanner.style.display = 'block';
                } else {
                    showNotification(data.message || 'Failed to update campaign', 'error');
                }
            }
        } catch (error) {
            console.error('Error updating campaign:', error);
            if (errorBanner) {
                errorBanner.textContent = 'Network or server error. Please try again.';
                errorBanner.style.display = 'block';
            } else {
                showNotification('Network error while updating campaign', 'error');
            }
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 3000;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
        background: ${type === 'success' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : type === 'error' ? 'linear-gradient(135deg, #eb3b5a 0%, #fa8231 100%)' : '#2196F3'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3500);
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
    const createModal = document.getElementById('createCampaignModal');
    if (event.target === createModal) {
        createModal.style.display = 'none';
    }
    const editModal = document.getElementById('editCampaignModal');
    if (event.target === editModal) {
        closeEditModal();
    }
};

// Explicit global window bindings
window.editCampaign = editCampaign;
window.closeEditModal = closeEditModal;
window.viewCampaign = viewCampaign;
