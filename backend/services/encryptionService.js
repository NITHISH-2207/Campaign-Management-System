const crypto = require('crypto');

// Default 32-byte secret key fallback for development if ENCRYPTION_KEY env variable is not set
const DEFAULT_KEY_PHRASE = process.env.ENCRYPTION_KEY || 'changewave_campaign_management_system_secure_aes_key_2026';
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    return crypto.createHash('sha256').update(DEFAULT_KEY_PHRASE).digest();
}

/**
 * Encrypt sensitive plaintext string using AES-256-GCM
 * @param {string} text 
 * @returns {string} encrypted cipher string with iv and authTag
 */
function encryptText(text) {
    if (!text || typeof text !== 'string') return text;
    try {
        const iv = crypto.randomBytes(12);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        
        // Format: enc:iv:authTag:encrypted
        return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error.message);
        return text; // Safe fallback if encryption fails
    }
}

/**
 * Decrypt encrypted text string using AES-256-GCM
 * @param {string} cipherText 
 * @returns {string} decrypted plaintext string
 */
function decryptText(cipherText) {
    if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith('enc:')) {
        return cipherText || '';
    }
    try {
        const parts = cipherText.split(':');
        if (parts.length !== 4) return cipherText;
        
        const iv = Buffer.from(parts[1], 'hex');
        const authTag = Buffer.from(parts[2], 'hex');
        const encrypted = parts[3];
        const key = getEncryptionKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        return cipherText;
    }
}

module.exports = {
    encryptText,
    decryptText
};
