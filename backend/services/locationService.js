// backend/services/locationService.js
const https = require('https');

/**
 * Reverse geocode latitude and longitude into a "City, State" string using OpenStreetMap Nominatim API.
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>}
 */
const reverseGeocode = (latitude, longitude) => {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;

        const options = {
            headers: {
                'User-Agent': 'ChangeWave-Analytics-App/1.0 (contact@changewave.com)'
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (!parsed || parsed.error) {
                        return reject(new Error(parsed.error || 'Reverse geocoding failed.'));
                    }

                    const address = parsed.address || {};
                    let city = address.city || address.town || address.village || address.municipality || address.state_district || address.county || address.suburb || '';

                    if (city.toLowerCase().endsWith(' corporation')) {
                        city = city.replace(/\s+corporation$/i, '');
                    }

                    let state = address.state || address.state_district || address.region || '';

                    if (city && state && city.toLowerCase() !== state.toLowerCase()) {
                        return resolve(`${city}, ${state}`);
                    } else if (city) {
                        return resolve(city);
                    } else if (state) {
                        return resolve(state);
                    } else {
                        return resolve(address.country || parsed.display_name || 'Unknown Location');
                    }
                } catch (err) {
                    return reject(new Error('Failed to parse geocoding response.'));
                }
            });
        }).on('error', (err) => {
            return reject(new Error(`Network error during geocoding: ${err.message}`));
        });
    });
};

module.exports = {
    reverseGeocode
};

