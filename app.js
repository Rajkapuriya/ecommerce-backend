const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/error');

// Route files
const products = require('./routes/product');
const auth = require('./routes/auth');
const users = require('./routes/users');
const reviews = require('./routes/reviews');
const orders = require('./routes/orders');
const payments = require('./routes/payments');
const admin = require('./routes/admin');

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// File uploading
app.use(fileUpload());

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 100
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/v1/products', products);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);
app.use('/api/v1/orders', orders);
app.use('/api/v1/payments', payments);
app.use('/api/v1/admin', admin);

// Error handler middleware
app.use(errorHandler);

// Swagger setup
if (process.env.NODE_ENV === 'development') {
    const swaggerJsDoc = require('swagger-jsdoc');
    const swaggerUI = require('swagger-ui-express');

    const swaggerOptions = {
        swaggerDefinition: {
            openapi: '3.0.0',
            info: {
                title: 'E-Commerce API',
                version: '1.0.0',
                description: 'API documentation for E-Commerce application'
            },
            servers: [
                {
                    url: `http://localhost:${process.env.PORT || 5000}/api/v1`
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            security: [{
                bearerAuth: []
            }]
        },
        apis: ['./routes/*.js']
    };

    const swaggerDocs = swaggerJsDoc(swaggerOptions);
    app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));
}

module.exports = app;