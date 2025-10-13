// Enhanced navigation.js with mobile support and better structure
function setupNavigation() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!user.id && !['login.html', 'register.html', 'index.html'].includes(currentPage)) {
        window.location.href = 'login.html';
        return;
    }

    let navHTML = `
        <div class="nav-container">
            <a class="logo" onclick="goToDashboard()" style="cursor: pointer;">ChangeWave</a>
            <button class="mobile-menu-btn" onclick="toggleMobileMenu()">
                <i class="fas fa-bars"></i>
            </button>
            <ul class="nav-links" id="navLinks">
    `;

    // Role-specific navigation
    if (['campaign_manager', 'admin'].includes(user.role)) {
        // Campaign Manager Navigation
        navHTML += `
            <li><a href="campaign-manager-dashboard.html" class="${currentPage === 'campaign-manager-dashboard.html' ? 'active' : ''}">Dashboard</a></li>
            <li><a href="post-feed.html" class="${currentPage === 'post-feed.html' ? 'active' : ''}">Feed</a></li>
            <li class="nav-dropdown">
                <a href="#" class="dropdown-toggle ${['create-campaign.html', 'create-post.html', 'create-education-module.html', 'create-survey.html'].includes(currentPage) ? 'active' : ''}">
                    Create <span class="dropdown-arrow">▼</span>
                </a>
                <ul class="dropdown-menu">
                    <li><a href="create-campaign.html">📢 New Campaign</a></li>
                    <li><a href="create-post.html">📝 New Post</a></li>
                    <li><a href="create-education-module.html">📚 Education Module</a></li>
                    <li><a href="create-survey.html">📊 New Survey</a></li>
                </ul>
            </li>
            <li><a href="analytics-dashboard.html" class="${currentPage === 'analytics-dashboard.html' ? 'active' : ''}">Analytics</a></li>
            <li><a href="education-library.html" class="${currentPage === 'education-library.html' ? 'active' : ''}">Education</a></li>
            <li><a href="survey-management.html" class="${currentPage === 'survey-management.html' ? 'active' : ''}">Surveys</a></li>
            
<li><a href="campaigns-list.html" class="${currentPage === 'campaigns-list.html' ? 'active' : ''}">Campaigns</a></li>


        `;
    } else if (user.id) {
        // Regular User Navigation
        navHTML += `
            <li><a href="user-dashboard.html" class="${currentPage === 'user-dashboard.html' ? 'active' : ''}">Dashboard</a></li>
            <li><a href="post-feed.html" class="${currentPage === 'post-feed.html' ? 'active' : ''}">Feed</a></li>
            <li><a href="create-post.html" class="${currentPage === 'create-post.html' ? 'active' : ''}">New </a></li>
            <li><a href="education-library.html" class="${currentPage === 'education-library.html' ? 'active' : ''}">Learn</a></li>
            <li><a href="survey-participation.html" class="${currentPage === 'survey-participation.html' ? 'active' : ''}">Surveys</a></li>
            <li><a href="campaigns-list.html" class="${currentPage === 'campaigns-list.html' ? 'active' : ''}">Campaigns</a></li>

        `;
    }

    // User menu and logout (only if logged in)
    if (user.id) {
        navHTML += `
                <li class="nav-user">
                    <span class="user-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                    <span class="user-name">${user.name || 'User'}</span>
                </li>
                <li><a href="#" onclick="logout()" class="logout-btn">Logout</a></li>
        `;
    }

    navHTML += `
            </ul>
        </div>
    `;

    // Set the navigation
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.innerHTML = navHTML;
        
        // Add dropdown functionality
        setupDropdowns();
    }
}

function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Close other dropdowns
            document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                }
            });
            
            menu.classList.toggle('show');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('mobile-active');
    
    // Update button icon
    const btn = document.querySelector('.mobile-menu-btn');
    const icon = btn.querySelector('i');
    if (navLinks.classList.contains('mobile-active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

function goToDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (['campaign_manager', 'admin'].includes(user.role)) {
        window.location.href = 'campaign-manager-dashboard.html';
    } else if (user.id) {
        window.location.href = 'user-dashboard.html';
    } else {
        window.location.href = 'index.html';
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Initialize navigation on DOM load
document.addEventListener('DOMContentLoaded', setupNavigation);

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const navLinks = document.getElementById('navLinks');
        if (window.innerWidth > 768 && navLinks) {
            navLinks.classList.remove('mobile-active');
            const btn = document.querySelector('.mobile-menu-btn i');
            if (btn) {
                btn.classList.remove('fa-times');
                btn.classList.add('fa-bars');
            }
        }
    }, 250);
});
