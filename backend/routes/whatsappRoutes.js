// backend/routes/whatsappRoutes.js

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// GET /api/whatsapp/webhook
// Webhook Verification by Meta
router.get(
    '/webhook',
    whatsappController.verifyWebhook
);

// POST /api/whatsapp/webhook
// Webhook Event Notification from Meta
router.post(
    '/webhook',
    whatsappController.handleWebhook
);

// POST /api/whatsapp/send
// Send a WhatsApp text message from ChangeWave
router.post(
    '/send',
    whatsappController.sendMessage
);

module.exports = router;