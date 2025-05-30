const express = require('express');
const {
    getDashboardStats,
    getMonthlySales,
    getProductStats,
    getUserStats,
    updateOrderStatus,
    updateProductStatus
} = require('../controllers/admin');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/monthly-sales', getMonthlySales);
router.get('/product-stats', getProductStats);
router.get('/user-stats', getUserStats);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/products/:id/status', updateProductStatus);

module.exports = router;