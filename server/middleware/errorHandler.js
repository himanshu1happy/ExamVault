const multer = require('multer');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack || err.message || err);

    const isProduction = process.env.NODE_ENV === 'production';
    let statusCode = err.statusCode || err.status || 500;
    let message = isProduction ? 'An unexpected error occurred. Please try again later.' : (err.message || 'Internal Server Error');

    if (err instanceof multer.MulterError || err.name === 'MulterError') {
        statusCode = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'PDF must be under 10 MB';
        } else {
            message = err.message || 'File upload error';
        }
    } else if (err.message && err.message.includes('PDF must be under 10 MB')) {
        statusCode = 400;
        message = err.message;
    }

    res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = errorHandler;
