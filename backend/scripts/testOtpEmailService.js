// backend/scripts/testOtpEmailService.js
const otpEmailService = require('../services/otpEmailService');

async function runTest() {
    console.log('--- OTP Email Service Configuration Test ---');
    
    // 1. Verify connection/authentication (does NOT send an email)
    const verification = await otpEmailService.verifyConnection();
    
    if (verification.success) {
        console.log(`✅ ${verification.message}`);
    } else {
        console.error(`❌ Verification failed: ${verification.error}`);
        process.exit(1);
    }

    // 2. Check if a test recipient email address was provided via CLI argument
    const recipientArg = process.argv[2];
    if (recipientArg) {
        console.log(`\nSending test email to recipient...`);
        try {
            const result = await otpEmailService.sendOTPEmail(recipientArg, '123456');
            console.log(`✅ ${result.message}`);
            console.log(`📬 Message ID: ${result.messageId}`);
        } catch (error) {
            console.error(`❌ Failed to send test email: ${error.message}`);
            process.exit(1);
        }
    } else {
        console.log('\n[SAFE MODE] No recipient specified. No email was sent.');
        console.log('To send a test email to a specific address, run:');
        console.log('  node backend/scripts/testOtpEmailService.js <recipient_email>');
    }
}

runTest();
