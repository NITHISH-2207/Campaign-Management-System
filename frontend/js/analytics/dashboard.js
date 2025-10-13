// frontend/js/analytics/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Check if user has access
    if (!['campaign_manager', 'admin'].includes(user.role)) {
        window.location.href = 'user-dashboard.html';
        return;
    }

    // Display user name
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.textContent = `Hi, ${user.name}`;
    }

    // Initial load
    await loadDashboardData();
    
    // Set up real-time updates
    startRealtimeUpdates();
    
    // Set up date range change listener
    document.getElementById('dateRange').addEventListener('change', loadDashboardData);
    
    // Load campaign-specific data if available
    const campaignId = new URLSearchParams(window.location.search).get('campaign');
    if (campaignId) {
        await loadSurveyImpact(campaignId);
    }
});

async function loadDashboardData() {
    try {
        showLoadingState(true);
        
        const dateRange = document.getElementById('dateRange').value;
        const campaignId = new URLSearchParams(window.location.search).get('campaign');
        
        let url = `http://localhost:3000/api/analytics/dashboard?dateRange=${dateRange}`;
        if (campaignId) {
            url += `&campaignId=${campaignId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load analytics');

        const { data } = await response.json();
        
        // Update metrics with animation
        animateNumber('totalEngagement', data.totals.engagement);
        updateSentimentDisplay(data.sentiment);
        animateNumber('activeUsers', data.totals.uniqueUsers);
        animateNumber('campaignReach', data.totals.views);
        
        // Update charts
        updateCharts(data);
        
        // Update top posts table
        updateTopPostsTable(data.topPosts || []);
        
    } catch (error) {
        console.error('Dashboard error:', error);
        showErrorMessage('Failed to load dashboard data');
    } finally {
        showLoadingState(false);
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const duration = 1000; // 1 second
    const steps = 30;
    const stepValue = (targetValue - startValue) / steps;
    const stepDuration = duration / steps;
    
    let currentValue = startValue;
    let currentStep = 0;
    
    const interval = setInterval(() => {
        currentValue += stepValue;
        currentStep++;
        
        if (currentStep >= steps) {
            element.textContent = formatNumber(targetValue);
            clearInterval(interval);
        } else {
            element.textContent = formatNumber(Math.round(currentValue));
        }
    }, stepDuration);
}

function updateSentimentDisplay(sentiment) {
    const sentimentEl = document.getElementById('avgSentiment');
    const scoreEl = document.querySelector('.sentiment-score');
    
    if (sentimentEl) {
        sentimentEl.textContent = sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1);
        sentimentEl.className = `metric-value sentiment-${sentiment.label}`;
    }
    
    if (scoreEl) {
        scoreEl.textContent = `${sentiment.overall}%`;
    }
}

function startRealtimeUpdates() {
    // Load realtime activity immediately
    loadRealtimeActivity();
    
    // Then refresh every 5 seconds
    setInterval(loadRealtimeActivity, 5000);
    
    // Refresh main dashboard every 30 seconds
    setInterval(loadDashboardData, 30000);
}

async function loadRealtimeActivity() {
    try {
        const response = await fetch('http://localhost:3000/api/analytics/realtime', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) return;

        const { activities } = await response.json();
        const feedContainer = document.getElementById('activityFeed');
        
        if (!feedContainer) return;
        
        feedContainer.innerHTML = activities.length > 0 ? activities.map(activity => `
            <div class="activity-item ${getActivityClass(activity)}">
                <span class="activity-time">${getTimeAgo(activity.time)}</span>
                <span class="activity-text">
                    <strong>${activity.user}</strong> commented on 
                    <em>"${activity.postTitle}"</em>
                </span>
                <span class="activity-sentiment ${activity.sentiment.label}">
                    ${getSentimentEmoji(activity.sentiment.label)} ${activity.sentiment.label}
                </span>
            </div>
        `).join('') : '<div class="no-activity">No recent activity</div>';
        
        // Add fade-in animation for new items
        feedContainer.querySelectorAll('.activity-item').forEach((item, index) => {
            if (index < 3) { // Only animate first 3 items
                item.style.animation = `fadeIn 0.3s ease-in ${index * 0.1}s`;
            }
        });
    } catch (error) {
        console.error('Realtime activity error:', error);
    }
}

let chartsInitialized = false;
let engagementChart, sentimentChart;

function updateCharts(data) {
    if (!chartsInitialized) {
        initializeCharts(data);
        chartsInitialized = true;
    } else {
        updateExistingCharts(data);
    }
}

function initializeCharts(data) {
    // Engagement Over Time Chart
    const engagementCtx = document.getElementById('engagementChart');
    if (engagementCtx) {
        engagementChart = new Chart(engagementCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: data.timeline.map(item => 
                    new Date(item.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    })
                ),
                datasets: [{
                    label: 'Total Engagement',
                    data: data.timeline.map(item => item.engagement),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Sentiment Analysis Chart
    const sentimentCtx = document.getElementById('sentimentChart');
    if (sentimentCtx) {
        sentimentChart = new Chart(sentimentCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [
                        data.sentiment.positive,
                        data.sentiment.neutral,
                        data.sentiment.negative
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? 
                                    Math.round((context.parsed / total) * 100) : 0;
                                return context.label + ': ' + percentage + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateExistingCharts(data) {
    // Update engagement chart
    if (engagementChart) {
        engagementChart.data.labels = data.timeline.map(item => 
            new Date(item.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            })
        );
        engagementChart.data.datasets[0].data = data.timeline.map(item => item.engagement);
        engagementChart.update('active');
    }

    // Update sentiment chart
    if (sentimentChart) {
        sentimentChart.data.datasets[0].data = [
            data.sentiment.positive,
            data.sentiment.neutral,
            data.sentiment.negative
        ];
        sentimentChart.update('active');
    }
}

function updateTopPostsTable(posts) {
    const tableBody = document.getElementById('topPostsTable');
    if (!tableBody || posts.length === 0) return;

    tableBody.innerHTML = posts.map(post => `
        <tr>
            <td>${escapeHtml(post.title)}</td>
            <td class="text-center">${formatNumber(post.engagement)}</td>
            <td class="text-center ${getSentimentClass(post.sentimentScore)}">
                ${Math.round(post.sentimentScore * 100)}% ${getSentimentEmoji(post.sentiment)}
            </td>
            <td class="text-center">${formatNumber(post.shares)}</td>
        </tr>
    `).join('');
}

async function loadSurveyImpact(campaignId) {
    try {
        const response = await fetch(`http://localhost:3000/api/analytics/survey-impact/${campaignId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) return;

        const impactData = await response.json();
        displayImpactMetrics(impactData);
        createImpactCharts(impactData);
    } catch (error) {
        console.error('Error loading survey impact:', error);
    }
}

// Helper functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}
async function loadSurveyImpact(campaignId) {
    try {
        const response = await fetch(`http://localhost:3000/api/analytics/survey-impact/${campaignId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) return;

        const impactData = await response.json();
        
        // Use the chart functions
        window.chartFunctions.displayImpactMetrics(impactData);
        window.chartFunctions.createImpactCharts(impactData);
    } catch (error) {
        console.error('Error loading survey impact:', error);
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
        if (count > 0) {
            return count === 1 ? 
                `${count} ${interval.label} ago` : 
                `${count} ${interval.label}s ago`;
        }
    }
    
    return 'Just now';
}

function getSentimentEmoji(sentiment) {
    const emojis = {
        'positive': '😊',
        'negative': '😞',
        'neutral': '😐',
        'mixed': '🤔'
    };
    return emojis[sentiment] || '😐';
}

function getSentimentClass(score) {
    if (score > 0.7) return 'positive';
    if (score < 0.3) return 'negative';
    return '';
}

function getActivityClass(activity) {
    return `activity-${activity.sentiment.label}`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showLoadingState(isLoading) {
    const elements = document.querySelectorAll('.metric-value');
    elements.forEach(el => {
        if (isLoading) {
            el.classList.add('loading');
            el.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        } else {
            el.classList.remove('loading');
        }
    });
}

function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Export functions for use in other modules if needed
window.dashboardFunctions = {
    loadSurveyImpact,
    loadDashboardData,
    showErrorMessage
};
