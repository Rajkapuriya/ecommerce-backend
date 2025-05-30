const express = require('express');
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    productPhotoUpload,
    getProductsBySeller,
    getTopProducts,
    getRelatedProducts,
    searchProducts
} = require('../controllers/products');
const advancedResults = require('../middleware/advancedResults');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
    .route('/')
    .get(
        advancedResults(Product, [
            { path: 'seller', select: 'name email' },
            { path: 'reviews', select: 'rating comment' }
        ]),
        getProducts
    )
    .post(protect, authorize('seller', 'admin'), createProduct);

router.route('/top').get(getTopProducts);
router.route('/search').get(searchProducts);
router.route('/seller/:sellerId').get(getProductsBySeller);
router.route('/:id/related').get(getRelatedProducts);

router
    .route('/:id')
    .get(getProduct)
    .put(protect, authorize('seller', 'admin'), updateProduct)
    .delete(protect, authorize('seller', 'admin'), deleteProduct);

router
    .route('/:id/photo')
    .put(protect, authorize('seller', 'admin'), productPhotoUpload);

module.exports = router;