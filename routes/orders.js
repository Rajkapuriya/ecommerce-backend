const express = require('express');
const {
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    getMyOrders,
    updateOrderToPaid,
    updateOrderToDelivered
} = require('../controllers/orders');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, authorize('admin'), getOrders)
    .post(protect, createOrder);

router.route('/myorders').get(protect, getMyOrders);

router.route('/:id')
    .get(protect, getOrder)
    .put(protect, updateOrder)
    .delete(protect, authorize('admin'), deleteOrder);

router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/deliver').put(protect, authorize('admin'), updateOrderToDelivered);

module.exports = router;