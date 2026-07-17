const multer = require('multer');
const path = require('path');

// 1. Storage Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        // Unique file name to avoid overwriting
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

// 2. The Security Guard (File Filter)
const fileFilter = (req, file, cb) => {
    // Sirf in extensions ko andar aane ki permission hai
    const allowedFileTypes = /pdf|jpg|jpeg|png/;
    
    // Check extension name (.pdf, .png, etc.)
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check MIME type (asli file type, taaki koi .exe ka naam badal kar .pdf na kar de)
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true); // File safe hai, andar aane do
    } else {
        return cb(new Error('Security Alert: Only PDF, JPG, and PNG files are allowed!'), false); // Reject!
    }
};

// 3. Combine everything and add a Size Limit (DoS Protection)
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        fileSize: 20 * 1024 * 1024 // Hacker 50GB ki file upload karke server crash na kare (Max 10MB limit)
    } 
});

module.exports = upload;