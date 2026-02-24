/**
 * ============================================================
 * Subscription Membership Engine - Frontend Application Logic
 * ============================================================
 * 
 * Handles all client-side functionality:
 * - Authentication (login, register, logout)
 * - API communication
 * - UI state management
 * - Dynamic content rendering
 * ============================================================
 */

const API_BASE = '/api';

// ===== UTILITY FUNCTIONS =====

/**
 * Get the stored JWT token from localStorage
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Get the stored user data from localStorage
 */
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

/**
 * Save auth data to localStorage
 */
function saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Clear auth data from localStorage
 */
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getToken();
}

/**
 * Make an authenticated API request
 * Automatically attaches JWT token to Authorization header
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        // Handle token expiry globally
        if (response.status === 401) {
            clearAuth();
            if (window.location.pathname !== '/login') {
                showAlert('Session expired. Please log in again.', 'warning');
                setTimeout(() => window.location.href = '/login', 1500);
            }
        }

        return { status: response.status, data };
    } catch (error) {
        console.error('API Request Error:', error);
        return { status: 500, data: { success: false, error: { message: 'Network error. Please try again.' } } };
    }
}

/**
 * Display an alert message on the page
 */
function showAlert(message, type = 'danger', containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const icons = {
        success: '✅',
        danger: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    container.innerHTML = `
    <div class="alert alert-${type}">
      ${icons[type] || ''} ${message}
    </div>
  `;

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            alert.style.transition = 'all 0.3s ease';
            setTimeout(() => container.innerHTML = '', 300);
        }
    }, 5000);
}

/**
 * Update navbar based on auth state
 */
function updateNavbar() {
    const navActions = document.getElementById('navActions');
    const navLinks = document.getElementById('navLinks');
    if (!navActions) return;

    const user = getUser();

    if (user) {
        const tierClass = user.role === 'admin' ? 'admin' : 'basic';
        navActions.innerHTML = `
      <div id="navUserInfo">
        <span id="navUserName">${user.name}</span>
        <span id="navUserBadge" class="tier-badge ${tierClass}">${user.role}</span>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="logout()">Logout</button>
    `;

        if (navLinks) {
            let links = `
        <a href="/dashboard">Dashboard</a>
        <a href="/plans">Plans</a>
      `;
            if (user.role === 'admin') {
                links += `<a href="/admin">Admin</a>`;
            }
            navLinks.innerHTML = links;
        }
    } else {
        navActions.innerHTML = `
      <a href="/login" class="btn btn-sm btn-secondary">Login</a>
      <a href="/register" class="btn btn-sm btn-primary">Get Started</a>
    `;
        if (navLinks) {
            navLinks.innerHTML = `
        <a href="/">Home</a>
        <a href="/plans">Plans</a>
      `;
        }
    }
}

/**
 * Logout user
 */
function logout() {
    clearAuth();
    window.location.href = '/login';
}

/**
 * Format a date string for display
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get days remaining from a date
 */
function getDaysRemaining(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();

    // Add scroll effect to navbar
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 20);
        }
    });
});
