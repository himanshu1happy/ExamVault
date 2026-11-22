const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');

/**
 * Uploads a buffer directly to Cloudinary using upload_stream.
 * For raw PDFs, appends .pdf to public_id to ensure it opens cleanly inline in browsers.
 *
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - { folder, resourceType, publicIdPrefix }
 * @returns {Promise<{ url: string, publicId: string, resourceType: string }>}
 */
const uploadBuffer = (buffer, { folder = 'ExamVault', resourceType = 'auto', publicIdPrefix = 'file' } = {}) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return Promise.reject(new Error('Cannot upload an empty buffer to Cloudinary.'));
    }

    return new Promise((resolve, reject) => {
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        const baseId = `${publicIdPrefix}-${uniqueSuffix}`;

        const uploadOptions = {
            folder,
            resource_type: resourceType,
            overwrite: false
        };

        if (resourceType === 'raw') {
            // Ending in .pdf ensures Cloudinary serves the file with Content-Type: application/pdf
            // allowing direct inline preview in iframes without URL transformations
            uploadOptions.public_id = `${baseId}.pdf`;
        } else {
            uploadOptions.public_id = baseId;
        }

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                console.error('Cloudinary upload_stream error:', error);
                return reject(error);
            }

            if (!result || (!result.secure_url && !result.url)) {
                return reject(new Error('Cloudinary did not return a valid secure_url.'));
            }

            resolve({
                url: result.secure_url || result.url,
                publicId: result.public_id,
                resourceType: result.resource_type || resourceType
            });
        });

        stream.end(buffer);
    });
};

/**
 * Deletes a file from Cloudinary using the exact same resource type it was uploaded with.
 *
 * @param {string} publicId - The Cloudinary public_id
 * @param {string} resourceType - 'raw', 'image', or 'video'
 * @returns {Promise<Object>}
 */
const deleteFile = async (publicId, resourceType = 'raw') => {
    const cleanPublicId = String(publicId || '').trim();
    if (!cleanPublicId) return null;

    try {
        const result = await cloudinary.uploader.destroy(cleanPublicId, {
            resource_type: resourceType,
            invalidate: true
        });
        return result;
    } catch (error) {
        console.error(`Cloudinary deletion failed for ${cleanPublicId} (${resourceType}):`, error.message);
        throw error;
    }
};

module.exports = {
    uploadBuffer,
    deleteFile
};
