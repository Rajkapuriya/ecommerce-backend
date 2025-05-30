const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price'],
        min: [0, 'Price must be at least 0']
    },
    discountPrice: {
        type: Number,
        validate: {
            validator: function (val) {
                return val < this.price;
            },
            message: 'Discount price must be below regular price'
        }
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: [
            'Electronics',
            'Clothing',
            'Home',
            'Books',
            'Beauty',
            'Sports',
            'Other'
        ]
    },
    subCategory: String,
    brand: String,
    stock: {
        type: Number,
        required: [true, 'Please add stock quantity'],
        min: [0, 'Stock cannot be negative']
    },
    ratings: {
        type: Number,
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    images: [
        {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }
    ],
    colors: [String],
    sizes: [String],
    tags: [String],
    features: [String],
    specifications: [
        {
            key: String,
            value: String
        }
    ],
    seller: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create product slug from name
productSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Cascade delete reviews when product is deleted
productSchema.pre('remove', async function (next) {
    await this.model('Review').deleteMany({ product: this._id });
    next();
});

// Reverse populate with virtuals
productSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'product',
    justOne: false
});

// Static method to get average rating
productSchema.statics.getAverageRating = async function (productId) {
    const obj = await this.aggregate([
        {
            $match: { _id: productId }
        },
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
                averageRating: { $avg: '$reviews.rating' },
                numOfReviews: { $size: '$reviews' }
            }
        }
    ]);

    try {
        await this.model('Product').findByIdAndUpdate(productId, {
            ratings: obj[0] ? obj[0].averageRating : 0,
            numOfReviews: obj[0] ? obj[0].numOfReviews : 0
        });
    } catch (err) {
        console.error(err);
    }
};

module.exports = mongoose.model('Product', productSchema);