const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create payment intent
// @route   POST /api/v1/payments/create-payment-intent
// @access  Private
exports.createPaymentIntent = asyncHandler(async (req, res, next) => {
    const { orderId } = req.body;

    // Find the order
    const order = await Order.findById(orderId).populate({
        path: 'items.product',
        select: 'name price'
    });

    if (!order) {
        return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
        return next(
            new ErrorResponse(`Not authorized to pay for this order`, 401)
        );
    }

    // Check if order is already paid
    if (order.isPaid) {
        return next(new ErrorResponse(`Order already paid`, 400));
    }

    // Calculate total amount
    const totalAmount = order.items.reduce((total, item) => {
        return total + item.product.price * item.quantity;
    }, 0);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount * 100, // in cents
        currency: 'usd',
        metadata: { integration_check: 'accept_a_payment' }
    });

    res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret
    });
});

// @desc    Confirm payment and update order
// @route   PUT /api/v1/payments/confirm-payment
// @access  Private
exports.confirmPayment = asyncHandler(async (req, res, next) => {
    const { orderId, paymentId } = req.body;

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
        return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
        return next(
            new ErrorResponse(`Not authorized to update this order`, 401)
        );
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    if (paymentIntent.status !== 'succeeded') {
        return next(new ErrorResponse(`Payment not successful`, 400));
    }

    // Update order
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
        id: paymentIntent.id,
        status: paymentIntent.status,
        update_time: paymentIntent.created,
        email_address: req.user.email
    };

    await order.save();

    res.status(200).json({
        success: true,
        data: order
    });
});

// @desc    Webhook for Stripe events
// @route   POST /api/v1/payments/webhook
// @access  Public
exports.webhook = asyncHandler(async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            // Update order in database
            await Order.findOneAndUpdate(
                { 'paymentResult.id': paymentIntent.id },
                {
                    isPaid: true,
                    paidAt: Date.now(),
                    'paymentResult.status': paymentIntent.status
                }
            );
            break;
        case 'payment_intent.payment_failed':
            const paymentFailed = event.data.object;
            console.log(`Payment failed: ${paymentFailed.id}`);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});