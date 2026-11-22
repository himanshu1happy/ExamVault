/**
 * migrate-files.js
 * 
 * One-time migration inspection script.
 * Scans all existing papers in MongoDB and identifies papers whose
 * pdfUrl or solutionUrl are NOT hosted on Cloudinary (e.g. local /uploads/ URLs).
 * 
 * Usage:
 *   node migrate-files.js
 * 
 * Note: Does not delete or mutate any records or files.
 */

require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is missing from environment variables.');
    process.exit(1);
}

const paperSchema = new mongoose.Schema({
    title: String,
    examType: String,
    year: Number,
    subject: String,
    pdfUrl: String,
    solutionUrl: String,
    pdfPublicId: String,
    solutionPublicId: String
}, { strict: false });

const Paper = mongoose.models.Paper || mongoose.model('Paper', paperSchema);

const isCloudinaryUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

const runMigrationScan = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully.\n');

        const papers = await Paper.find({}).lean();
        console.log(`Scanned ${papers.length} paper(s) in database.\n`);

        const nonCloudinaryPapers = [];

        for (const paper of papers) {
            const hasNonCloudinaryPdf = paper.pdfUrl && !isCloudinaryUrl(paper.pdfUrl);
            const hasNonCloudinarySolution = paper.solutionUrl && !isCloudinaryUrl(paper.solutionUrl);

            if (hasNonCloudinaryPdf || hasNonCloudinarySolution) {
                nonCloudinaryPapers.push({
                    id: paper._id,
                    title: paper.title,
                    examType: paper.examType,
                    year: paper.year,
                    subject: paper.subject,
                    pdfUrl: paper.pdfUrl || '(none)',
                    solutionUrl: paper.solutionUrl || '(none)',
                    needsPdfReupload: Boolean(hasNonCloudinaryPdf),
                    needsSolutionReupload: Boolean(hasNonCloudinarySolution)
                });
            }
        }

        if (nonCloudinaryPapers.length === 0) {
            console.log('✅ All papers in the database already use Cloudinary URLs. No re-uploads needed.');
        } else {
            console.log(`⚠️  Found ${nonCloudinaryPapers.length} paper(s) with non-Cloudinary file URLs that need re-upload:\n`);
            nonCloudinaryPapers.forEach((p, idx) => {
                console.log(`[${idx + 1}] ID: ${p.id}`);
                console.log(`    Title:    ${p.title}`);
                console.log(`    Exam:     ${p.examType} (${p.year}) - Subject: ${p.subject}`);
                console.log(`    PDF URL:  ${p.pdfUrl} ${p.needsPdfReupload ? '--> [NEEDS RE-UPLOAD]' : ''}`);
                console.log(`    Sol URL:  ${p.solutionUrl} ${p.needsSolutionReupload ? '--> [NEEDS RE-UPLOAD]' : ''}`);
                console.log('------------------------------------------------------------');
            });
            console.log(`\nSummary: ${nonCloudinaryPapers.length} paper(s) need manual re-upload to Cloudinary.`);
        }
    } catch (err) {
        console.error('Migration scan error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDatabase connection closed.');
    }
};

runMigrationScan();
