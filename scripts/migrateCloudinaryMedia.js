const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Paper = require('../server/models/Paper');
const { uploadPdf, uploadRagAsset } = require('../server/services/cloudinaryMedia');

const apply = process.argv.includes('--apply');
const uploadRoots = [
    path.join(__dirname, '..', 'public', 'uploads'),
    path.join(__dirname, '..', 'uploads')
];

const localUploadFilename = (url) => {
    const cleanUrl = String(url || '').split('?')[0].replace(/\\/g, '/');
    return cleanUrl.startsWith('/uploads/') ? path.basename(cleanUrl) : '';
};

const readLegacyUpload = async (url) => {
    const filename = localUploadFilename(url);
    if (!filename) return null;

    for (const root of uploadRoots) {
        const candidate = path.resolve(root, filename);
        if (!candidate.startsWith(`${root}${path.sep}`)) continue;
        try {
            return { buffer: await fs.readFile(candidate), originalname: filename };
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    return null;
};

const migrate = async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary credentials are required.');
    }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    let changed = 0;
    let skipped = 0;

    const cursor = Paper.collection.find({});
    for await (const paper of cursor) {
        const set = {};
        const unset = {};
        let needsUpdate = false;

        for (const item of [
            { urlField: 'pdfUrl', idField: 'pdfPublicId', folder: 'papers' },
            { urlField: 'solutionUrl', idField: 'solutionPublicId', folder: 'solutions' }
        ]) {
            if (paper[item.idField] || !localUploadFilename(paper[item.urlField])) continue;

            const file = await readLegacyUpload(paper[item.urlField]);
            if (!file) {
                console.warn(`Skipping missing legacy ${item.urlField} for paper ${paper._id}.`);
                skipped += 1;
                continue;
            }
            needsUpdate = true;

            if (apply) {
                const asset = await uploadPdf(file, item.folder);
                set[item.urlField] = asset.url;
                set[item.idField] = asset.publicId;
            } else {
                console.log(`[dry-run] Would upload ${item.urlField} for paper ${paper._id}.`);
            }
        }

        if (Array.isArray(paper.ragChunks) && paper.ragChunks.length) {
            needsUpdate = true;
            if (apply) {
                const asset = await uploadRagAsset(paper.ragChunks);
                set.ragAssetUrl = asset.url;
                set.ragAssetPublicId = asset.publicId;
                set.ragChunkCount = paper.ragChunks.length;
                set.ragEmbeddingModel = 'text-embedding-004';
                unset.ragChunks = '';
            } else {
                console.log(`[dry-run] Would upload ${paper.ragChunks.length} RAG chunks for paper ${paper._id}.`);
            }
        }

        if (needsUpdate) {
            changed += 1;
            if (apply) await Paper.collection.updateOne({ _id: paper._id }, { $set: set, $unset: unset });
        }
    }

    console.log(`${apply ? 'Migrated' : 'Found'} ${changed} paper(s); skipped ${skipped}.`);
    if (!apply) console.log('No data was changed. Re-run with --apply after reviewing this output.');
};

migrate()
    .catch(error => {
        console.error('Migration failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
