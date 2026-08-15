// const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const extractTextFromResponse = (payload) => {
    if (payload.choices && Array.isArray(payload.choices) && payload.choices.length > 0) {
        const message = payload.choices[0].message;
        if (message && typeof message.content === 'string') {
            return message.content.trim();
        }
    }
    return '';
};

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

const askStudyAssistant = async (req, res) => {
    try {
        const { message, pageContext, history } = req.body;
        const cleanMessage = typeof message === 'string' ? message.trim() : '';

        if (!cleanMessage) {
            return res.status(400).json({ success: false, message: 'Please ask the AI a question first.' });
        }

        if (cleanMessage.length > 1500) {
            return res.status(400).json({ success: false, message: 'Please keep your question under 1500 characters.' });
        }

        if (!process.env.DEEPSEEK_API_KEY) {
            return res.status(503).json({
                success: false,
                setupRequired: true,
                message: 'AI is not configured yet. Add DEEPSEEK_API_KEY to your .env file and restart the server.'
            });
        }

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are ExamVault AI, a calm and practical study assistant for competitive exam students. Help with doubts, revision plans, paper strategy, topic summaries, and next-step practice. Keep answers concise, exam-focused, and encouraging. Do not claim to read PDFs directly. If the student asks about a PDF, ask them to paste the question text. For math or science doubts, show steps clearly. For plans, use short bullet points.'
                    },
                    {
                        role: 'user',
                        content: buildAssistantInput({ message: cleanMessage, pageContext, history, user: req.user })
                    }
                ],
                max_tokens: 700,
                temperature: 0.7
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const apiMessage = payload.error?.message || 'AI request failed. Please try again.';
            return res.status(response.status).json({ success: false, message: apiMessage });
        }

        const answer = extractTextFromResponse(payload);

        if (!answer) {
            return res.status(502).json({ success: false, message: 'AI returned an empty answer. Please try again.' });
        }

        res.status(200).json({ success: true, answer });
    } catch (error) {
        console.error('AI assistant error:', error.message);
        res.status(500).json({ success: false, message: 'AI assistant is temporarily unavailable.' });
    }
};

module.exports = { askStudyAssistant };
