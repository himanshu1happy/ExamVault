const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI with the stable model to avoid 404 issues
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
        const { message, pageContext, history } = req.body;
        const cleanMessage = typeof message === 'string' ? message.trim() : '';

        // Validate input
        if (!cleanMessage) {
            return res.status(400).json({ success: false, message: 'Please ask the AI a question first.' });
        }

        if (cleanMessage.length > 1500) {
            return res.status(400).json({ success: false, message: 'Please keep your question under 1500 characters.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                setupRequired: true,
                message: 'AI is not configured yet. Add GEMINI_API_KEY to your .env file and restart the server.'
            });
        }

        // Build prompt with system instruction
        const systemPrompt = 'You are ExamVault AI, a calm and practical study assistant for competitive exam students. Help with doubts, revision plans, paper strategy, topic summaries, and next-step practice. Keep answers concise, exam-focused, and encouraging. Do not claim to read PDFs directly. If the student asks about a PDF, ask them to paste the question text. For math or science doubts, show steps clearly. For plans, use short bullet points.';
        const fullPrompt = `${systemPrompt}\n\n${buildAssistantInput({ message: cleanMessage, pageContext, history, user: req.user })}`;

        // Call Gemini API
        const result = await model.generateContent(fullPrompt);
        const answer = extractTextFromResponse(result.response);

        if (!answer) {
            return res.status(502).json({ success: false, message: 'AI returned an empty answer. Please try again.' });
        }

        res.status(200).json({ success: true, answer });
    } catch (error) {
        console.error('AI assistant error:', error.message);
        
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({ success: false, message: 'Rate limit exceeded. Try again in a moment. (Limit: 15 req/min)' });
        }
        
        res.status(500).json({ success: false, message: 'AI assistant is temporarily unavailable.' });
    }
};

module.exports = { askStudyAssistant };
