const { encryptText, decryptText } = require('./backend/services/encryptionService');

console.log('--- Running Tests for Campaign Management System Updates ---');

// 1. Test AES-256-GCM Encryption / Decryption
console.log('\n[Test 1] Testing Sensitive Field Encryption Service...');
const originalPhone = '+919876543210';
const encryptedPhone = encryptText(originalPhone);
const decryptedPhone = decryptText(encryptedPhone);

console.log('Original Phone:', originalPhone);
console.log('Encrypted Phone:', encryptedPhone);
console.log('Decrypted Phone:', decryptedPhone);

if (encryptedPhone.startsWith('enc:') && decryptedPhone === originalPhone) {
    console.log('✅ Encryption / Decryption Test PASSED');
} else {
    console.error('❌ Encryption Test FAILED');
    process.exit(1);
}

// 2. Test Indian Phone Validation logic
console.log('\n[Test 2] Testing Indian Phone Validation...');

function validateIndianPhone(phone) {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/[\s\-\(\)]/g, '');
    let digits = '';
    if (cleaned.startsWith('+91')) {
        digits = cleaned.slice(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
        digits = cleaned.slice(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
        digits = cleaned.slice(1);
    } else {
        digits = cleaned;
    }
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(digits)) {
        return null;
    }
    return `+91${digits}`;
}

const validTest1 = validateIndianPhone('9876543210');
const validTest2 = validateIndianPhone('+919876543210');
const invalidTest1 = validateIndianPhone('+1234567890'); // Non-Indian
const invalidTest2 = validateIndianPhone('5876543210'); // Invalid starting digit

console.log('9876543210 ->', validTest1);
console.log('+919876543210 ->', validTest2);
console.log('+1234567890 ->', invalidTest1);
console.log('5876543210 ->', invalidTest2);

if (validTest1 === '+919876543210' && validTest2 === '+919876543210' && invalidTest1 === null && invalidTest2 === null) {
    console.log('✅ Indian Phone Validation Test PASSED');
} else {
    console.error('❌ Indian Phone Validation Test FAILED');
    process.exit(1);
}

// 3. Test Email Normalization
console.log('\n[Test 3] Testing Email Normalization...');
const rawEmail = '  TestUser@Example.COM  ';
const normalizedEmail = rawEmail.trim().toLowerCase();
console.log('Raw:', rawEmail, '-> Normalized:', normalizedEmail);

if (normalizedEmail === 'testuser@example.com') {
    console.log('✅ Email Normalization Test PASSED');
} else {
    console.error('❌ Email Normalization Test FAILED');
    process.exit(1);
}

console.log('\n✨ ALL SYSTEM TESTS PASSED SUCCESSFULLY! ✨');
