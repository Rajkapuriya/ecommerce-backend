const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get dashboard stats
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    const ordersCount = await Order.countDocuments();
    const productsCount = await Product.countDocuments();
    const usersCount = await User.countDocuments();

    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

    res.status(200).json({
        success: true,
        data: {
            ordersCount,
            productsCount,
            usersCount,
            ordersStatus: {
                pending: pendingOrders,
                processing: processingOrders,
                delivered: deliveredOrders
            }
        }
    });
});

// @desc    Get monthly sales
// @route   GET /api/v1/admin/monthly-sales
// @access  Private/Admin
exports.getMonthlySales = asyncHandler(async (req, res, next) => {
    const monthlySales = await Order.aggregate([
        {
            $match: {
                isPaid: true
            }
        },
        {
            $project: {
                month: { $month: '$paidAt' },
                year: { $year: '$paidAt' },
                sales: '$totalPrice'
            }
        },
        {
            $group: {
                _id: {
                    month: '$month',
                    year: '$year'
                },
                totalSales: { $sum: '$sales' },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
            $limit: 12
        }
    ]);

    res.status(200).json({
        success: true,
        data: monthlySales
    });
});

// @desc    Get product stats
// @route   GET /api/v1/admin/product-stats
// @access  Private/Admin
exports.getProductStats = asyncHandler(async (req, res, next) => {
    const productStats = await Product.aggregate([
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'product',
                as: 'reviews'
            }
        },
        {
            $project: {
                name: 1,
                ratings: 1,
                numOfReviews: { $size: '$reviews' },
                stock: 1,
                price: 1,
                category: 1
            }
        },
        {
            $sort: { ratings: -1 }
        },
        {
            $limit: 10
        }
    ]);

    res.status(200).json({
        success: true,
        data: productStats
    });
});

// @desc    Get user stats
// @route   GET /api/v1/admin/user-stats
// @access  Private/Admin
exports.getUserStats = asyncHandler(async (req, res, next) => {
    const userStats = await User.aggregate([
        {
            $lookup: {
                from: 'orders',
                localField: '_id',
                foreignField: 'user',
                as: 'orders'
            }
        },
        {
            $project: {
                name: 1,
                email: 1,
                role: 1,
                ordersCount: { $size: '$orders' },
                totalSpent: { $sum: '$orders.totalPrice' }
            }
        },
        {
            $sort: { totalSpent: -1 }
        },
        {
            $limit: 10
        }
    ]);

    res.status(200).json({
        success: true,
        data: userStats
    });
});

// @desc    Update order status
// @route   PUT /api/v1/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(
            new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
        );
    }

    order.status = status;
    if (status === 'delivered') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
    }

    await order.save();

    res.status(200).json({
        success: true,
        data: order
    });
});

// @desc    Update product status
// @route   PUT /api/v1/admin/products/:id/status
// @access  Private/Admin
exports.updateProductStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
        );
    }

    // For example, you might have an 'active' field to show/hide products
    product.active = status === 'active';
    await product.save();

    res.status(200).json({
        success: true,
        data: product
    });
});