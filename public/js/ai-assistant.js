/* =========================================================
   ExamVault AI Study Assistant Widget
   Dual-PDF RAG & Step-by-Step Solution Explainer
   ========================================================= */

(function () {
    'use strict';

    const API_ORIGIN = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
        ? window.location.origin
        : '';

    const authPages = new Set([
        'login.html',
        'signup.html',
        'forgot-password.html',
        'reset-password.html'
    ]);
    const pageName = window.location.pathname.split('/').pop() || 'index.html';

    // Do not mount widget on authentication pages
    if (authPages.has(pageName)) return;

    // Detect if current page is a paper page (solution.html or exam.html)
    const paperPages = new Set(['solution.html', 'exam.html']);
    const isPaperPage = paperPages.has(pageName);

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
                ${isPaperPage ? `
                <div class="ai-assistant-suggestions" id="ai-assistant-suggestions" aria-label="Suggested AI prompts">
                    <button type="button" data-ai-prompt="Explain question 1 step-by-step from the official solution.">Explain Q1</button>
                    <button type="button" data-ai-prompt="What core formulas and concepts are used in this paper?">Core concepts</button>
                    <button type="button" data-ai-prompt="Summarize the key solution steps for this paper.">Solution summary</button>
                </div>
                <div class="ai-assistant-messages" id="ai-assistant-messages" aria-live="polite"></div>
                <form class="ai-assistant-form" id="ai-assistant-form">
                    <textarea id="ai-assistant-input" rows="2" maxlength="1500" placeholder="Ask about any question (e.g., Explain Q5)..."></textarea>
                    <button type="submit" aria-label="Send question to AI"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
                </form>
                ` : `
                <div class="ai-assistant-messages" id="ai-assistant-messages" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem 1.5rem; flex: 1;">
                    <i class="fa-solid fa-file-circle-question" style="font-size: 3rem; color: var(--primary, #6c5ce7); margin-bottom: 1.25rem;"></i>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; color: var(--text);">Open a Paper First</h3>
                    <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-muted, #a29bfe); margin: 0 0 1.5rem 0;">
                        To get step-by-step verified explanations and solution-based AI help, please open a question paper on the Solution or Exam page.
                    </p>
                    <a href="papers.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; text-decoration: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600;">
                        <i class="fa-solid fa-book-open"></i> Browse Question Papers
                    </a>
                </div>
                `}
            </section>
        `;

        document.body.appendChild(widget);

        const launcher = widget.querySelector('#ai-assistant-launcher');
        const panel = widget.querySelector('#ai-assistant-panel');
        const closeButton = widget.querySelector('#ai-assistant-close');
        const messages = widget.querySelector('#ai-assistant-messages');
        const form = widget.querySelector('#ai-assistant-form');
        const input = widget.querySelector('#ai-assistant-input');
        const submitButton = form ? form.querySelector('button') : null;

        // In-memory conversation history: array of { role: 'user'|'assistant', text: string }
        const conversationHistory = [];

        /**
         * Appends a message to the stream.
         * Uses textContent to prevent XSS and preserves line breaks with pre-wrap.
         */
        function addMessage(role, text, metadata = null) {
            if (!messages) return null;

            const messageContainer = document.createElement('div');
            messageContainer.className = `ai-message ${role}`;

            const textEl = document.createElement('div');
            textEl.className = 'ai-message-text';
            textEl.style.whiteSpace = 'pre-wrap';
            textEl.style.wordBreak = 'break-word';
            textEl.textContent = text;
            messageContainer.appendChild(textEl);

            // Render source badge & citations under assistant responses
            if (role === 'assistant' && metadata && metadata.source) {
                const metaContainer = document.createElement('div');
                metaContainer.className = 'ai-message-meta';
                metaContainer.style.display = 'flex';
                metaContainer.style.alignItems = 'center';
                metaContainer.style.gap = '0.5rem';
                metaContainer.style.marginTop = '0.45rem';
                metaContainer.style.flexWrap = 'wrap';

                const badge = document.createElement('span');
                badge.className = `ai-source-badge badge-${metadata.source}`;
                badge.style.display = 'inline-block';
                badge.style.padding = '2px 8px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '0.72rem';
                badge.style.fontWeight = '600';

                if (metadata.source === 'solution') {
                    badge.textContent = 'From official solution';
                    badge.style.background = 'rgba(0, 184, 148, 0.15)';
                    badge.style.color = '#00b894';
                    badge.style.border = '1px solid rgba(0, 184, 148, 0.5)';
                } else {
                    badge.textContent = 'AI-generated';
                    badge.style.background = 'rgba(253, 203, 110, 0.15)';
                    badge.style.color = '#fdcb6e';
                    badge.style.border = '1px solid rgba(253, 203, 110, 0.5)';
                }
                metaContainer.appendChild(badge);

                if (Array.isArray(metadata.citations) && metadata.citations.length > 0) {
                    const citEl = document.createElement('span');
                    citEl.className = 'ai-citations';
                    citEl.style.fontSize = '0.72rem';
                    citEl.style.color = 'var(--text-muted, #a29bfe)';

                    const labels = metadata.citations.map(c => {
                        const parts = [];
                        if (c.questionNo) parts.push(`Q${c.questionNo}`);
                        if (c.page) parts.push(`page ${c.page}`);
                        return parts.join(', ');
                    }).filter(Boolean);

                    if (labels.length > 0) {
                        citEl.textContent = `[${labels.join('; ')}]`;
                        metaContainer.appendChild(citEl);
                    }
                }

                messageContainer.appendChild(metaContainer);
            }

            messages.appendChild(messageContainer);
            messages.scrollTop = messages.scrollHeight;
            return messageContainer;
        }

        function openAssistant() {
            panel.hidden = false;
            launcher.setAttribute('aria-expanded', 'true');

            if (isPaperPage && !messages.dataset.ready) {
                messages.dataset.ready = 'true';
                const user = getStoredUser();
                addMessage(
                    'assistant',
                    user
                        ? `Hi ${user.fullname || 'Student'}! Ask me about any question from this paper (e.g. "Explain Q17") or for concept explanations.`
                        : 'Sign in to use the AI Study Assistant for step-by-step verified explanations.'
                );
            }

            if (input) {
                window.setTimeout(() => input.focus(), 50);
            }
        }

        function closeAssistant() {
            panel.hidden = true;
            launcher.setAttribute('aria-expanded', 'false');
        }

        function getPageContext() {
            return {
                pageTitle: document.title,
                page: pageName,
                paperTitle: document.getElementById('dynamic-paper-title')?.textContent.trim() || '',
                paperDetails: document.getElementById('dynamic-paper-details')?.innerText.replace(/\s+/g, ' ').trim() || ''
            };
        }

        async function askAssistant(promptText) {
            const question = promptText.trim();
            if (!question) return;

            const authToken = localStorage.getItem('examvault_token');
            const user = getStoredUser();

            if (!authToken || !user) {
                addMessage('assistant', 'Please sign in first to ask doubts and receive AI-powered solutions.');
                return;
            }

            // Append user question
            conversationHistory.push({ role: 'user', text: question });
            addMessage('user', question);

            if (input) input.value = '';
            if (input) input.disabled = true;
            if (submitButton) submitButton.disabled = true;

            const thinkingMessage = addMessage('assistant', 'Analyzing official solution and thinking...');

            // Retrieve paperId from URL (?id=...)
            const urlParams = new URLSearchParams(window.location.search);
            const currentPaperId = urlParams.get('id') || null;

            try {
                const response = await fetch(`${API_ORIGIN}/api/ai/study-assistant`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        message: question,
                        paperId: currentPaperId,
                        history: conversationHistory.slice(-6),
                        pageContext: getPageContext()
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'The AI assistant is temporarily unavailable.');
                }

                // Remove placeholder thinking bubble
                thinkingMessage.remove();

                // Append assistant response with source badge & citations
                addMessage('assistant', data.answer, {
                    source: data.source,
                    citations: data.citations
                });

                conversationHistory.push({ role: 'assistant', text: data.answer });
            } catch (error) {
                thinkingMessage.remove();
                addMessage('assistant', error.message || 'AI assistant is unavailable right now.');
            } finally {
                if (input) input.disabled = false;
                if (submitButton) submitButton.disabled = false;
                if (input) input.focus();
            }
        }

        launcher.addEventListener('click', () => {
            if (panel.hidden) openAssistant();
            else closeAssistant();
        });

        closeButton.addEventListener('click', closeAssistant);

        if (form && input) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                askAssistant(input.value);
            });
        }

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
