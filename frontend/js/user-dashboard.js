// frontend/js/user-dashboard.js
const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token || !user.id) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update user info in navbar
    updateUserInfo(user);
    
    // Load dashboard data
    await loadDashboardData();
    
    // Load available surveys
    await loadAvailableSurveys();
    
    // Add fade-in animations
    const elements = document.querySelectorAll('.fade-in-up');
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
        }, index * 100);
    });
});

function updateUserInfo(user) {
    const userName = user.name || 'Change Maker';
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${userName}!`;
    document.getElementById('userName').textContent = userName;
    document.getElementById('userInitial').textContent = userName.charAt(0).toUpperCase();
}

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/dashboard`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        
        const data = await response.json();
        
        if (data.success) {
            // Update stats with animation
            animateCounter('myPostsCount', data.stats.postsCount);
            animateCounter('myImpactCount', data.stats.totalImpact);
            animateCounter('campaignsJoined', data.stats.campaignsJoined);
            animateCounter('learningProgress', data.stats.learningProgress, '%');
            
            // Update level progress
            updateLevelProgress(data.stats.level, data.stats.points);
            
            // Load campaigns
            displayActiveCampaigns(data.activeCampaigns);
            
            // Load recent activity
            displayRecentActivity(data.recentActivity);
            
            // Load badges
            displayRecentBadges(data.badges);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Show default values if error
        displayErrorState();
    }
}

function animateCounter(id, finalValue, suffix = '') {
    const element = document.getElementById(id);
    if (!element) return;
    
    const duration = 1500;
    const steps = 60;
    const stepValue = finalValue / steps;
    let currentValue = 0;
    const stepDuration = duration / steps;

    const counter = setInterval(() => {
        currentValue += stepValue;
        if (currentValue >= finalValue) {
            element.textContent = finalValue + suffix;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(currentValue) + suffix;
        }
    }, stepDuration);
}

function updateLevelProgress(level, points) {
    const progressInLevel = points % 100;
    const pointsToNext = 100 - progressInLevel;
    
    document.getElementById('userLevel').textContent = level;
    document.getElementById('pointsToNext').textContent = pointsToNext;
    
    setTimeout(() => {
        document.getElementById('levelProgress').style.width = progressInLevel + '%';
    }, 500);
}

function displayActiveCampaigns(campaigns) {
    const container = document.getElementById('activeCampaigns');
    
    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-flag fa-3x mb-3" style="opacity: 0.5"></i>
                <p>You haven't joined any campaigns yet.</p>
                <a href="campaigns-list.html" class="btn btn-primary btn-sm">Browse Campaigns</a>
            </div>
        `;
        return;
    }
    
    const campaignsHTML = campaigns.map(campaign => {
        const daysLeft = Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysLeft <= 7 ? 'text-warning' : 'text-success';
        const iconMap = {
            'Environment': 'fa-leaf',
            'Education': 'fa-graduation-cap',
            'Health': 'fa-heartbeat',
            'Community': 'fa-users',
            'Technology': 'fa-laptop-code',
            'default': 'fa-flag'
        };
        const icon = iconMap[campaign.category] || iconMap.default;
        
        return `
            <div class="campaign-item d-flex align-items-center">
                <div class="me-3">
                    <i class="fas ${icon} fa-2x text-primary"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${campaign.title}</h6>
                    <small class="text-muted">${campaign.category} • ${campaign.location}</small><br>
                    <small class="${urgencyClass}">
                        <i class="fas fa-clock"></i> ${daysLeft} days left
                    </small>
                </div>
                <div class="text-end">
                    <a href="campaign-details.html?id=${campaign._id}" class="btn btn-outline-primary btn-sm">View</a>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = campaignsHTML;
}

function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-history fa-3x mb-3" style="opacity: 0.5"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    const activitiesHTML = activities.map(activity => {
        const timeAgo = getTimeAgo(new Date(activity.date));
        const colorMap = {
            'post': 'text-info',
            'campaign': 'text-success',
            'survey': 'text-primary',
            'badge': 'text-warning'
        };
        
        return `
            <div class="activity-item d-flex align-items-center">
                <div class="me-3">
                    <i class="${activity.icon} fa-2x ${colorMap[activity.type] || 'text-secondary'}"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${activity.title}</div>
                    <small class="text-muted">${timeAgo}</small>
                </div>
                <div class="text-success fw-bold">
                    +${activity.points} pts
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = activitiesHTML;
}

function displayRecentBadges(badges) {
    const container = document.getElementById('recentBadges');
    
    if (!badges || badges.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-medal fa-3x mb-3" style="opacity: 0.5"></i>
                <p class="small">Start participating to earn badges!</p>
            </div>
        `;
        return;
    }
    
    const badgesHTML = badges.map(badge => `
        <div class="d-flex align-items-center justify-content-center mb-3">
            <div class="badge-icon text-${badge.color} me-3">
                <i class="${badge.icon} fa-3x"></i>
            </div>
            <div>
                <h6 class="mb-0">${badge.name}</h6>
                <small class="text-muted">Recently earned</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = badgesHTML;
}

async function loadAvailableSurveys() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/surveys/user/available`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                displayNoSurveysMessage('Session expired. Please login again.');
                return;
            }
            throw new Error('Failed to fetch surveys');
        }

        const data = await response.json();
        const surveys = data.surveys || data;
        displayAvailableSurveys(surveys);
    } catch (error) {
        console.error('Error loading surveys:', error);
        displayNoSurveysMessage('Unable to load surveys at this time.');
    }
}

function displayAvailableSurveys(surveys) {
    const container = document.getElementById('available-surveys');
    
    if (!surveys || surveys.length === 0) {
        displayNoSurveysMessage('No surveys available at the moment.');
        return;
    }

    const surveysHTML = surveys.map(survey => `
        <div class="survey-card ${survey.completed ? 'completed' : ''}">
            <h4>${survey.title}</h4>
            <p>${survey.description || 'Help us measure the impact of this campaign'}</p>
            <div class="survey-meta">
                <span class="survey-type ${survey.type}">${survey.type === 'before' ? 'Pre' : 'Post'}-Campaign Survey</span>
                <span class="questions-count">${survey.questions ? survey.questions.length : 0} questions</span>
            </div>
            ${survey.completed ? 
                '<button class="completed-btn" disabled><i class="fas fa-check"></i> Completed</button>' :
                `<button onclick="takeSurvey('${survey._id}')" class="take-survey-btn">Take Survey</button>`
            }
        </div>
    `).join('');

    container.innerHTML = surveysHTML;
}

function displayNoSurveysMessage(message) {
    const container = document.getElementById('available-surveys');
    container.innerHTML = `
        <div class="no-surveys-message">
            <i class="fas fa-clipboard-list"></i>
            <p>${message}</p>
        </div>
    `;
}

function displayErrorState() {
    // Set default values when API fails
    document.getElementById('myPostsCount').textContent = '0';
    document.getElementById('myImpactCount').textContent = '0';
    document.getElementById('campaignsJoined').textContent = '0';
    document.getElementById('learningProgress').textContent = '0%';
    
    document.getElementById('activeCampaigns').innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-exclamation-circle fa-3x mb-3" style="opacity: 0.5"></i>
            <p>Unable to load campaigns</p>
            <button onclick="location.reload()" class="btn btn-sm btn-outline-primary">Retry</button>
        </div>
    `;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
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

function takeSurvey(surveyId) {
    window.location.href = `take-survey.html?id=${surveyId}`;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}
    