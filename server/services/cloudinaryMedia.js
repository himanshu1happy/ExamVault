const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');

const RAW_RESOURCE_TYPE = 'raw';
const MEDIA_FOLDER = 'ExamVault_Vault';

const requireUploadResult = (result) => {
    const url = String(result?.secure_url || result?.url || '').trim();
    const publicId = String(result?.public_id || '').trim();

    if (!url || !publicId) {
        throw new Error('Cloudinary did not return a URL and public ID for the uploaded file.');
    }

    return { url, publicId };
};

const uploadRawBuffer = (buffer, { folder, filename, publicId, format } = {}) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return Promise.reject(new Error('Cannot upload an empty file to Cloudinary.'));
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: RAW_RESOURCE_TYPE,
                folder: folder || MEDIA_FOLDER,
                public_id: publicId,
                format,
                filename_override: filename,
                use_filename: !publicId,
                unique_filename: !publicId,
                overwrite: false
            },
            (error, result) => {
                if (error) return reject(error);
                try {
                    resolve(requireUploadResult(result));
                } catch (validationError) {
                    reject(validationError);
                }
            }
        );

        stream.end(buffer);
    });
};

const uploadPdf = (file, kind) => uploadRawBuffer(file?.buffer, {
    folder: `${MEDIA_FOLDER}/${kind}`,
    filename: file?.originalname || `${kind}.pdf`,
    publicId: `${kind}-${crypto.randomUUID()}`,
    format: 'pdf'
});

const uploadRagAsset = (chunks) => {
    const payload = Buffer.from(JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        chunks
    }), 'utf8');

    return uploadRawBuffer(payload, {
        folder: `${MEDIA_FOLDER}/rag`,
        filename: 'rag-chunks.json',
        publicId: `rag-${crypto.randomUUID()}`,
        format: 'json'
    });
};

const destroyRawAsset = (publicId) => cloudinary.uploader.destroy(publicId, {
    resource_type: RAW_RESOURCE_TYPE,
    invalidate: true
});

module.exports = { uploadPdf, uploadRagAsset, destroyRawAsset };
