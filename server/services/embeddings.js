const { GoogleGenAI } = require('@google/genai');

/**
 * Returns a configured GoogleGenAI client using GEMINI_API_KEY.
 */
const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Returns the Gemini embedding model name.
 */
const getEmbeddingModel = () => {
    return process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
};

/**
 * Normalises a vector to unit length (Euclidean / L2 norm = 1.0).
 * With unit vectors, cosine similarity equals the simple dot product: sum(u_i * v_i).
 * 
 * @param {number[]} vector
 * @returns {number[]}
 */
const normalizeVector = (vector) => {
    if (!Array.isArray(vector) || vector.length === 0) return [];

    let sumSquares = 0;
    for (let i = 0; i < vector.length; i++) {
        sumSquares += vector[i] * vector[i];
    }

    const magnitude = Math.sqrt(sumSquares);
    if (magnitude === 0) return vector;

    return vector.map(val => val / magnitude);
};

/**
 * Executes an async task with up to maxRetries attempts and exponential backoff.
 * 
 * @param {Function} fn
 * @param {number} maxRetries
 * @returns {Promise<any>}
 */
const withRetry = async (fn, maxRetries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries) break;
            const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
            console.warn(`[Embeddings] Attempt ${attempt} failed (${error.message}). Retrying in ${Math.round(delay)}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw lastError;
};

/**
 * Embeds an array of document texts in batches of 50 using Gemini API.
 * Vectors are normalised to unit length.
 * 
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
const embedDocuments = async (texts) => {
    if (!Array.isArray(texts) || texts.length === 0) return [];

    const ai = getClient();
    const model = getEmbeddingModel();
    const batchSize = 20;
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const batchEmbeddings = await withRetry(async () => {
            const response = await ai.models.embedContent({
                model,
                contents: batch,
                config: {
                    taskType: 'RETRIEVAL_DOCUMENT',
                    outputDimensionality: 768
                }
            });

            let rawList = [];
            if (response && Array.isArray(response.embeddings)) {
                rawList = response.embeddings.map(e => e.values || e);
            } else if (response && response.embedding) {
                rawList = [response.embedding.values || response.embedding];
            } else {
                throw new Error('Unexpected response format from Gemini embedding API.');
            }

            return rawList.map(vec => normalizeVector(vec));
        });

        allEmbeddings.push(...batchEmbeddings);

        // Wait about 1 second between batches to avoid Gemini rate limits
        if (i + batchSize < texts.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return allEmbeddings;
};

/**
 * Embeds a single query string for semantic similarity matching.
 * Vector is normalised to unit length.
 * 
 * @param {string} text
 * @returns {Promise<number[]>}
 */
const embedQuery = async (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Query text must be a non-empty string.');
    }

    const ai = getClient();
    const model = getEmbeddingModel();

    return await withRetry(async () => {
        const response = await ai.models.embedContent({
            model,
            contents: [text],
            config: {
                taskType: 'RETRIEVAL_QUERY',
                outputDimensionality: 768
            }
        });

        let rawVec = [];
        if (response && Array.isArray(response.embeddings) && response.embeddings[0]) {
            rawVec = response.embeddings[0].values || response.embeddings[0];
        } else if (response && response.embedding) {
            rawVec = response.embedding.values || response.embedding;
        } else {
            throw new Error('Unexpected response format from Gemini query embedding API.');
        }

        return normalizeVector(rawVec);
    });
};

module.exports = {
    embedDocuments,
    embedQuery,
    normalizeVector
};
