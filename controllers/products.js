const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id)
        .populate('seller', 'name email')
        .populate('reviews');

    if (!product) {
        return next(
            new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: product
    });
});

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (seller, admin)
exports.createProduct = asyncHandler(async (req, res, next) => {
    // Add user to req.body
    req.body.seller = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        data: product
    });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (seller, admin)
exports.updateProduct = asyncHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is product owner or admin
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} is not authorized to update this product`,
                401
            )
        );
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: product
    });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (seller, admin)
exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is product owner or admin
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} is not authorized to delete this product`,
                401
            )
        );
    }

    // Delete images from cloudinary
    for (const image of product.images) {
        await cloudinary.uploader.destroy(image.public_id);
    }

    await product.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Upload photo for product
// @route   PUT /api/v1/products/:id/photo
// @access  Private (seller, admin)
exports.productPhotoUpload = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is product owner or admin
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} is not authorized to update this product`,
                401
            )
        );
    }

    if (!req.files) {
        return next(new ErrorResponse(`Please upload a file`, 400));
    }

    const file = req.files.file;

    // Make sure the image is a photo
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse(`Please upload an image file`, 400));
    }

    // Check filesize
    if (file.size > process.env.MAX_FILE_UPLOAD) {
        return next(
            new ErrorResponse(
                `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
                400
            )
        );
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'ecommerce/products',
        width: 800,
        height: 800,
        crop: 'scale'
    });

    // Remove temp file
    fs.unlinkSync(file.tempFilePath);

    // Add image to product
    product.images.push({
        public_id: result.public_id,
        url: result.secure_url
    });

    await product.save();

    res.status(200).json({
        success: true,
        data: product
    });
});

// @desc    Get products by seller
// @route   GET /api/v1/products/seller/:sellerId
// @access  Public
exports.getProductsBySeller = asyncHandler(async (req, res, next) => {
    const products = await Product.find({ seller: req.params.sellerId });

    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

// @desc    Get top rated products
// @route   GET /api/v1/products/top
// @access  Public
exports.getTopProducts = asyncHandler(async (req, res, next) => {
    const products = await Product.find().sort({ ratings: -1 }).limit(5);

    res.status(200).json({
        success: true,
        data: products
    });
});

// @desc    Get related products
// @route   GET /api/v1/products/:id/related
// @access  Public
exports.getRelatedProducts = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
        );
    }

    const products = await Product.find({
        category: product.category,
        _id: { $ne: req.params.id }
    }).limit(5);

    res.status(200).json({
        success: true,
        data: products
    });
});

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
exports.searchProducts = asyncHandler(async (req, res, next) => {
    const { q } = req.query;

    if (!q) {
        return next(new ErrorResponse(`Please provide a search query`, 400));
    }

    const products = await Product.find({
        $text: { $search: q }
    }).sort({ score: { $meta: 'textScore' } });

    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});