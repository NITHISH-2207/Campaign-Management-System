// frontend/js/posts/create-post.js
const API_BASE_URL = 'http://localhost:3000';

class PostCreator {
    constructor() {
        this.form = document.getElementById('create-post-form');
        this.imageFile = null;
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.init();
    }

    init() {
        this.setupPostTypeSelector();
        this.loadCampaigns();
        this.setupEventListeners();
        this.setupCharCounters();
    }

   // In the setupPostTypeSelector method
setupPostTypeSelector() {
    const campaignSelect = document.getElementById('campaign-select');
    
    // Clear any existing options
    campaignSelect.innerHTML = '';
    
    // Add personal post option for all users
    const personalOption = document.createElement('option');
    personalOption.value = 'personal';
    personalOption.textContent = '📝 Personal Experience';
    personalOption.selected = true; // Select by default
    campaignSelect.appendChild(personalOption);
}


   async loadCampaigns() {
    try {
        // Only load campaigns for campaign managers and admins
        if (!['campaign_manager', 'admin'].includes(this.user.role)) {
            return;
        }
            
            const response = await fetch(`${API_BASE_URL}/api/campaigns/my-campaigns`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const campaigns = await response.json();
                const select = document.getElementById('campaign-select');
                
                campaigns.forEach(campaign => {
                    const option = document.createElement('option');
                    option.value = campaign._id;
                    option.textContent = `📢 ${campaign.title}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        const imageInput = document.getElementById('post-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        // Update form based on post type selection
        document.getElementById('campaign-select').addEventListener('change', (e) => {
            const isPersonal = e.target.value === 'personal';
            document.getElementById('post-type-info').style.display = isPersonal ? 'block' : 'none';
        });
    }

    setupCharCounters() {
        const setupCounter = (inputId, maxLength) => {
            const input = document.getElementById(inputId);
            if (input) {
                const counter = input.nextElementSibling;
                input.addEventListener('input', () => {
                    if (counter) {
                        counter.textContent = `${input.value.length}/${maxLength}`;
                    }
                });
            }
        };

        setupCounter('post-title', 100);
        setupCounter('post-content', 1000);
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                event.target.value = '';
                return;
            }
            
            this.imageFile = file;
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const preview = document.getElementById('image-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 300px;">`;
                }
            };
            
            reader.readAsDataURL(file);
        }
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in first');
            window.location.href = 'login.html';
            return;
        }
        
        const campaignValue = document.getElementById('campaign-select').value;
        const formData = new FormData();
        
        if (campaignValue === 'personal') {
            formData.append('postType', 'personal');
        } else {
            formData.append('campaignId', campaignValue);
            formData.append('postType', 'campaign');
        }
        
        formData.append('title', document.getElementById('post-title').value);
        formData.append('content', document.getElementById('post-content').value);
        formData.append('tags', document.getElementById('post-tags').value || '');
        formData.append('enableComments', document.getElementById('enable-comments').checked.toString());
        
        if (this.imageFile) {
            formData.append('image', this.imageFile);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                alert('Post created successfully!');
                if (responseData.post && responseData.post._id) {
                    window.location.href = `post-feed.html?highlight=${responseData.post._id}`;
                } else {
                    window.location.href = 'post-feed.html';
                }
            } else {
                alert(`Error: ${responseData.message || responseData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to create post:', error);
            alert('Failed to create post. Please check console for details.');
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in first');
        window.location.href = 'login.html';
        return;
    }
    
    new PostCreator();
});

// Save draft functionality
function saveDraft() {
    const draftData = {
        campaignId: document.getElementById('campaign-select').value,
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        tags: document.getElementById('post-tags').value
    };
    
    localStorage.setItem('postDraft', JSON.stringify(draftData));
    alert('Draft saved!');
}

// Add this function to create-post.js or inline script
async function createQuickCampaign() {
    const title = document.getElementById('campaign-title').value;
    if (!title) {
        alert('Please enter a campaign title');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/campaigns/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                title: title,
                description: 'Campaign created from post page',
                tags: ['community']
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Campaign created successfully!');
            location.reload(); // Reload to show the new campaign
        } else {
            alert('Failed to create campaign: ' + data.error);
        }
    } catch (error) {
        alert('Error creating campaign');
        console.error(error);
    }
}

// Show the create campaign section for managers
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (['campaign_manager', 'admin'].includes(user.role)) {
        const section = document.getElementById('create-campaign-section');
        if (section) section.style.display = 'block';
    }
});
