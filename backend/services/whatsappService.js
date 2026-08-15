// backend/services/whatsappService.js
const config = require('../config/config');

/**
 * Send a text message to a WhatsApp recipient using Meta WhatsApp Cloud API.
 * @param {string} to - Recipient's phone number in international format without '+' (e.g. '15551234567')
 * @param {string} bodyText - Plain text message content
 * @returns {Promise<Object>} API response JSON
 */
const sendTextMessage = async (to, bodyText) => {
    const accessToken = config.whatsapp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = config.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = config.whatsapp?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v20.0';

    if (!accessToken || !phoneNumberId) {
        console.error('❌ WhatsApp credentials missing (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set).');
        throw new Error('WhatsApp service credentials missing');
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
            preview_url: false,
            body: bodyText
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ WhatsApp API Error:', data.error?.message || data);
            throw new Error(`WhatsApp API error: ${data.error?.message || response.statusText}`);
        }

        console.log(`✅ WhatsApp message sent to ${to}. Message ID:`, data.messages?.[0]?.id);
        return data;
    } catch (error) {
        console.error('🔥 Error in sendTextMessage:', error.message);
        throw error;
    }
};

module.exports = {
    sendTextMessage
};
