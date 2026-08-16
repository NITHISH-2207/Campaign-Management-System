const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Meta Webhook Verification
router.get('/webhook', whatsappController.verifyWebhook);

// Meta Webhook Events
router.post('/webhook', whatsappController.handleWebhook);

// Send WhatsApp Message
router.post('/send', whatsappController.sendMessage);

module.exports = router;