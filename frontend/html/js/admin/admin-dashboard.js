// frontend/js/admin/admin-dashboard.js

var API_BASE_URL = window.API_BASE_URL || ((window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
    ? 'http://localhost:3000/api'
    : 'https://campaign-management-system-zquy.onrender.com/api');

let currentFilter = 'pending';
let cachedCampaigns = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Verify admin access
    if (!token || user.role !== 'admin') {
        alert('Access Denied: Admin authorization required.');
        window.location.href = 'admin-login.html';
        return;
    }

    if (user.name) {
        document.getElementById('userMenu').textContent = `Hi, ${user.name}`;
    }

    // Trap browser back button inside admin session until explicit logout
    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        history.pushState(null, null, location.href);
    };

    // Load Overview Metrics & Pending Campaigns
    await loadAdminOverview();
    await loadAdminCampaigns('pending');
});

// Load Overview Counts
async function loadAdminOverview() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/campaigns/admin/overview`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load admin overview');

        const data = await response.json();
        if (data.success && data.stats) {
            const s = data.stats;
            document.getElementById('pendingCount').textContent = s.pendingCampaigns || 0;
            document.getElementById('approvedCount').textContent = s.approvedCampaigns || 0;
            document.getElementById('rejectedCount').textContent = s.rejectedCampaigns || 0;
            document.getElementById('totalCount').textContent = s.totalCampaigns || 0;
            document.getElementById('managerCount').textContent = s.totalManagers || 0;
            document.getElementById('participantCount').textContent = s.totalParticipants || 0;

            document.getElementById('badgePending').textContent = s.pendingCampaigns || 0;
            document.getElementById('badgeApproved').textContent = s.approvedCampaigns || 0;
            document.getElementById('badgeRejected').textContent = s.rejectedCampaigns || 0;
            document.getElementById('badgeAll').textContent = s.totalCampaigns || 0;
        }
    } catch (error) {
        console.error('Error loading overview metrics:', error);
    }
}

// Filter Tab Switch
async function filterTab(status) {
    currentFilter = status;

    document.querySelectorAll('.status-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    await loadAdminCampaigns(status);
}

// Load Admin Campaigns
async function loadAdminCampaigns(status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/campaigns/admin/list?status=${status}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load campaigns');

        const data = await response.json();
        if (data.success) {
            cachedCampaigns = data.campaigns || [];
            displayAdminCampaigns(cachedCampaigns);
        }
    } catch (error) {
        console.error('Error loading admin campaigns:', error);
    }
}

// Render Admin Campaign Cards
function displayAdminCampaigns(campaigns) {
    const container = document.getElementById('adminCampaignsGrid');

    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--dark-grey); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                <i class="fas fa-inbox fa-3x mb-3" style="color: var(--light-grey);"></i>
                <p style="color: var(--lighter-grey);">No ${currentFilter} campaigns found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = campaigns.map(c => `
        <div class="campaign-card" style="overflow: hidden; padding: 0; display: flex; flex-direction: column;">
            ${c.media?.imageUrl ? `
                <div style="width: 100%; height: 180px; overflow: hidden; background: #1a1a1a;">
                    <img src="${getCampaignImageUrl(c.media.imageUrl)}" alt="${escapeHtml(c.title)}" style="width: 100%; height: 180px; object-fit: cover; display: block;" onerror="this.parentNode.style.display='none'">
                </div>
            ` : ''}
            <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <span class="campaign-status ${c.status}">${c.status}</span>
                    <h3 style="margin-top: 10px;">${escapeHtml(c.title)}</h3>
                    <p class="campaign-category">${escapeHtml(c.category)} • ${escapeHtml(c.type || 'Online')}</p>
                    <p style="font-size: 0.85rem; color: var(--light-brown); margin-bottom: 8px;">
                        <i class="fas fa-building me-1"></i> ${escapeHtml(c.managerId?.organization || c.managerId?.name || 'Organization')}
                    </p>
                    <p class="campaign-description">${escapeHtml(c.description || '')}</p>
                    <div style="font-size: 0.85rem; color: var(--light-grey); margin: 12px 0;">
                        <div><i class="fas fa-map-marker-alt me-1"></i> ${escapeHtml(c.location || 'N/A')}</div>
                        <div><i class="fas fa-calendar-alt me-1"></i> ${formatDate(c.startDate)} - ${formatDate(c.endDate)}</div>
                        <div><i class="fas fa-envelope me-1"></i> ${escapeHtml(c.contactInfo?.email || c.managerId?.email || 'N/A')}</div>
                    </div>
                </div>

                <div class="campaign-actions" style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn-view" style="flex: 1;" onclick="viewCampaignDetails('${c._id}')">Details</button>
                    ${c.status === 'pending' || c.status === 'rejected' ? `
                        <button class="btn-approve" style="flex: 1;" onclick="handleApproveReject('${c._id}', true)"><i class="fas fa-check"></i> Approve</button>
                    ` : ''}
                    ${c.status === 'pending' || c.status === 'approved' || c.status === 'active' ? `
                        <button class="btn-reject" style="flex: 1;" onclick="handleApproveReject('${c._id}', false)"><i class="fas fa-times"></i> Reject</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Open Campaign Details Modal
function viewCampaignDetails(campaignId) {
    const campaign = cachedCampaigns.find(c => c._id === campaignId);
    if (!campaign) return;

    document.getElementById('modalTitle').textContent = campaign.title;
    document.getElementById('modalCategory').textContent = `${campaign.category} • ${campaign.type}`;
    document.getElementById('modalStatusBadge').textContent = campaign.status;
    document.getElementById('modalStatusBadge').className = `campaign-status ${campaign.status}`;

    document.getElementById('modalManager').textContent = `${campaign.managerId?.name || 'Manager'} (${campaign.managerId?.organization || 'N/A'})`;
    document.getElementById('modalEmail').textContent = campaign.contactInfo?.email || campaign.managerId?.email || 'N/A';
    document.getElementById('modalLocation').textContent = `${campaign.location || 'N/A'} (${campaign.type})`;
    document.getElementById('modalDates').textContent = `${formatDate(campaign.startDate)} to ${formatDate(campaign.endDate)}`;

    document.getElementById('modalDescription').textContent = campaign.description || 'No description provided.';
    document.getElementById('modalGoals').textContent = campaign.goals || 'No goals specified.';
    document.getElementById('modalImpact').textContent = campaign.expectedImpact || 'No expected impact specified.';

    const imgEl = document.getElementById('modalImage');
    if (campaign.media?.imageUrl) {
        imgEl.src = getCampaignImageUrl(campaign.media.imageUrl);
        imgEl.style.display = 'block';
        imgEl.onerror = () => { imgEl.style.display = 'none'; };
    } else {
        imgEl.style.display = 'none';
    }

    const approveBtn = document.getElementById('modalApproveBtn');
    const rejectBtn = document.getElementById('modalRejectBtn');

    approveBtn.onclick = async () => {
        await handleApproveReject(campaign._id, true);
        closeCampaignModal();
    };

    rejectBtn.onclick = async () => {
        await handleApproveReject(campaign._id, false);
        closeCampaignModal();
    };

    document.getElementById('campaignDetailsModal').style.display = 'flex';
}

function closeCampaignModal() {
    document.getElementById('campaignDetailsModal').style.display = 'none';
}

// Approve or Reject Campaign Action
async function handleApproveReject(campaignId, isApprove) {
    const actionText = isApprove ? 'approve' : 'reject';
    let feedback = '';

    if (!isApprove) {
        feedback = prompt('Optional: Provide feedback/reason for rejection:', 'Does not meet campaign guidelines');
        if (feedback === null) return; // User cancelled
    }

    if (!confirm(`Are you sure you want to ${actionText} this campaign?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                approved: isApprove,
                feedback: feedback
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(`Campaign has been ${isApprove ? 'APPROVED' : 'REJECTED'} successfully!`);
            await loadAdminOverview();
            await loadAdminCampaigns(currentFilter);
        } else {
            alert(`Action failed: ${data.message || 'Server error'}`);
        }
    } catch (error) {
        console.error('Approval action error:', error);
        alert('Failed to process action. Please check server logs.');
    }
}

function adminLogout() {
    if (confirm('Log out from Admin Dashboard?')) {
        window.onpopstate = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('admin-login.html');
    }
}

function formatDate(dStr) {
    if (!dStr) return 'N/A';
    return new Date(dStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
