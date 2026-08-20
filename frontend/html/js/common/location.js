// frontend/html/js/common/location.js

/**
 * Resolves the backend API URL dynamically based on environment.
 */
function getLocationApiUrl() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
    return 'https://campaign-management-system-zquy.onrender.com/api';
}

/**
 * One-time user location detection and reverse geocoding.
 * Populates existing location field without altering existing form flow.
 * 
 * @param {string} targetInputId ID of existing location input/select element
 * @param {string} statusContainerId ID of status element for non-intrusive messages
 * @param {HTMLElement} [buttonEl] Reference to button element for loading state
 */
function useMyLocation(targetInputId, statusContainerId, buttonEl) {
    const statusEl = document.getElementById(statusContainerId);
    const targetEl = document.getElementById(targetInputId);

    if (!targetEl) {
        console.warn(`[Location] Target element with ID '${targetInputId}' not found.`);
        return;
    }

    if (!navigator.geolocation) {
        if (statusEl) {
            statusEl.textContent = 'Geolocation is not supported by your browser. Please enter it manually.';
            statusEl.className = 'location-status text-warning';
        }
        return;
    }

    // Set loading state
    if (statusEl) {
        statusEl.textContent = '📍 Detecting location...';
        statusEl.className = 'location-status text-info';
        statusEl.style.display = 'inline';
    }

    if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.style.opacity = '0.7';
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                const response = await fetch(`${getLocationApiUrl()}/location/reverse-geocode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ latitude, longitude })
                });

                const data = await response.json();

                if (data.success && data.location) {
                    // Populate existing input/select
                    if (targetEl.tagName === 'SELECT') {
                        let optionExists = false;
                        for (let i = 0; i < targetEl.options.length; i++) {
                            if (targetEl.options[i].value.toLowerCase() === data.location.toLowerCase()) {
                                targetEl.selectedIndex = i;
                                optionExists = true;
                                break;
                            }
                        }
                        if (!optionExists) {
                            const newOpt = document.createElement('option');
                            newOpt.value = data.location;
                            newOpt.textContent = data.location;
                            newOpt.selected = true;
                            targetEl.appendChild(newOpt);
                        }
                    } else {
                        targetEl.value = data.location;
                    }

                    // Dispatch change/input events for existing event handlers
                    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
                    targetEl.dispatchEvent(new Event('input', { bubbles: true }));

                    if (statusEl) {
                        statusEl.textContent = '✓ Location detected';
                        statusEl.className = 'location-status text-success';
                        setTimeout(() => {
                            statusEl.textContent = '';
                        }, 4000);
                    }
                } else {
                    throw new Error(data.error || 'Reverse geocoding failed.');
                }
            } catch (err) {
                console.warn('📍 Geolocation/API Error:', err.message);
                if (statusEl) {
                    statusEl.textContent = 'Unable to detect your location. Please enter it manually.';
                    statusEl.className = 'location-status text-warning';
                    setTimeout(() => {
                        statusEl.textContent = '';
                    }, 6000);
                }
            } finally {
                if (buttonEl) {
                    buttonEl.disabled = false;
                    buttonEl.style.opacity = '1';
                }
            }
        },
        (error) => {
            console.warn('📍 Geolocation permission/hardware error:', error.message);
            if (statusEl) {
                statusEl.textContent = 'Unable to detect your location. Please enter it manually.';
                statusEl.className = 'location-status text-warning';
                setTimeout(() => {
                    statusEl.textContent = '';
                }, 6000);
            }
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.style.opacity = '1';
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}
