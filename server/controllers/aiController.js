const { GoogleGenerativeAI } = require('@google/generative-ai');
const Paper = require('../models/Paper');
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
// Hum Lite version use karenge jo high traffic mein bhi crash nahi hota!
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

// Extract text from Gemini response
const extractTextFromResponse = (response) => {
    if (response && response.text && typeof response.text === 'function') {
        return response.text().trim();
    }
    return '';
};

// Build context-aware prompt
const buildAssistantInput = ({ message, pageContext, history, user }) => {
    const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .filter((item) => item && item.role && item.text)
            .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'Student'}: ${String(item.text).slice(0, 900)}`)
            .join('\n')
        : '';

    const context = pageContext && typeof pageContext === 'object'
        ? Object.entries(pageContext)
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}: ${String(value).slice(0, 500)}`)
            .join('\n')
        : '';

    return [
        `Student name: ${user.fullname || 'Student'}`,
        context ? `Current page context:\n${context}` : '',
        recentHistory ? `Recent conversation:\n${recentHistory}` : '',
        `Student question:\n${message}`
    ].filter(Boolean).join('\n\n');
};

// Main AI assistant handler
const askStudyAssistant = async (req, res) => {
    try {
        const { message, pageContext, history, paperId } = req.body;
        const cleanMessage = typeof message === 'string' ? message.trim() : '';

        if (!cleanMessage) {
            return res.status(400).json({ success: false, message: 'Please ask the AI a question first.' });
        }

        let ragContextText = "";

        // --- RAG RETRIEVAL PIPELINE ---
        if (paperId) {
            const paper = await Paper.findById(paperId);
            
            if (paper && paper.ragChunks && paper.ragChunks.length > 0) {
                // 1. Embed the student's question
                const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
                const questionEmbeddingResult = await embeddingModel.embedContent(cleanMessage);
                const questionEmbedding = questionEmbeddingResult.embedding.values;

                // 2. Find the most mathematically similar chunk
                let bestMatch = null;
                let highestSimilarity = -1;

                for (const chunk of paper.ragChunks) {
                    const similarity = cosineSimilarity(questionEmbedding, chunk.embedding);
                    if (similarity > highestSimilarity) {
                        highestSimilarity = similarity;
                        bestMatch = chunk;
                    }
                }

                // 3. Set a similarity threshold (e.g., 0.5) to ensure relevance
                if (bestMatch && highestSimilarity > 0.5) {
                    ragContextText = bestMatch.text;
                }
            }
        }

        // --- AUGMENTED GENERATION ---
        const systemPrompt = ragContextText 
            ? `You are an expert tutor. Using ONLY the provided Verified Solution Extract below, explain the step-by-step process to arrive at the answer. Do not use outside knowledge. If the extract does not contain the answer, politely say so.\n\nVerified Solution Extract:\n"""\n${ragContextText}\n"""` 
            : 'You are ExamVault AI, a calm and practical study assistant for competitive exam students. Help with doubts, revision plans, and paper strategy. Do not claim to read PDFs directly. For math or science doubts, show steps clearly.';

        const fullPrompt = `${systemPrompt}\n\n${buildAssistantInput({ message: cleanMessage, pageContext, history, user: req.user })}`;

        const result = await model.generateContent(fullPrompt);
        const answer = extractTextFromResponse(result.response);

        res.status(200).json({ success: true, answer });
    } catch (error) {
        console.error('AI assistant error:', error.message);
        res.status(500).json({ success: false, message: 'AI assistant is temporarily unavailable.' });
    }
};

module.exports = { askStudyAssistant };
