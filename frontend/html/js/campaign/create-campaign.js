// frontend/js/campaign/create-campaign.js
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = window.API_BASE_URL || (isLocal ? 'http://localhost:3000' : 'https://campaign-management-system-zquy.onrender.com');

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        if (window.showFormNotification) {
            window.showFormNotification(document.getElementById('campaignForm') || document.body, 'Please log in to create a campaign', 'error');
        }
        window.location.href = 'login.html';
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

function saveDraft() {
    const formData = new FormData(document.getElementById('campaignForm'));
    const draftData = {};

    // Convert FormData to object (excluding file)
    for (let [key, value] of formData.entries()) {
        if (key !== 'campaignImage') {
            draftData[key] = value;
        }
    }

    localStorage.setItem('campaignDraft', JSON.stringify(draftData));
    if (window.showFormNotification) {
        window.showFormNotification(document.getElementById('campaignForm'), 'Draft saved successfully!', 'success');
    }
}

function loadDraft() {
    const draft = localStorage.getItem('campaignDraft');
    if (draft) {
        const draftData = JSON.parse(draft);

        // Fill form fields
        Object.keys(draftData).forEach(key => {
            const field = document.getElementById(key);
            if (field) {
                field.value = draftData[key];

                // Trigger input event for character counters
                if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                    field.dispatchEvent(new Event('input'));
                }
            }
        });

        console.log('Draft loaded');
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    const formEl = document.getElementById('campaignForm') || event.target;

    // Validate dates
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);

    if (endDate <= startDate) {
        if (window.showFormNotification) {
            window.showFormNotification(formEl, 'End date must be after start date', 'error');
        }
        return;
    }

    // Validate checkbox
    if (!document.getElementById('agreeTerms').checked) {
        if (window.showFormNotification) {
            window.showFormNotification(formEl, 'Please agree to the terms and verify your information', 'error');
        }
        return;
    }

    // Prepare form data
    const formData = new FormData(event.target);

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '📤 Submitting...';
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

        // In the handleSubmit function, update the success case:
        if (response.ok && data.success) {
            // Clear draft
            localStorage.removeItem('campaignDraft');

            // Updated success message
            if (window.showFormNotification) {
                window.showFormNotification(formEl, 'Campaign created successfully! Your campaign is now live and active.', 'success');
            }

            // Redirect to campaigns list
            setTimeout(() => {
                window.location.href = 'campaigns-list.html';
            }, 1500);
        } else {
            if (window.showFormNotification) {
                window.showFormNotification(formEl, `Error: ${data.message || 'Failed to create campaign'}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error submitting campaign:', error);
        if (window.showFormNotification) {
            window.showFormNotification(formEl, 'Failed to submit campaign. Please try again.', 'error');
        }
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Temporary function to auto-approve campaigns for testing
async function autoApproveCampaign(campaignId) {
    console.log('Auto-approving campaign for testing...');
}
