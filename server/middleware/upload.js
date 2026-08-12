const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ExamVault_Vault',
        resource_type: 'image',     // 👈 CHANGE 1: 'raw' ko hata kar 'image' kar do
        format: 'pdf',              // 👈 CHANGE 2: Isko strictly 'pdf' par set karo
        flags: 'attachment:false',  // 👈 CHANGE 3: Yeh browser ko bolega ki "Download mat karo, website mein dikhao"
  
    },
});

const fileFilter = (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase() === '.pdf';
    const mimetype = ['application/pdf', 'application/x-pdf'].includes(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }

    return cb(new Error('Security Alert: Only PDF files are allowed!'), false);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

module.exports = upload;
