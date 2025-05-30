const app = require('./app');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

// Handle uncaught exceptions
process.on('uncaughtException', err => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

// Connect to database
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info('MongoDB connected...'))
    .catch(err => logger.error(err));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}...`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
    logger.info('SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated!');
    });
});