// frontend/js/campaign/campaigns-list.js
const API_BASE_URL = 'https://campaign-management-system-zquy.onrender.com';
let currentPage = 1;
let isLoading = false;
let filters = {
    category: '',
    type: '',
    sort: 'recent'
};
let joinedCampaigns = new Set();

// Hide modal on page load
document.addEventListener('DOMContentLoaded', async () => {
    // CRITICAL: Hide modal immediately
    const modal = document.getElementById('campaignModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    // Check authentication
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize
    await loadJoinedCampaigns();
    await loadCampaigns();
    updateStats();
});

// Load user's joined campaigns
async function loadJoinedCampaigns() {
    try {
        const response = await apiRequest('/campaigns/my-joined', {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.campaigns) {
                joinedCampaigns = new Set(data.campaigns.map(c => c._id));
            }
        }
    } catch (error) {
        console.log('No joined campaigns yet');
        joinedCampaigns = new Set();
    }
}

// Load campaigns
async function loadCampaigns(append = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 9,
            ...filters
        });

        const response = await fetch(`${API_BASE_URL}/api/campaigns/active?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load campaigns');

        const data = await response.json();
        displayCampaigns(data.campaigns || [], append);

        // Show/hide load more button
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (!data.campaigns || data.campaigns.length < 9 || currentPage >= data.totalPages) {
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading campaigns:', error);
        displayError();
    } finally {
        isLoading = false;
    }
}

// Display campaigns
function displayCampaigns(campaigns, append = false) {
    const grid = document.getElementById('campaignsGrid');

    if (!append) {
        grid.innerHTML = '';
    }

    if (campaigns.length === 0 && !append) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-flag"></i>
                <h3>No campaigns found</h3>
                <p>Try adjusting your filters or check back later</p>
            </div>
        `;
        return;
    }

    campaigns.forEach(campaign => {
        const card = createCampaignCard(campaign);
        grid.appendChild(card);
    });
}

// Check if user can join campaigns
function canUserJoinCampaigns() {
    const user = getCurrentUser();
    return user && user.role !== 'campaign_manager' && user.role !== 'admin';
}

