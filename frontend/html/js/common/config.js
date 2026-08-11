// frontend/js/common/config.js
(function () {
    const PROD_API_BASE = 'https://campaign-management-system-zquy.onrender.com';
    const PROD_API_URL = 'https://campaign-management-system-zquy.onrender.com/api';
    const LOCAL_API_BASE = 'http://localhost:3000';
    const LOCAL_API_URL = 'http://localhost:3000/api';

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Global API base URLs accessible throughout all scripts
    window.API_BASE_URL = window.API_BASE_URL || (isLocal ? LOCAL_API_BASE : PROD_API_BASE);
    window.API_URL = window.API_URL || (isLocal ? LOCAL_API_URL : PROD_API_URL);
    
    // Global helper for rendering in-page notifications on forms/containers
    window.showFormNotification = function (containerOrForm, message, type = 'error') {
        if (!containerOrForm) return;

        let notification = containerOrForm.querySelector('.form-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'form-notification';
            if (containerOrForm.tagName === 'FORM') {
                containerOrForm.insertBefore(notification, containerOrForm.firstChild);
            } else {
                containerOrForm.prepend(notification);
            }
        }

        notification.className = `form-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}</span>
            <span class="notification-text">${message}</span>
        `;
        notification.style.display = 'flex';

        notification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
})();
