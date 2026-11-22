const Paper = require('../models/Paper');
const Chunk = require('../models/Chunk');
const { extractPdfPages } = require('./pdfText');
const { splitByQuestions } = require('./chunker');
const { embedDocuments } = require('./embeddings');

// In-memory guard so only one indexing job per paper runs at a time
const activeIndexingJobs = new Set();

/**
 * Check if a paper is currently undergoing RAG indexing.
 * @param {string|mongoose.Types.ObjectId} paperId
 * @returns {boolean}
 */
const isPaperIndexing = (paperId) => {
    return activeIndexingJobs.has(String(paperId));
};

/**
 * Downloads a file buffer from a remote URL.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
const downloadBufferFromUrl = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download PDF from URL (${response.status}): ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

/**
 * Process a single PDF buffer into embedded chunk documents.
 * 
 * @param {Buffer} buffer
 * @param {string|mongoose.Types.ObjectId} paperId
 * @param {'question'|'solution'} kind
 * @returns {Promise<Array<Object>>}
 */
const processPdfToChunks = async (buffer, paperId, kind) => {
    if (!buffer || !Buffer.isBuffer(buffer)) return [];

    const pages = await extractPdfPages(buffer);
    const chunks = splitByQuestions(pages);

    if (chunks.length === 0) return [];

    const texts = chunks.map(c => c.text);
    const embeddings = await embedDocuments(texts);

    return chunks.map((c, idx) => ({
        paperId,
        kind,
        questionNo: typeof c.questionNo === 'number' ? c.questionNo : undefined,
        section: c.section || undefined,
        text: c.text,
        embedding: embeddings[idx] || [],
        pageNumber: c.page,
        createdAt: new Date()
    }));
};

/**
 * Index a paper's Question PDF and Solution PDF:
 * - Sets paper.ragStatus to 'pending'
 * - Extracts, chunks, and embeds both PDFs
 * - Deletes old chunks for this paper
 * - Inserts new chunks into Chunk collection
 * - Sets paper.ragStatus to 'ready' (or 'failed' on error)
 * - Guards against concurrent runs for the same paper
 * - Never throws out of the background job
 * 
 * @param {string|mongoose.Types.ObjectId} paperId
 * @param {Object} options - { questionBuffer, solutionBuffer }
 * @returns {Promise<Object>} Summary of indexing outcome
 */
const indexPaper = async (paperId, options = {}) => {
    const paperIdStr = String(paperId);

    // 1. In-memory concurrency guard
    if (activeIndexingJobs.has(paperIdStr)) {
        console.warn(`[indexPaper] Indexing is already running for paper: ${paperIdStr}`);
        return { success: false, skipped: true, message: 'Indexing already in progress.' };
    }

    activeIndexingJobs.add(paperIdStr);

    try {
        console.log(`[indexPaper] Starting RAG indexing for paper: ${paperIdStr}`);

        // 2. Mark status as pending
        await Paper.findByIdAndUpdate(paperId, {
            ragStatus: 'pending',
            ragError: ''
        });

        // 3. Retrieve Paper metadata if buffers are missing
        let questionBuffer = options.questionBuffer || null;
        let solutionBuffer = options.solutionBuffer || null;

        if (!questionBuffer || !solutionBuffer) {
            const paperDoc = await Paper.findById(paperId).select('pdfUrl solutionUrl');
            if (!paperDoc) {
                throw new Error(`Paper ${paperIdStr} not found in database.`);
            }

            if (!questionBuffer && paperDoc.pdfUrl) {
                console.log(`[indexPaper] Fetching question PDF for ${paperIdStr}...`);
                questionBuffer = await downloadBufferFromUrl(paperDoc.pdfUrl);
            }

            if (!solutionBuffer && paperDoc.solutionUrl) {
                console.log(`[indexPaper] Fetching solution PDF for ${paperIdStr}...`);
                solutionBuffer = await downloadBufferFromUrl(paperDoc.solutionUrl).catch((err) => {
                    console.warn(`[indexPaper] Solution PDF download skipped (${err.message}).`);
                    return null;
                });
            }
        }

        const newChunks = [];

        // 4. Process Question PDF
        if (questionBuffer) {
            console.log(`[indexPaper] Processing question PDF for paper ${paperIdStr}...`);
            const questionChunks = await processPdfToChunks(questionBuffer, paperId, 'question');
            newChunks.push(...questionChunks);
            console.log(`[indexPaper] Created ${questionChunks.length} question chunks.`);
        }

        // 5. Process Solution PDF
        if (solutionBuffer) {
            console.log(`[indexPaper] Processing solution PDF for paper ${paperIdStr}...`);
            const solutionChunks = await processPdfToChunks(solutionBuffer, paperId, 'solution');
            newChunks.push(...solutionChunks);
            console.log(`[indexPaper] Created ${solutionChunks.length} solution chunks.`);
        }

        // 6. Insert new chunks first and delete old chunks afterwards (prevents AI seeing empty paper)
        const oldChunkIds = await Chunk.find({ paperId }).select('_id').lean();

        if (newChunks.length > 0) {
            await Chunk.insertMany(newChunks);
        }

        if (oldChunkIds.length > 0) {
            const idsToDelete = oldChunkIds.map(doc => doc._id);
            await Chunk.deleteMany({ _id: { $in: idsToDelete } });
        }

        // 7. Update Paper status to 'ready'
        await Paper.findByIdAndUpdate(paperId, {
            ragStatus: 'ready',
            ragError: '',
            ragChunkCount: newChunks.length
        });

        console.log(`[indexPaper] Successfully completed RAG indexing for paper ${paperIdStr} (${newChunks.length} total chunks).`);
        return {
            success: true,
            totalChunks: newChunks.length
        };
    } catch (error) {
        console.error(`[indexPaper] Indexing failed for paper ${paperIdStr}:`, error.message);

        // Record failure in Paper model without throwing
        await Paper.findByIdAndUpdate(paperId, {
            ragStatus: 'failed',
            ragError: error.message || 'Unknown RAG indexing error'
        }).catch((dbErr) => {
            console.error(`[indexPaper] Failed to update ragStatus to failed for paper ${paperIdStr}:`, dbErr.message);
        });

        return {
            success: false,
            error: error.message
        };
    } finally {
        activeIndexingJobs.delete(paperIdStr);
    }
};

module.exports = {
    indexPaper,
    isPaperIndexing
};
