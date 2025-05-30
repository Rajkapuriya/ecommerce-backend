const express = require('express');
const {
    createPaymentIntent,
    confirmPayment,
    webhook
} = require('../controllers/payments');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/create-payment-intent', protect, createPaymentIntent);
router.put('/confirm-payment', protect, confirmPayment);
router.post('/webhook', webhook);

module.exports = router;