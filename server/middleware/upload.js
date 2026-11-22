const multer = require('multer');

const storage = multer.memoryStorage();

const paperUploadFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedImageTypes.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new Error('Thumbnail must be a JPG, PNG, or WEBP image.'), false);
    }

    if (file.fieldname === 'paperFile' || file.fieldname === 'solutionFile') {
        if (file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        return cb(new Error('Question paper and Solution must be PDF files.'), false);
    }

    cb(new Error(`Unexpected upload field: ${file.fieldname}`), false);
};

const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, and WEBP images are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: paperUploadFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit (Cloudinary free plan)
});

const imageUpload = multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

module.exports = {
    upload,
    imageUpload
};
