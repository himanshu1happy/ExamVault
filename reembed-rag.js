/**
 * reembed-rag.js
 * 
 * Administrative CLI script to loop through all papers in MongoDB
 * and execute complete RAG indexing for both Question & Solution PDFs.
 * 
 * Usage:
 *   node reembed-rag.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Paper = require('./server/models/Paper');
const Chunk = require('./server/models/Chunk');
const { indexPaper } = require('./server/services/indexPaper');

if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is missing from environment variables.');
    process.exit(1);
}

const runReembedAll = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.\n');

        const papers = await Paper.find({}).sort({ createdAt: -1 });
        console.log(`Found ${papers.length} paper(s) to index.\n`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < papers.length; i++) {
            const paper = papers[i];
            console.log(`[${i + 1}/${papers.length}] Indexing: "${paper.title}" (${paper._id})...`);

            const result = await indexPaper(paper._id, {});

            if (result.success) {
                successCount++;
                const count = await Chunk.countDocuments({ paperId: paper._id });
                console.log(`    --> Success! ${count} chunk(s) stored.`);
            } else {
                failCount++;
                console.error(`    --> Failed: ${result.error || result.message}`);
            }
        }

        console.log('\n====================================');
        console.log('RAG Re-embedding Summary:');
        console.log(`  Total Papers:   ${papers.length}`);
        console.log(`  Successful:     ${successCount}`);
        console.log(`  Failed:         ${failCount}`);
        console.log('====================================\n');
    } catch (err) {
        console.error('Fatal re-embed error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

runReembedAll();
