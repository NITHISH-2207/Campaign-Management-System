// frontend/js/common/auth.js
const API_URL = 'http://campaign-management-system-zquy.onrender.com/api';

// Tab switching
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');

    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        tabBtns[0].classList.add('active');
        tabBtns[1].classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        tabBtns[0].classList.remove('active');
        tabBtns[1].classList.add('active');
    }

    // Clear any error messages
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.success-message').forEach(el => el.style.display = 'none');
}

// Helper function to get appropriate dashboard based on role
function getDashboardByRole(role) {
    switch (role) {
        case 'admin':
            return 'admin-dashboard.html';
        case 'campaign_manager':
            return 'campaign-manager-dashboard.html';
        case 'user':
        case 'participant':
            return 'user-dashboard.html';
        default:
            return 'post-feed.html';
    }
}

// Login functionality
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store auth data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Show success message
            errorEl.style.display = 'none';
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Login successful! Redirecting...';
            successMsg.style.display = 'block';
            e.target.appendChild(successMsg);

            // Redirect based on role
            setTimeout(() => {
                window.location.href = getDashboardByRole(data.user.role);
            }, 1000);
        } else {
            errorEl.textContent = data.error || 'Invalid email or password';
            errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = 'Connection error. Please ensure the server is running.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

// Register functionality
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameEl = document.getElementById('registerName');
    const emailEl = document.getElementById('registerEmail');
    const passwordEl = document.getElementById('registerPassword');
    const roleEl = document.getElementById('registerRole');

    // Skip if required elements don't exist (page uses different form IDs)
    if (!nameEl || !emailEl || !passwordEl) {
        console.warn('auth.js: Register form elements not found, skipping auth.js register handler.');
        return;
    }

    const name = nameEl.value;
    const email = emailEl.value;
    const password = passwordEl.value;
    const role = roleEl ? roleEl.value : 'user';
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validate password
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters long';
        errorEl.style.display = 'block';
        return;
    }

    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            successEl.textContent = 'Registration successful! Logging you in...';
            successEl.style.display = 'block';
            errorEl.style.display = 'none';

            // Store auth data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect after short delay
            setTimeout(() => {
                window.location.href = getDashboardByRole(data.user.role);
            }, 1500);
        } else {
            errorEl.textContent = data.error || 'Registration failed';
            errorEl.style.display = 'block';
            successEl.style.display = 'none';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorEl.textContent = 'Connection error. Please ensure the server is running.';
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
});

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        try {
            const userData = JSON.parse(user);

            // Verify token is not expired (basic check)
            if (userData && userData.id) {
                // Redirect logged-in users away from login page
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = getDashboardByRole(userData.role);
                }
                return true;
            }
        } catch (error) {
            console.error('Invalid user data:', error);
            // Clear invalid data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
    return false;
}

// Protected route check
function requireAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        // Save intended destination
        localStorage.setItem('redirectUrl', window.location.href);
        window.location.href = 'login.html';
        return false;
    }

    try {
        const userData = JSON.parse(user);
        return userData;
    } catch (error) {
        console.error('Invalid user data:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Role-based access control
function requireRole(allowedRoles) {
    const userData = requireAuth();
    if (!userData) return false;

    if (!allowedRoles.includes(userData.role)) {
        alert('Access denied. You do not have permission to view this page.');
        window.location.href = getDashboardByRole(userData.role);
        return false;
    }

    return true;
}

// Logout function
function logout() {
    // Show confirmation
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('redirectUrl');
        window.location.href = 'login.html';
    }
}

// Get current user
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

// API request helper with authentication
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

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        ...defaultOptions
    });

    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Authentication failed');
    }

    return response;
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only check auth if not on login page
    if (!window.location.pathname.includes('login.html')) {
        const publicPages = ['index.html', 'register.html', 'about.html'];
        const currentPage = window.location.pathname.split('/').pop();

        if (!publicPages.includes(currentPage)) {
            requireAuth();
        }
    } else {
        checkAuth();
    }

    // Check for redirect URL after login
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl && checkAuth()) {
        localStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl;
    }
});

// Export functions for use in other scripts
window.authUtils = {
    getCurrentUser,
    requireAuth,
    requireRole,
    logout,
    apiRequest,
    getDashboardByRole
};
