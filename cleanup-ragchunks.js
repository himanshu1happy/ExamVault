/**
 * cleanup-ragchunks.js
 * 
 * One-time database migration script to remove legacy embedded `ragChunks`
 * array from all Paper documents in MongoDB after migrating chunks to
 * the dedicated `Chunk` collection.
 * 
 * Usage:
 *   node cleanup-ragchunks.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is missing from environment variables.');
    process.exit(1);
}

const runCleanup = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        const result = await mongoose.connection.collection('papers').updateMany(
            {},
            { $unset: { ragChunks: "" } }
        );

        console.log(`\nSuccessfully stripped legacy ragChunks from ${result.modifiedCount} paper document(s).`);
    } catch (err) {
        console.error('Cleanup error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

runCleanup();
