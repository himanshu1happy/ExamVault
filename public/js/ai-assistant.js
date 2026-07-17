/* ExamVault AI Study Assistant fallback launcher.
   Kept separate from the main script so it remains available if another page feature fails. */
(function () {
    'use strict';

    const authPages = new Set([
        'login.html',
        'signup.html',
        'forgot-password.html',
        'reset-password.html'
    ]);
    const pageName = window.location.pathname.split('/').pop() || 'index.html';

    if (authPages.has(pageName)) return;

    function getStoredUser() {
        try {
            const storedUser = localStorage.getItem('examvault_user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    }

    function initAssistant() {
        if (document.getElementById('ai-assistant-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'ai-assistant-widget';
        widget.className = 'ai-assistant-widget';
        widget.innerHTML = `
            <button class="ai-assistant-launcher" id="ai-assistant-launcher" type="button" aria-label="Open AI Study Assistant" aria-expanded="false">
                <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
                <span>Ask AI</span>
            </button>
            <section class="ai-assistant-panel" id="ai-assistant-panel" aria-label="AI Study Assistant" hidden>
                <div class="ai-assistant-header">
                    <div>
                        <p>ExamVault AI</p>
                        <h2>Study Assistant</h2>
                    </div>
                    <button type="button" class="ai-assistant-close" id="ai-assistant-close" aria-label="Close AI Study Assistant">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="ai-assistant-suggestions" aria-label="Suggested AI prompts">
                    <button type="button" data-ai-prompt="Make a 7 day revision plan for my target exam.">Revision plan</button>
                    <button type="button" data-ai-prompt="Explain how I should analyze previous year papers effectively.">Paper strategy</button>
                    <button type="button" data-ai-prompt="Give me a quick formula and concept checklist for this subject.">Checklist</button>
                </div>
                <div class="ai-assistant-messages" id="ai-assistant-messages" aria-live="polite"></div>
                <form class="ai-assistant-form" id="ai-assistant-form">
                    <textarea id="ai-assistant-input" rows="2" maxlength="1500" placeholder="Ask a doubt, request a plan, or paste a question..."></textarea>
                    <button type="submit" aria-label="Send question to AI"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
                </form>
            </section>
        `;
        document.body.appendChild(widget);

        const launcher = widget.querySelector('#ai-assistant-launcher');
        const panel = widget.querySelector('#ai-assistant-panel');
        const closeButton = widget.querySelector('#ai-assistant-close');
        const form = widget.querySelector('#ai-assistant-form');
        const input = widget.querySelector('#ai-assistant-input');
        const messages = widget.querySelector('#ai-assistant-messages');
        const submitButton = form.querySelector('button');
        const conversation = [];

        function addMessage(role, text) {
            const message = document.createElement('div');
            message.className = `ai-message ${role}`;
            message.textContent = text;
            messages.appendChild(message);
            messages.scrollTop = messages.scrollHeight;
            return message;
        }

        function openAssistant() {
            panel.hidden = false;
            launcher.setAttribute('aria-expanded', 'true');

            if (!messages.dataset.ready) {
                messages.dataset.ready = 'true';
                const user = getStoredUser();
                addMessage(
                    'assistant',
                    user
                        ? `Hi ${user.fullname || 'there'}, I can help with doubts, study plans, summaries, and paper strategy.`
                        : 'Sign in to use the AI Study Assistant.'
                );
            }

            window.setTimeout(() => input.focus(), 50);
        }

        function closeAssistant() {
            panel.hidden = true;
            launcher.setAttribute('aria-expanded', 'false');
        }

        function getPageContext() {
            return {
                pageTitle: document.title,
                page: pageName,
                heading: document.querySelector('h1')?.textContent.trim(),
                paperTitle: document.getElementById('dynamic-paper-title')?.textContent.trim(),
                paperDetails: document.getElementById('dynamic-paper-details')?.innerText.replace(/\s+/g, ' ').trim(),
                paperSearch: document.getElementById('paper-search-input')?.value.trim()
            };
        }

        async function askAssistant(prompt) {
            const question = prompt.trim();
            if (!question) return;

            const authToken = localStorage.getItem('examvault_token');
            const user = getStoredUser();
            if (!authToken || !user) {
                addMessage('assistant', 'Please sign in first, then I can help you with AI-powered study support.');
                return;
            }

            conversation.push({ role: 'user', text: question });
            addMessage('user', question);
            input.value = '';
            input.disabled = true;
            submitButton.disabled = true;
            const thinkingMessage = addMessage('assistant', 'Thinking...');

            try {
                const response = await fetch('http://localhost:5001/api/ai/study-assistant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        message: question,
                        pageContext: getPageContext(),
                        history: conversation.slice(-6)
                    })
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'AI could not answer right now.');
                }

                conversation.push({ role: 'assistant', text: data.answer });
                thinkingMessage.textContent = data.answer;
            } catch (error) {
                thinkingMessage.textContent = error.message || 'AI assistant is unavailable right now.';
            } finally {
                input.disabled = false;
                submitButton.disabled = false;
                input.focus();
            }
        }

        launcher.addEventListener('click', () => {
            if (panel.hidden) openAssistant();
            else closeAssistant();
        });
        closeButton.addEventListener('click', closeAssistant);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            askAssistant(input.value);
        });
        widget.querySelectorAll('[data-ai-prompt]').forEach((button) => {
            button.addEventListener('click', () => {
                openAssistant();
                askAssistant(button.dataset.aiPrompt || '');
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAssistant, { once: true });
    } else {
        initAssistant();
    }
}());