// Create campaign card
// Create campaign card
function createCampaignCard(campaign) {
    const user = getCurrentUser();
    const isJoined = joinedCampaigns.has(campaign._id);
    const daysLeft = getDaysLeft(campaign.endDate);
    const participantCount = campaign.metrics?.totalParticipants || 0;
    const canJoin = canUserJoinCampaigns();
    const isOwnCampaign = user && campaign.managerId && (campaign.managerId._id === user.id || campaign.managerId === user.id);

    const campaignType = campaign.type || 'Online';
    const campaignTypeLower = campaignType.toLowerCase();

    const card = document.createElement('div');
    card.className = `campaign-card ${isJoined ? 'joined' : ''}`;

    // Store campaign data on the card element
    card.dataset.campaignId = campaign._id;

    card.innerHTML = `
        ${campaign.media?.imageUrl ?
            `<img src="${API_BASE_URL}${campaign.media.imageUrl}" alt="${campaign.title}" class="campaign-image" onerror="this.src='https://via.placeholder.com/350x200?text=Campaign'">` :
            `<div class="campaign-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`
        }
        
        <span class="campaign-badge badge-${campaignTypeLower}">
            ${campaignType} Campaign
        </span>
        
        <div class="campaign-content">
            <span class="campaign-category">${campaign.category}</span>
            <h3 class="campaign-title">${escapeHtml(campaign.title)}</h3>
            <p class="campaign-description">${escapeHtml(campaign.description)}</p>
            
            <div class="campaign-meta">
                <span><i class="fas fa-calendar"></i> ${daysLeft} days left</span>
                <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(campaign.location)}</span>
            </div>
            
            <div class="campaign-progress">
                <div class="progress-header">
                    <span>${participantCount} participants</span>
                    <span>${campaign.targetAudience}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(participantCount / 100 * 100, 100)}%"></div>
                </div>
            </div>
            
            <div class="campaign-actions">
                ${canJoin && !isOwnCampaign ? `
                    <button class="btn-join ${isJoined ? 'joined' : ''}" 
                            onclick="event.stopPropagation(); toggleJoinCampaign('${campaign._id}', this)">
                        ${isJoined ? '✓ Joined' : 'Join Campaign'}
                    </button>
                ` : ''}
                ${isOwnCampaign ? `
                    <span class="own-campaign-badge">Your Campaign</span>
                ` : ''}
                ${!canJoin && !isOwnCampaign ? `
                    <span class="role-restriction-badge">Campaign managers cannot join</span>
                ` : ''}
                <button class="btn-details" data-campaign-id="${campaign._id}">
                    View Details
                </button>
            </div>
        </div>
    `;

    // Add event listeners after creating the card
    const detailsBtn = card.querySelector('.btn-details');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showCampaignDetails(campaign);
        });
    }

    // Add click handler to the card itself
    card.addEventListener('click', () => {
        showCampaignDetails(campaign);
    });

    return card;
}

// Toggle join/leave campaign
async function toggleJoinCampaign(campaignId, button) {
    const isJoined = joinedCampaigns.has(campaignId);

    try {
        const endpoint = isJoined ? `/campaigns/${campaignId}/leave` : `/campaigns/${campaignId}/join`;
        const response = await apiRequest(endpoint, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            if (isJoined) {
                joinedCampaigns.delete(campaignId);
                button.classList.remove('joined');
                button.textContent = 'Join Campaign';
                showNotification('You have left the campaign', 'info');
            } else {
                joinedCampaigns.add(campaignId);
                button.classList.add('joined');
                button.textContent = '✓ Joined';
                showNotification('Successfully joined the campaign!', 'success');
            }

            // Update the card styling
            const card = button.closest('.campaign-card');
            if (card) {
                card.classList.toggle('joined');
            }

            // Update stats
            updateStats();
        } else {
            showNotification(data.message || 'Failed to update campaign status', 'error');
        }
    } catch (error) {
        console.error('Error toggling campaign:', error);
        showNotification('Failed to update campaign status', 'error');
    }
}

// Show campaign details modal
// Show campaign details modal
function showCampaignDetails(campaign) {
    const modal = document.getElementById('campaignModal');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) {
        console.error('Modal elements not found');
        return;
    }

    const user = getCurrentUser();
    const isJoined = joinedCampaigns.has(campaign._id);
    const canJoin = canUserJoinCampaigns();
    const isOwnCampaign = user && campaign.managerId && (campaign.managerId._id === user.id || campaign.managerId === user.id);

    modalContent.innerHTML = `
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px;">
            <h2>${escapeHtml(campaign.title)}</h2>
            <p style="opacity: 0.9;">${campaign.category} | ${campaign.type} Campaign</p>
            ${isOwnCampaign ? '<span class="badge" style="background: white; color: #667eea; padding: 5px 15px; border-radius: 20px; font-size: 14px;">Your Campaign</span>' : ''}
        </div>
        
        <div class="modal-body" style="padding: 30px;">
            ${campaign.media?.imageUrl ?
            `<img src="${API_BASE_URL}${campaign.media.imageUrl}" alt="${campaign.title}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;">` :
            ''
        }
            
            <div class="campaign-detail-section">
                <h3><i class="fas fa-info-circle"></i> About This Campaign</h3>
                <p>${escapeHtml(campaign.description)}</p>
            </div>
            
            <div class="campaign-detail-section">
                <h3><i class="fas fa-bullseye"></i> Campaign Goals</h3>
                <p>${escapeHtml(campaign.goals || 'No specific goals listed')}</p>
            </div>
            
            <div class="campaign-detail-section">
                <h3><i class="fas fa-tasks"></i> Action Plan</h3>
                <p>${escapeHtml(campaign.actionPlan || 'No action plan available')}</p>
            </div>
            
            <div class="campaign-detail-section">
                <h3><i class="fas fa-chart-line"></i> Expected Impact</h3>
                <p>${escapeHtml(campaign.expectedImpact || 'Impact to be determined')}</p>
            </div>
            
            <div class="campaign-info-grid">
                <div class="info-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <strong>Duration</strong>
                        <p>${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}</p>
                    </div>
                </div>
                
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>Location</strong>
                        <p>${escapeHtml(campaign.location)}</p>
                    </div>
                </div>
                
                <div class="info-item">
                    <i class="fas fa-users"></i>
                    <div>
                        <strong>Target Audience</strong>
                        <p>${campaign.targetAudience}</p>
                    </div>
                </div>
                
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>Organized by</strong>
                        <p>${campaign.managerId?.name || 'Campaign Manager'}</p>
                    </div>
                </div>
            </div>
            
            ${campaign.hashtags && campaign.hashtags.length > 0 ? `
                <div class="campaign-hashtags">
                    ${campaign.hashtags.map(tag => `<span class="hashtag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="modal-actions">
                ${canJoin && !isOwnCampaign ? `
                    <button class="btn-join-modal ${isJoined ? 'joined' : ''}" 
                            onclick="toggleJoinCampaign('${campaign._id}', this); closeCampaignModal();">
                        ${isJoined ? '✓ Already Joined' : 'Join This Campaign'}
                    </button>
                ` : ''}
                ${isOwnCampaign ? `
                    <div class="alert alert-info" style="background: #e3f2fd; color: #1976d2; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <i class="fas fa-info-circle"></i> This is your campaign. You cannot join your own campaign.
                    </div>
                ` : ''}
                ${!canJoin && !isOwnCampaign ? `
                    <div class="alert alert-warning" style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i> Campaign managers cannot join campaigns. Please use a participant account to join campaigns.
                    </div>
                ` : ''}
                
                ${campaign.contactInfo ? `
                    <div class="contact-info">
                        <h4>Contact Information</h4>
                        <p><i class="fas fa-envelope"></i> ${campaign.contactInfo.email || 'Not provided'}</p>
                        ${campaign.contactInfo.phone ? `<p><i class="fas fa-phone"></i> ${campaign.contactInfo.phone}</p>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Remove the CSS classes that hide the modal
    modal.style.display = 'block';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';
    modal.classList.add('active');
}

// Close modal
// Close modal
function closeCampaignModal() {
    const modal = document.getElementById('campaignModal');
    if (modal) {
        // Remove all display properties and classes
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        modal.classList.remove('active');

        // Clear the content
        const modalContent = document.getElementById('modalContent');
        if (modalContent) {
            modalContent.innerHTML = '';
        }
    }
}


// Apply filters
function applyFilters() {
    filters.category = document.getElementById('categoryFilter').value;
    filters.type = document.getElementById('typeFilter').value;
    filters.sort = document.getElementById('sortFilter').value;

    currentPage = 1;
    loadCampaigns();
}

// Load more campaigns
function loadMoreCampaigns() {
    currentPage++;
    loadCampaigns(true);
}

// Update statistics
async function updateStats() {
    try {
        const response = await apiRequest('/campaigns/stats', {
            method: 'GET'
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalCampaigns').textContent = stats.totalActive || 0;
            document.getElementById('totalParticipants').textContent = stats.totalParticipants || 0;
            document.getElementById('totalImpact').textContent = formatNumber(stats.totalImpact || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Utility functions
function getDaysLeft(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Invalid user data:', error);
        return null;
    }
}

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error('No authentication token');
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        ...options,
        ...defaultOptions
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Authentication failed');
    }

    return response;
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
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function displayError() {
    const grid = document.getElementById('campaignsGrid');
    grid.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 60px; grid-column: 1/-1;">
            <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: #f44336; margin-bottom: 20px;"></i>
            <h3 style="color: #666; margin-bottom: 10px;">Failed to load campaigns</h3>
            <p style="color: #999;">Please check your connection and try again</p>
            <button class="btn-search" onclick="loadCampaigns()" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('campaignModal');
    if (event.target === modal) {
        closeCampaignModal();
    }
}
