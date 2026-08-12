// frontend/js/campaign/create-campaign.js
var API_BASE_URL = window.API_BASE_URL || 'https://campaign-management-system-zquy.onrender.com';

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to create a campaign', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    initializeForm();
    loadDraft();
});

function initializeForm() {
    // Set minimum dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').min = today;
    document.getElementById('endDate').min = today;

    // Update end date minimum when start date changes
    document.getElementById('startDate').addEventListener('change', function () {
        document.getElementById('endDate').min = this.value;
    });

    // Character counters
    setupCharCounter('title', 'titleCount', 100);
    setupCharCounter('description', 'descCount', 2000);
    setupCharCounter('goals', 'goalsCount', 500);
    setupCharCounter('actionPlan', 'actionCount', 1000);
    setupCharCounter('expectedImpact', 'impactCount', 500);

    // Image preview
    document.getElementById('campaignImage').addEventListener('change', previewImage);

    // Form submission
    document.getElementById('campaignForm').addEventListener('submit', handleSubmit);

    // Pre-fill contact email
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
        document.getElementById('contactEmail').value = user.email;
    }
}

function setupCharCounter(inputId, counterId, maxLength) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);

    input.addEventListener('input', function () {
        counter.textContent = this.value.length;
        if (this.value.length > maxLength * 0.9) {
            counter.style.color = '#ff6b6b';
        } else {
            counter.style.color = '#666';
        }
    });
}

function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

async function saveDraft() {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to save a draft', 'error');
        return;
    }

    const form = document.getElementById('campaignForm');
    const formData = new FormData(form);

    try {
        const response = await fetch(`${API_BASE_URL}/api/campaigns/draft`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const savedId = data.campaignId || data.campaign?._id;
            if (savedId) {
                document.getElementById('campaignId').value = savedId;
                const newUrl = `${window.location.pathname}?id=${savedId}`;
                window.history.replaceState(null, '', newUrl);
            }

            showNotification('Campaign saved as draft.', 'info');
        } else {
            showNotification(data.message || 'Failed to save draft', 'error');
        }
    } catch (error) {
        console.error('Error saving campaign draft:', error);
        showNotification('Failed to save draft. Please try again.', 'error');
    }
}

async function loadDraft() {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('id');
    const token = localStorage.getItem('token');

    if (campaignId && token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.campaign) {
                    populateFormWithCampaign(data.campaign);
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading draft from backend:', error);
        }
    }

    // Fallback to local storage draft if available
    const draft = localStorage.getItem('campaignDraft');
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            Object.keys(draftData).forEach(key => {
                const field = document.getElementById(key);
                if (field) {
                    field.value = draftData[key];
                    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                        field.dispatchEvent(new Event('input'));
                    }
                }
            });
        } catch (e) {}
    }
}

function populateFormWithCampaign(campaign) {
    const formatDateForInput = (dateVal) => {
        if (!dateVal) return '';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    document.getElementById('campaignId').value = campaign._id || '';
    if (campaign.title) document.getElementById('title').value = campaign.title;
    if (campaign.category) document.getElementById('category').value = campaign.category;
    if (campaign.type) document.getElementById('type').value = campaign.type;
    if (campaign.description) document.getElementById('description').value = campaign.description;
    if (campaign.startDate) document.getElementById('startDate').value = formatDateForInput(campaign.startDate);
    if (campaign.endDate) document.getElementById('endDate').value = formatDateForInput(campaign.endDate);
    if (campaign.location) document.getElementById('location').value = campaign.location;
    if (campaign.targetAudience) document.getElementById('targetAudience').value = campaign.targetAudience;
    if (campaign.goals) document.getElementById('goals').value = campaign.goals;
    if (campaign.actionPlan) document.getElementById('actionPlan').value = campaign.actionPlan;
    if (campaign.expectedImpact) document.getElementById('expectedImpact').value = campaign.expectedImpact;

    const contactInfo = campaign.contactInfo || {};
    if (contactInfo.email) document.getElementById('contactEmail').value = contactInfo.email;
    if (contactInfo.phone) document.getElementById('contactPhone').value = contactInfo.phone;

    const media = campaign.media || {};
    if (media.videoUrl) document.getElementById('videoUrl').value = media.videoUrl;

    if (campaign.hashtags) {
        document.getElementById('hashtags').value = Array.isArray(campaign.hashtags)
            ? campaign.hashtags.join(' ')
            : campaign.hashtags;
    }

    if (media.imageUrl) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `<img src="${API_BASE_URL}${media.imageUrl}" alt="Campaign preview">`;
            preview.style.display = 'block';
        }
    }

    ['title', 'description', 'goals', 'actionPlan', 'expectedImpact'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.dispatchEvent(new Event('input'));
    });
}

async function handleSubmit(event) {
    event.preventDefault();

    // Validate dates
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);

    if (endDate <= startDate) {
        showNotification('End date must be after start date', 'error');
        return;
    }

    // Validate checkbox
    if (!document.getElementById('agreeTerms').checked) {
        showNotification('Please agree to the terms and verify your information', 'error');
        return;
    }

    // Prepare form data
    const formData = new FormData(event.target);

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/campaigns/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Clear draft
            localStorage.removeItem('campaignDraft');

            // Custom notification matching website theme
            showNotification('Your campaign has been submitted for admin review.', 'success');

            // Redirect to Manager Dashboard after notification display
            setTimeout(() => {
                window.location.href = 'campaign-manager-dashboard.html';
            }, 2500);
        } else {
            showNotification(data.message || 'Failed to create campaign', 'error');
        }
    } catch (error) {
        console.error('Error submitting campaign:', error);
        showNotification('Failed to submit campaign. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.custom-toast-notification');
    existing.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `custom-toast-notification toast-${type}`;

    const iconClass = type === 'success'
        ? 'fa-check-circle'
        : type === 'error'
            ? 'fa-exclamation-circle'
            : 'fa-info-circle';

    notification.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 25px;
        padding: 16px 24px;
        border-radius: 14px;
        color: #ffffff;
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 15px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        background: ${type === 'success' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : type === 'error' ? 'linear-gradient(135deg, #eb3b5a 0%, #fa8231 100%)' : 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'};
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });
    });

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 3000);
}

// Temporary function to auto-approve campaigns for testing
async function autoApproveCampaign(campaignId) {
    console.log('Auto-approving campaign for testing...');
}
