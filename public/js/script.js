/* ========================================
   EXAMVAULT - Core Application Script
   Full-Stack API & Animation Integration
   ======================================== */

 document.addEventListener('DOMContentLoaded', () => {

    // Production API base URL
const API_BASE = 'https://examvault-live.onrender.com/api';

const token = localStorage.getItem('examvault_token');
const currentUser = JSON.parse(localStorage.getItem('examvault_user'));

    // ==========================================
    // 🌍 SYSTEM 1: ADAPTIVE GLOBAL THEME CONTROLLER
    // ==========================================
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Check local hardware cache configuration values
    const savedTheme = localStorage.getItem('examVaultTheme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (false && themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('examVaultTheme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (!themeToggle) return;
        const themeIcon = themeToggle.querySelector('i');
        if (!themeIcon) return;
        if (theme === 'dark') {
            themeIcon.className = 'fa-solid fa-sun';
        } else if (theme === 'reading') {
            themeIcon.className = 'fa-solid fa-book-open-reader';
        } else {
            themeIcon.className = 'fa-solid fa-moon';
        }
    }

    // ==========================================
    // 👤 SYSTEM 2: SECURE CLIENT-STATE SESSION MONITOR
    // ==========================================
    // ==========================================
    // 👤 SYSTEM 2: SECURE CLIENT-STATE SESSION MONITOR
    // ==========================================
    const profileSubsystem = document.getElementById('nav-profile-subsystem');

    if (profileSubsystem && currentUser) {
        
        // 1. Agar user 'admin' hai, toh ek special red button banega, warna khali rahega
        const adminButtonHTML = currentUser.role === 'admin' 
            ? `<a href="admin.html" class="btn-sm btn-outline" style="border-color: #ff4a4a; color: #ff4a4a; display: flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px;">
                 <i class="fa-solid fa-crown"></i> Admin
               </a>` 
            : '';

        // 2. Profile aur Logout ke sath Admin button ko inject kar do
        profileSubsystem.innerHTML = `
            ${adminButtonHTML}
            <a href="dashboard.html" class="btn-sm btn-filled" style="display: flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px;">
                <i class="fa-solid fa-circle-user" style="font-size: 1.1rem;"></i> Profile
            </a>
            <button id="nav-logout-action" class="btn-sm btn-outline" style="padding: 0.5rem 0.8rem; border-radius: 6px; cursor: pointer;">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        `;

        // Register logout logic
        document.getElementById('nav-logout-action').addEventListener('click', () => {
            localStorage.removeItem('examvault_token');
            localStorage.removeItem('examvault_user');
            window.location.href = 'index.html'; 
        });
    }

    document.querySelectorAll('[data-guest-only]').forEach((element) => {
        const isSignedIn = Boolean(currentUser);
        element.hidden = isSignedIn;
        element.style.display = isSignedIn ? 'none' : '';
    });
    
    
    
    // Core Mobile Hamburger Drawer toggler initialization logic
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (false && hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('open');
        });
    }

});

    // --- GLOBAL CONFIGURATION ---
    const API_BASE = 'https://examvault-live.onrender.com/api';
    const token = localStorage.getItem('examvault_token');
    const currentUser = JSON.parse(localStorage.getItem('examvault_user'));

    if (token && currentUser) {
        document.querySelectorAll('[data-guest-only]').forEach((element) => {
            element.hidden = true;
        });
    }

    // --- 1. LOADING SCREEN ---
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 600);
    }

    // --- 2. THEME MANAGEMENT (PERSISTENT) ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
    
    const themes = ['light', 'dark','reading'];
    const savedTheme = themes.includes(localStorage.getItem('examVaultTheme')) ? localStorage.getItem('examVaultTheme') : 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const currentIndex = themes.indexOf(currentTheme);
            const newTheme = themes[(currentIndex + 1) % themes.length];
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('examVaultTheme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        const themeLabels = {
            light: 'Light mode. Click for dark mode.',
            dark: 'Dark mode. Click for reading mode.',
            reading: 'Reading mode. Click for light mode.'
        };

        themeIcon.className = theme === 'dark'
            ? 'fa-solid fa-sun'
            : theme === 'reading'
                ? 'fa-solid fa-book-open-reader'
                : 'fa-solid fa-moon';

        themeToggle.setAttribute('aria-label', themeLabels[theme] || themeLabels.light);
        themeToggle.setAttribute('title', themeLabels[theme] || themeLabels.light);
    }

    // --- 3. MOBILE NAVIGATION & GLOBAL NAV STATE ---
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('open');
        });
    }

    // Sticky Navbar on Scroll
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Dynamic Navigation Content Updates based on Auth State
    const navActions = document.querySelector('.nav-actions');
    if (navActions && currentUser) {
        const signInBtn = navActions.querySelector('a[href="login.html"]');
        if (signInBtn) {
            signInBtn.href = "dashboard.html";
            signInBtn.innerText = "Dashboard";
            signInBtn.classList.replace('btn-nav-primary', 'btn-outline');
        }
    }

    // --- 3.a AI STUDY ASSISTANT WIDGET ---
    const showAIStudyAssistant = false; // Turn on when the AI assistant is ready for production.
    const authPageNames = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'];
    const currentPageName = window.location.pathname.split('/').pop() || 'index.html';

    if (showAIStudyAssistant && !authPageNames.includes(currentPageName)) {
        initAIStudyAssistant();
    }

    function initAIStudyAssistant() {
        if (document.getElementById('ai-assistant-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'ai-assistant-widget';
        widget.className = 'ai-assistant-widget';
        widget.innerHTML = `
            <button class="ai-assistant-launcher" id="ai-assistant-launcher" type="button" aria-label="Open AI Study Assistant">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>Ask AI</span>
            </button>
            <section class="ai-assistant-panel" id="ai-assistant-panel" aria-label="AI Study Assistant" hidden>
                <div class="ai-assistant-header">
                    <div>
                        <p>ExamVault AI</p>
                        <h2>Study Assistant</h2>
                    </div>
                    <button type="button" class="ai-assistant-close" id="ai-assistant-close" aria-label="Close AI Study Assistant">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="ai-assistant-suggestions" aria-label="Suggested AI prompts">
                    <button type="button" data-ai-prompt="Make a 7 day revision plan for my target exam.">Revision plan</button>
                    <button type="button" data-ai-prompt="Explain how I should analyze previous year papers effectively.">Paper strategy</button>
                    <button type="button" data-ai-prompt="Give me a quick formula and concept checklist for this subject.">Checklist</button>
                </div>
                <div class="ai-assistant-messages" id="ai-assistant-messages" aria-live="polite"></div>
                <form class="ai-assistant-form" id="ai-assistant-form">
                    <textarea id="ai-assistant-input" rows="2" placeholder="Ask a doubt, request a plan, or paste a question..."></textarea>
                    <button type="submit" aria-label="Send question to AI"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </section>
        `;

        document.body.appendChild(widget);

        const launcher = document.getElementById('ai-assistant-launcher');
        const panel = document.getElementById('ai-assistant-panel');
        const closeBtn = document.getElementById('ai-assistant-close');
        const form = document.getElementById('ai-assistant-form');
        const input = document.getElementById('ai-assistant-input');
        const messages = document.getElementById('ai-assistant-messages');
        const suggestionButtons = widget.querySelectorAll('[data-ai-prompt]');
        const conversation = [];

        const renderMessage = (role, text) => {
            const bubble = document.createElement('div');
            bubble.className = `ai-message ${role}`;
            bubble.textContent = text;
            messages.appendChild(bubble);
            messages.scrollTop = messages.scrollHeight;
            return bubble;
        };

        const openPanel = () => {
            panel.hidden = false;
            launcher.setAttribute('aria-expanded', 'true');

            if (!messages.dataset.ready) {
                messages.dataset.ready = 'true';
                if (token && currentUser) {
                    renderMessage('assistant', `Hi ${currentUser.fullname || 'there'}, I can help with doubts, study plans, summaries, and paper strategy.`);
                } else {
                    renderMessage('assistant', 'Sign in to use the AI Study Assistant. Your questions are sent securely through the ExamVault server.');
                }
            }

            setTimeout(() => input?.focus(), 50);
        };

        const closePanel = () => {
            panel.hidden = true;
            launcher.setAttribute('aria-expanded', 'false');
        };

        const getAIPageContext = () => {
            const paperTitle = document.getElementById('dynamic-paper-title')?.textContent.trim();
            const paperDetails = document.getElementById('dynamic-paper-details')?.innerText.replace(/\s+/g, ' ').trim();
            const paperSearch = document.getElementById('paper-search-input')?.value.trim();
            const pageHeading = document.querySelector('h1')?.textContent.trim();

            return {
                pageTitle: document.title,
                page: currentPageName,
                heading: pageHeading,
                paperTitle,
                paperDetails,
                paperSearch
            };
        };

        const askAI = async (prompt) => {
            const cleanPrompt = prompt.trim();
            if (!cleanPrompt) return;

            if (!token || !currentUser) {
                renderMessage('assistant', 'Please sign in first, then I can help you with AI-powered study support.');
                window.location.href = 'login.html';
                return;
            }

            conversation.push({ role: 'user', text: cleanPrompt });
            renderMessage('user', cleanPrompt);
            input.value = '';
            input.disabled = true;
            const submitBtn = form.querySelector('button');
            submitBtn.disabled = true;
            const thinkingBubble = renderMessage('assistant', 'Thinking...');

            try {
                const res = await fetch(`${API_BASE}/ai/study-assistant`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        message: cleanPrompt,
                        pageContext: getAIPageContext(),
                        history: conversation.slice(-6)
                    })
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'AI could not answer right now.');
                }

                conversation.push({ role: 'assistant', text: data.answer });
                thinkingBubble.textContent = data.answer;
            } catch (err) {
                thinkingBubble.textContent = err.message || 'AI assistant is unavailable right now.';
            } finally {
                input.disabled = false;
                submitBtn.disabled = false;
                input.focus();
            }
        };

        launcher.addEventListener('click', () => {
            if (panel.hidden) {
                openPanel();
            } else {
                closePanel();
            }
        });

        closeBtn.addEventListener('click', closePanel);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            askAI(input.value);
        });

        suggestionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                openPanel();
                askAI(button.dataset.aiPrompt || '');
            });
        });
    }

    // --- 4. AUTHENTICATION CONTROLS (LOGIN / SIGNUP) ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('examvault_token', data.token);
                    localStorage.setItem('examvault_user', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    alert(data.message || 'Authentication failed.');
                }
            } catch (err) {
                console.error('Server error during processing:', err);
            }
        });
    }

    // ==========================================
// 🔐 SYSTEM 3: ADVANCED OTP AUTHENTICATION
// ==========================================
const resetForm = document.getElementById('reset-form');
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const btn = resetForm.querySelector('button');
        const messageBox = document.getElementById('reset-message');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.textContent = data.message || 'Check your email for the reset link.';
            }
        } catch (err) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.textContent = 'Unable to send reset link. Please try again.';
            }
            console.error('Password reset request failed:', err);
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

const newPasswordForm = document.getElementById('new-password-form');
if (newPasswordForm) {
    newPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const resetToken = new URLSearchParams(window.location.search).get('token');
        const password = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const btn = newPasswordForm.querySelector('button');
        const messageBox = document.getElementById('new-password-message');
        const originalText = btn.innerHTML;

        if (!resetToken) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.textContent = 'Reset token is missing. Please request a new link.';
            }
            return;
        }

        if (password !== confirmPassword) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.textContent = 'Passwords do not match.';
            }
            return;
        }

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/auth/reset-password/${resetToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.textContent = data.message || 'Password updated.';
            }
            if (data.success) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } catch (err) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.textContent = 'Unable to update password. Please try again.';
            }
            console.error('Password reset failed:', err);
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

const signupForm = document.getElementById('signup-form');
const otpModal = document.getElementById('otp-modal');
const otpInput = document.getElementById('otp-input');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const otpEmailDisplay = document.getElementById('otp-email-display');

let pendingEmail = "";

// 1. Handle Signup Form Submit
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const btn = signupForm.querySelector('button');
        const originalText = btn.innerHTML;

        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...`;
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, email, password })
            });

            const data = await res.json();

            if (data.success) {
                pendingEmail = email;

                if (otpEmailDisplay) {
                    otpEmailDisplay.innerText = email;
                }

                if (otpModal) {
                    otpModal.style.display = 'flex';
                }
            } else {
                alert(data.message || 'Failed to send OTP.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error. Could not send OTP.');
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// 2. Handle OTP Verification Submit
if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', async () => {
        const otp = otpInput.value.trim();

        if (otp.length !== 6) {
            alert('Please enter a valid 6-digit OTP.');
            return;
        }

        const originalText = verifyOtpBtn.innerHTML;

        verifyOtpBtn.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
        verifyOtpBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pendingEmail,
                    otp
                })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('examvault_token', data.token);
                localStorage.setItem(
                    'examvault_user',
                    JSON.stringify(data.user)
                );

                verifyOtpBtn.innerHTML =
                    `<i class="fa-solid fa-check"></i> Verified Successfully!`;
                verifyOtpBtn.style.background = '#00b894';

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

            } else {
                alert(data.message || 'Invalid OTP.');

                verifyOtpBtn.innerHTML = originalText;
                verifyOtpBtn.disabled = false;
            }

        } catch (err) {
            console.error(err);
            alert('Error verifying OTP.');

            verifyOtpBtn.innerHTML = originalText;
            verifyOtpBtn.disabled = false;
        }
    });
}

    // --- 5. SOLUTIONS & INTERACTION API BAR ---
    const urlParams = new URLSearchParams(window.location.search);
    const currentPaperId = urlParams.get('id') || '60d5ec49c1851543b44b8b9a';
    const likeButton = document.getElementById('like-btn');
    const dislikeButton = document.getElementById('dislike-btn');

    const updateLikeButton = (isLiked, likesCount) => {
        if (!likeButton) return;
        const icon = likeButton.querySelector('i');
        const label = document.getElementById('like-text');
        const count = document.getElementById('likes-count');

        likeButton.dataset.liked = String(isLiked);
        if (icon) icon.className = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        if (label) label.textContent = isLiked ? 'Liked' : 'Like';
        if (count && likesCount !== undefined) count.textContent = `(${likesCount})`;
        likeButton.style.color = isLiked ? '#ff4757' : '';
        likeButton.style.borderColor = isLiked ? '#ff4757' : '';
    };

    const updateDislikeButton = (isDisliked) => {
        if (!dislikeButton) return;
        const icon = dislikeButton.querySelector('i');

        dislikeButton.dataset.disliked = String(isDisliked);
        if (icon) icon.className = isDisliked ? 'fa-solid fa-thumbs-down' : 'fa-regular fa-thumbs-down';
        dislikeButton.style.color = isDisliked ? '#ffa502' : '';
        dislikeButton.style.borderColor = isDisliked ? '#ffa502' : '';
    };

    const togglePaperReaction = async (event, reaction) => {
        event.preventDefault();
        event.stopPropagation();

        const button = reaction === 'like' ? likeButton : dislikeButton;
        if (!button) return;
        if (!token) return alert(`Please sign in to ${reaction} papers.`);

        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(`${API_BASE}/papers/${currentPaperId}/${reaction}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || `Paper could not be ${reaction}d`);
            }

            button.innerHTML = originalHTML;
            if (reaction === 'like') {
                updateLikeButton(data.isLiked, data.likesCount);
                if (data.isLiked) updateDislikeButton(false);
            } else {
                updateDislikeButton(data.isDisliked);
                if (data.isDisliked) updateLikeButton(false, data.likesCount);
            }
        } catch (err) {
            console.error(`${reaction} error:`, err);
            button.innerHTML = originalHTML;
            alert(err.message || `Paper could not be ${reaction}d.`);
        } finally {
            button.disabled = false;
        }
    };

    likeButton?.addEventListener('click', (event) => togglePaperReaction(event, 'like'));
    dislikeButton?.addEventListener('click', (event) => togglePaperReaction(event, 'dislike'));
    // --- 5.a SOLUTION PAGE DATA HYDRATION (solution.html) ---
    const isSolutionPage = window.location.pathname.includes('solution.html');

    if (isSolutionPage) {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/papers/${currentPaperId}`);
                const data = await res.json();

                if (data && data.success && data.data) {
                    const likes = Array.isArray(data.data.likes) ? data.data.likes : [];
                    const dislikes = Array.isArray(data.data.dislikes) ? data.data.dislikes : [];
                    const currentUserId = currentUser?.id || currentUser?._id;
                    const isLiked = currentUserId ? likes.some((userId) => String(userId) === String(currentUserId)) : false;
                    const isDisliked = currentUserId ? dislikes.some((userId) => String(userId) === String(currentUserId)) : false;

                    updateLikeButton(isLiked, likes.length);
                    updateDislikeButton(isDisliked);

                    // 1. Dynamic Title
                    const dynTitleEl = document.getElementById('dynamic-paper-title');
                    if (dynTitleEl) dynTitleEl.innerText = data.data.title;

                    // 2. Paper Details
                    const detailsContainer = document.getElementById('dynamic-paper-details');
                    if (detailsContainer) {
                        detailsContainer.innerHTML = `
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:.5rem;">
                                <span style="color:var(--text-muted);">Exam:</span>
                                <strong>${data.data.examType}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:.5rem;">
                                <span style="color:var(--text-muted);">Year:</span>
                                <strong>${data.data.year}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:.5rem;">
                                <span style="color:var(--text-muted);">Subject:</span>
                                <strong>${data.data.subject || 'N/A'}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;">
                                <span style="color:var(--text-muted);">Difficulty:</span>
                                <strong style="color:#fdcb6e;">${data.data.difficulty || 'Moderate'}</strong>
                            </div>
                        `;
                    }

                    // 3. Solution Video Button
                    const solutionBtn = document.getElementById('view-solution-btn');
                    if (solutionBtn && data.data.solutionUrl) {
                        solutionBtn.style.display = 'inline-flex';
                        solutionBtn.href = data.data.solutionUrl;
                    }

                    // 🚨 CORE FEATURE FIX: PDF VIEWER & DOWNLOAD BUTTON HYDRATION
                    const downloadBtn = document.getElementById('download-pdf-btn');
                    if (downloadBtn && data.data.pdfUrl) {
                        downloadBtn.href = data.data.pdfUrl; // Asli link button mein chala gaya
                    }

                    const iframe = document.getElementById('pdf-frame');
                    if (iframe && data.data.pdfUrl) {
                        iframe.src = data.data.pdfUrl; // Iframe mein PDF load ho gayi
                    }

                }
            } catch (err) {
                console.error('Failed to load solution data:', err);
            }
        })();
    }
   
    ///COMMENT SECTION
    const commentList = document.getElementById('comment-list');
    const commentCount = document.getElementById('comment-count');
    const postCommentBtn = document.getElementById('post-comment-btn');
    const commentInputArea = document.querySelector('.comment-input-area');
    const commentTextarea = document.getElementById('comment-body');
    const commentAvatar = document.querySelector('.comment-avatar');
    const isAdminUser = Boolean(currentUser && currentUser.role === 'admin');

    // CONDITIONAL UI: Lock comments for guests
    if (commentInputArea && !currentUser) {
        commentInputArea.innerHTML = `
            <div style="width: 100%; padding: 1.5rem; text-align: center; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px dashed var(--primary);">
                <p style="margin-bottom: 1rem; color: var(--text-muted);">Please sign in to ask a doubt or join the discussion.</p>
                <a href="login.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Sign In / Create Account</a>
            </div>
        `;
    } else if (commentAvatar && currentUser && currentUser.fullname) {
        commentAvatar.textContent = currentUser.fullname.charAt(0).toUpperCase();
    }
    
    // 🚨 ANTI-XSS FUNCTION: Yeh function har hacker ke code ko normal text bana dega
    const escapeHTML = (value) => {
        if (!value) return '';
        return String(value).replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    };

    const formatCommentDate = (value) => {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    async function loadComments() {
        if (!commentList) return;

        try {
            const res = await fetch(`${API_BASE}/papers/${currentPaperId}/comments`);
            const data = await res.json();

            if (data.success && data.data) {
                const comments = data.data || [];
                commentList.innerHTML = '';
                if (commentCount) commentCount.innerText = comments.length;

                if (comments.length === 0) {
                    commentList.innerHTML = '<div style="color: gray;">No comments yet. Be the first to ask a doubt!</div>';
                    return;
                }

                comments.forEach(comment => {
                    const date = new Date(comment.createdAt).toLocaleDateString();
                    
                    // 🚨 FILTER IN ACTION: HTML print hone se pehle text saaf ho raha hai
                    const safeName = escapeHTML(comment.userName);
                    const safeText = escapeHTML(comment.text);

                    // Ab yahan comment.text ki jagah safeText use karenge
                    commentList.insertAdjacentHTML('beforeend', `
                        <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; border-left: 3px solid var(--primary);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <strong style="color: var(--primary);">${safeName || 'Student'}</strong>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">${date}</span>
                            </div>
                            <div style="color: var(--text);">${safeText}</div>
                        </div>
                    `);
                });
            }
        } catch (err) {
            console.error('Error fetching data logs:', err);
        }
    }

    loadComments = async function() {
        if (!commentList) return;

        try {
            const res = await fetch(`${API_BASE}/papers/${currentPaperId}/comments`);
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Unable to load comments');
            }

            const comments = data.data || [];
            commentList.innerHTML = '';
            if (commentCount) commentCount.innerText = comments.length;

            if (comments.length === 0) {
                commentList.innerHTML = '<div style="color: gray;">No comments yet. Be the first to ask a doubt!</div>';
                return;
            }

            comments.forEach(comment => {
                const commentId = escapeHTML(comment._id);
                const replies = Array.isArray(comment.replies) ? comment.replies : [];
                const repliesHTML = replies.map(reply => `
                    <div style="margin-top: 0.75rem; margin-left: 1rem; padding: 0.85rem 1rem; border-left: 3px solid #00b894; background: rgba(0,184,148,0.08); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.35rem;">
                            <strong style="color: #00b894;">${escapeHTML(reply.userName || 'Admin')} ${reply.isAdmin ? '<span style="font-size: 0.75rem; color: var(--text-muted);">(Admin)</span>' : ''}</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${formatCommentDate(reply.createdAt)}</span>
                        </div>
                        <div style="color: var(--text);">${escapeHTML(reply.text)}</div>
                    </div>
                `).join('');

                const adminToolsHTML = isAdminUser ? `
                    <div style="display: flex; gap: 0.6rem; margin-top: 0.9rem; flex-wrap: wrap;">
                        <button type="button" class="comment-reply-toggle btn-sm btn-outline" data-comment-id="${commentId}" style="padding: 0.35rem 0.75rem; cursor: pointer;">
                            <i class="fa-solid fa-reply"></i> Reply
                        </button>
                        <button type="button" class="comment-delete-btn btn-sm btn-outline" data-comment-id="${commentId}" style="padding: 0.35rem 0.75rem; cursor: pointer; border-color: #ff4a4a; color: #ff4a4a;">
                            <i class="fa-solid fa-trash"></i> Remove
                        </button>
                    </div>
                    <form class="comment-reply-form" data-comment-id="${commentId}" style="display: none; margin-top: 0.9rem; flex-direction: column; gap: 0.6rem;">
                        <textarea name="replyText" placeholder="Write an admin reply..." required style="width: 100%; min-height: 70px; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.18); color: var(--text);"></textarea>
                        <div style="display: flex; gap: 0.6rem; justify-content: flex-end;">
                            <button type="button" class="comment-cancel-reply btn-sm btn-outline" style="padding: 0.4rem 0.8rem;">Cancel</button>
                            <button type="submit" class="btn-primary" style="padding: 0.4rem 1rem;">Post Reply</button>
                        </div>
                    </form>
                ` : '';

                commentList.insertAdjacentHTML('beforeend', `
                    <div data-comment-id="${commentId}" style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; border-left: 3px solid var(--primary);">
                        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem;">
                            <strong style="color: var(--primary);">${escapeHTML(comment.userName || 'Student')}</strong>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${formatCommentDate(comment.createdAt)}</span>
                        </div>
                        <div style="color: var(--text);">${escapeHTML(comment.text)}</div>
                        ${repliesHTML}
                        ${adminToolsHTML}
                    </div>
                `);
            });
        } catch (err) {
            console.error('Error loading comments:', err);
            commentList.innerHTML = '<div style="color: #ff4a4a;">Comments could not be loaded right now.</div>';
        }
    };

    loadComments();

    if (postCommentBtn) {
        postCommentBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!currentPaperId) return alert('Paper ID was not found. Please refresh the page.');
            if (!token) return alert('Please sign in to post a comment.');

            const commentText = commentTextarea ? commentTextarea.value.trim() : '';
            if (!commentText) return alert('Please write a comment first.');

            const originalText = postCommentBtn.innerHTML;
            postCommentBtn.innerHTML = 'Posting...';
            postCommentBtn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/papers/${currentPaperId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ text: commentText })
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Comment could not be posted');
                }

                commentTextarea.value = '';
                await loadComments();
            } catch (err) {
                console.error('Comment post error:', err);
                alert(err.message || 'Comment post failed.');
            } finally {
                postCommentBtn.innerHTML = originalText;
                postCommentBtn.disabled = false;
            }
        });
    }

    if (commentList) {
        commentList.addEventListener('click', async (e) => {
            const replyToggle = e.target.closest('.comment-reply-toggle');
            const deleteBtn = e.target.closest('.comment-delete-btn');
            const cancelReply = e.target.closest('.comment-cancel-reply');

            if (replyToggle) {
                const commentId = replyToggle.dataset.commentId;
                const replyForm = commentList.querySelector(`.comment-reply-form[data-comment-id="${commentId}"]`);
                if (replyForm) {
                    replyForm.style.display = replyForm.style.display === 'flex' ? 'none' : 'flex';
                }
                return;
            }

            if (cancelReply) {
                const replyForm = cancelReply.closest('.comment-reply-form');
                if (replyForm) {
                    replyForm.reset();
                    replyForm.style.display = 'none';
                }
                return;
            }

            if (deleteBtn) {
                const commentId = deleteBtn.dataset.commentId;
                if (!isAdminUser || !token) return alert('Only admins can remove comments.');
                if (!window.confirm('Remove this comment?')) return;

                deleteBtn.disabled = true;
                try {
                    const res = await fetch(`${API_BASE}/papers/${currentPaperId}/comments/${commentId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();

                    if (!res.ok || !data.success) {
                        throw new Error(data.message || 'Comment could not be removed');
                    }

                    await loadComments();
                } catch (err) {
                    console.error('Comment delete error:', err);
                    alert(err.message || 'Could not remove comment.');
                    deleteBtn.disabled = false;
                }
            }
        });

        commentList.addEventListener('submit', async (e) => {
            const replyForm = e.target.closest('.comment-reply-form');
            if (!replyForm) return;

            e.preventDefault();
            if (!isAdminUser || !token) return alert('Only admins can reply to comments.');

            const commentId = replyForm.dataset.commentId;
            const replyText = new FormData(replyForm).get('replyText').trim();
            if (!replyText) return alert('Please write a reply first.');

            const submitBtn = replyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.innerHTML = 'Replying...';
                submitBtn.disabled = true;
            }

            try {
                const res = await fetch(`${API_BASE}/papers/${currentPaperId}/comments/${commentId}/replies`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ text: replyText })
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Reply could not be posted');
                }

                replyForm.reset();
                await loadComments();
            } catch (err) {
                console.error('Comment reply error:', err);
                alert(err.message || 'Could not post reply.');
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // --- 7. DYNAMIC PAPERS & FILTERS ENGINE (papers.html) ---
    const papersGrid = document.getElementById('papers-grid');
    const examButtons = document.querySelectorAll('.exam-filter');
    const yearButtons = document.querySelectorAll('.year-filter');
    const paperSearchForm = document.getElementById('paper-search-form');
    const paperSearchInput = document.getElementById('paper-search-input');
    const clearPaperSearchButton = document.getElementById('clear-paper-search');

    let selectedExam = 'all';
    let selectedYear = 'all';
    let selectedSearch = '';
    let paperSearchTimer;

    const updatePaperSearchClearButton = () => {
        if (clearPaperSearchButton) {
            clearPaperSearchButton.hidden = !selectedSearch;
        }
    };

    if (papersGrid) {
        // Initial clean filter invocation execution
        fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);

        // Exam Filter handlers
        examButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                examButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                selectedExam = this.getAttribute('data-exam') || 'all';
                fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);
            });
        });

        // Year Filter handlers
        yearButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                yearButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                selectedYear = this.getAttribute('data-year') || 'all';
                fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);
            });
        });

        if (paperSearchForm) {
            paperSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                clearTimeout(paperSearchTimer);
                selectedSearch = paperSearchInput ? paperSearchInput.value.trim() : '';
                updatePaperSearchClearButton();
                fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);
            });
        }

        if (paperSearchInput) {
            paperSearchInput.addEventListener('input', () => {
                selectedSearch = paperSearchInput.value.trim();
                updatePaperSearchClearButton();
                clearTimeout(paperSearchTimer);
                paperSearchTimer = setTimeout(() => {
                    fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);
                }, 250);
            });
        }

        if (clearPaperSearchButton) {
            clearPaperSearchButton.addEventListener('click', () => {
                if (paperSearchInput) paperSearchInput.value = '';
                selectedSearch = '';
                updatePaperSearchClearButton();
                fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);
                paperSearchInput?.focus();
            });
        }
    }

    async function fetchAndRenderPapers(examType = 'all', year = 'all', search = '') {
        if (!papersGrid) return;

        try {
            const queryParams = new URLSearchParams();
            if (examType && examType !== 'all') queryParams.set('examType', examType);
            if (year && year !== 'all') queryParams.set('year', year);
            if (search) queryParams.set('search', search);
            const url = `${API_BASE}/papers?${queryParams.toString()}`;

            papersGrid.innerHTML = '<div class="loader-spinner" style="padding:2rem; text-align:center; color:var(--text-muted); width:100%;">Opening Secure Repository Vault...</div>';

            const res = await fetch(url);
            const responseData = await res.json();

            if (responseData.success && responseData.data.length > 0) {
                papersGrid.innerHTML = '';

                responseData.data.forEach(paper => {
                    const downloads = Number(paper.downloads) || 0;
                    const downloadsFormatted = downloads >= 1000 ? (downloads / 1000).toFixed(1) + 'k' : downloads;
                    const safeTitle = escapeHTML(paper.title);
                    const safeExamType = escapeHTML(paper.examType);
                    const safeYear = escapeHTML(paper.year);

                    // Is code ko cardHTML loop ke andar update karo:
const cardHTML = `
    <div class="paper-card" style="display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border-radius: 12px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="paper-icon" style="font-size: 2rem; color: #ff4a4a;"><i class="fa-regular fa-file-pdf"></i></div>
            <div class="paper-info">
                <h3 class="paper-title" style="margin: 0 0 0.5rem 0; font-size: 1.2rem;">${safeTitle}</h3>
                <div class="paper-meta" style="font-size: 0.9rem; color: #888; display: flex; gap: 1rem;">
                    <span><i class="fa-regular fa-calendar"></i> ${safeExamType} (${safeYear})</span>
                    <span><i class="fa-solid fa-download"></i> ${downloadsFormatted} Downloads</span>
                </div>
            </div>
        </div>
        
        <div class="paper-actions" style="display: flex; gap: 0.6rem; align-items: center;">
            
            <a href="https://examvault-live.onrender.com${paper.pdfUrl}" target="_blank" class="btn-sm btn-outline" style="padding: 0.5rem 0.8rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; text-decoration: none; color: var(--text); font-size: 0.85rem;">
                <i class="fa-solid fa-eye"></i> View Paper
            </a>

            <a href="https://examvault-live.onrender.com${paper.pdfUrl}" download class="btn-sm btn-outline" style="padding: 0.5rem 0.8rem; border: 1px solid var(--primary); border-radius: 6px; text-decoration: none; color: var(--text); font-size: 0.85rem;">
                <i class="fa-solid fa-download"></i> Download
            </a>
            
            <a href="solution.html?id=${paper._id}" class="btn-sm btn-filled" style="padding: 0.5rem 0.8rem; background: var(--primary); color: white; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 500;">
                View Solution
            </a>
        </div>
    </div>
`;
                    papersGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            } else {
                papersGrid.innerHTML = `
                    <div class="no-data-msg" style="padding:3rem; text-align:center; color:#888; width:100%;">
                        <i class="fa-solid fa-folder-open" style="font-size:2.5rem; margin-bottom:1rem; display:block; color:var(--primary);"></i>
                        No question papers match your selected search filter.
                    </div>`;
            }
        } catch (err) {
            console.error('Error fetching data arrays:', err);
            papersGrid.innerHTML = '<div class="error-msg" style="width:100%; text-align:center; color:#ff4a4a;">Failed to connect with remote repository cluster.</div>';
        }
    }

    // --- 8. BACK TO TOP CONFIGURATION ---
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
// ==========================================
    // 🛡️ SYSTEM 9: DASHBOARD ROUTE PROTECTION & HYDRATION
    // ==========================================
    const isDashboardPage = window.location.pathname.includes('dashboard.html');

    if (isDashboardPage) {
        // 1. Core Route Protection: Kick out guests instantly
        if (!token || !currentUser) {
            window.location.href = 'login.html'; // Redirect to login
        } else {
            // 2. Data Hydration: Inject actual user details into the DOM
            const dashName = document.getElementById('dash-name');
            const dashEmail = document.getElementById('dash-email');
            const dashAvatar = document.getElementById('dash-avatar');
            const dashAvatarImg = document.getElementById('dash-avatar-img');
            const profilePhotoPreview = document.getElementById('profile-photo-preview');
            const profilePhotoInput = document.getElementById('profile-photo-input');
            const profilePhotoBtn = document.getElementById('profile-photo-btn');
            const profilePhotoRemove = document.getElementById('profile-photo-remove');
            const dashRole = document.getElementById('dash-role');
            const dashAccountId = document.getElementById('dash-account-id');
            const profileAccountRole = document.getElementById('profile-account-role');
            const profileMemberSince = document.getElementById('profile-member-since');
            const profileFullname = document.getElementById('profile-fullname');
            const profileEmail = document.getElementById('profile-email');
            const profileRoleInput = document.getElementById('profile-role-input');
            const profileDetailsForm = document.getElementById('profile-details-form');
            const profileDetailsStatus = document.getElementById('profile-details-status');
            const clearProfileDetails = document.getElementById('clear-profile-details');
            const profileLogoutBtn = document.getElementById('profile-logout-btn');

            const userName = currentUser.fullname || 'Student';
            const userEmail = currentUser.email || '';
            const userRole = currentUser.role || 'user';
            const profileKey = currentUser.id || currentUser._id || userEmail || 'user';
            const profilePhotoKey = `examvault_profile_photo_${profileKey}`;
            const profileDetailsKey = `examvault_profile_details_${profileKey}`;
            const profileSeenKey = `examvault_profile_seen_${profileKey}`;
            const accountId = String(profileKey);

            const formatRole = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
            const formatProfileDate = (value) => {
                const date = value ? new Date(value) : new Date();
                if (Number.isNaN(date.getTime())) return 'Today';
                return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            };

            let memberSince = currentUser.createdAt || localStorage.getItem(profileSeenKey);
            if (!memberSince) {
                memberSince = new Date().toISOString();
                localStorage.setItem(profileSeenKey, memberSince);
            }

            if (dashName) dashName.textContent = userName;
            if (dashEmail) dashEmail.textContent = userEmail;
            if (dashRole) dashRole.textContent = formatRole(userRole);
            if (dashAccountId) dashAccountId.textContent = accountId.slice(-8);
            if (profileAccountRole) profileAccountRole.textContent = formatRole(userRole);
            if (profileMemberSince) profileMemberSince.textContent = formatProfileDate(memberSince);
            if (profileFullname) profileFullname.value = userName;
            if (profileEmail) profileEmail.value = userEmail;
            if (profileRoleInput) profileRoleInput.value = formatRole(userRole);

            if (dashAvatar && userName) {
                dashAvatar.textContent = userName.charAt(0).toUpperCase();
            }

            const applyProfilePhoto = (imageData) => {
                if (!dashAvatarImg || !profilePhotoPreview) return;

                if (imageData) {
                    dashAvatarImg.src = imageData;
                    dashAvatarImg.hidden = false;
                    profilePhotoPreview.classList.add('has-image');
                } else {
                    dashAvatarImg.removeAttribute('src');
                    dashAvatarImg.hidden = true;
                    profilePhotoPreview.classList.remove('has-image');
                }
            };

            applyProfilePhoto(localStorage.getItem(profilePhotoKey));

            if (profilePhotoBtn && profilePhotoInput) {
                profilePhotoBtn.addEventListener('click', () => profilePhotoInput.click());
            }

            if (profilePhotoInput) {
                profilePhotoInput.addEventListener('change', () => {
                    const file = profilePhotoInput.files && profilePhotoInput.files[0];
                    if (!file) return;

                    if (!file.type.startsWith('image/')) {
                        alert('Please choose an image file.');
                        profilePhotoInput.value = '';
                        return;
                    }

                    if (file.size > 1500000) {
                        alert('Please choose an image smaller than 1.5 MB.');
                        profilePhotoInput.value = '';
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            localStorage.setItem(profilePhotoKey, reader.result);
                            applyProfilePhoto(reader.result);
                        } catch (err) {
                            console.error('Profile photo save failed:', err);
                            alert('Could not save the photo in this browser. Try a smaller image.');
                        }
                    };
                    reader.readAsDataURL(file);
                    profilePhotoInput.value = '';
                });
            }

            if (profilePhotoRemove) {
                profilePhotoRemove.addEventListener('click', () => {
                    localStorage.removeItem(profilePhotoKey);
                    applyProfilePhoto('');
                });
            }

            const editableProfileFields = {
                phone: document.getElementById('profile-phone'),
                institution: document.getElementById('profile-institution'),
                targetExam: document.getElementById('profile-target-exam'),
                city: document.getElementById('profile-city'),
                studyTime: document.getElementById('profile-study-time')
            };

            let savedProfileDetails = {};
            try {
                savedProfileDetails = JSON.parse(localStorage.getItem(profileDetailsKey) || '{}') || {};
            } catch (err) {
                savedProfileDetails = {};
            }

            Object.entries(editableProfileFields).forEach(([key, field]) => {
                if (field) field.value = savedProfileDetails[key] || '';
            });

            if (profileDetailsForm) {
                profileDetailsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const nextDetails = {};

                    Object.entries(editableProfileFields).forEach(([key, field]) => {
                        nextDetails[key] = field ? field.value.trim() : '';
                    });

                    localStorage.setItem(profileDetailsKey, JSON.stringify(nextDetails));

                    if (profileDetailsStatus) {
                        profileDetailsStatus.textContent = 'Saved';
                        setTimeout(() => {
                            profileDetailsStatus.textContent = '';
                        }, 1800);
                    }
                });
            }

            if (clearProfileDetails) {
                clearProfileDetails.addEventListener('click', () => {
                    localStorage.removeItem(profileDetailsKey);
                    Object.values(editableProfileFields).forEach((field) => {
                        if (field) field.value = '';
                    });
                    if (profileDetailsStatus) profileDetailsStatus.textContent = 'Cleared';
                });
            }

            if (profileLogoutBtn) {
                profileLogoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('examvault_token');
                    localStorage.removeItem('examvault_user');
                    window.location.href = 'index.html';
                });
            }

            const savedPapersCount = document.getElementById('saved-papers-count');
            const savedPapersList = document.getElementById('saved-papers-list');

            if (savedPapersCount || savedPapersList) {
                fetch(`${API_BASE}/auth/saved-papers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(async (res) => {
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                            throw new Error(data.message || 'Unable to load saved papers');
                        }
                        return data.data || [];
                    })
                    .then((savedPapers) => {
                        if (savedPapersCount) savedPapersCount.textContent = savedPapers.length;
                        if (!savedPapersList) return;

                        if (savedPapers.length === 0) {
                            savedPapersList.innerHTML = '<p style="color: var(--text-muted); margin: 0;">No saved papers yet.</p>';
                            return;
                        }

                        savedPapersList.innerHTML = savedPapers.map((paper) => `
                            <article class="saved-paper-item">
                                <div>
                                    <h3>${escapeHTML(paper.title)}</h3>
                                    <p>${escapeHTML(paper.examType)} | ${escapeHTML(paper.year)} | ${escapeHTML(paper.subject)}</p>
                                </div>
                                <a href="solution.html?id=${encodeURIComponent(paper._id)}" class="profile-tool-btn" style="align-self: flex-start;">Open Paper</a>
                            </article>
                        `).join('');
                    })
                    .catch((err) => {
                        console.error('Saved papers loading failed:', err);
                        if (savedPapersList) {
                            savedPapersList.innerHTML = '<p style="color: #ff4a4a; margin: 0;">Saved papers could not be loaded.</p>';
                        }
                    });
            }
        }
    }
    // Admin Message Form Handler (Dashboard)
   // ==========================================
    // 📩 SYSTEM 10: REAL ADMIN MESSAGING ENGINE
    // ==========================================
    const adminMsgForm = document.getElementById('admin-msg-form');
    if (adminMsgForm) {
        adminMsgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subject = document.getElementById('admin-msg-subject').value;
            const body = document.getElementById('admin-msg-body').value;
            const btn = adminMsgForm.querySelector('button');
            const originalText = btn.innerHTML;
            
            // Show loading state
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
            btn.disabled = true;

            try {
                // Send real data to our new MongoDB endpoint
                const res = await fetch(`${API_BASE}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userName: currentUser.fullname, // Pulled from local session
                        userEmail: currentUser.email,
                        subject: subject,
                        body: body
                    })
                });
                
                const data = await res.json();

                if (data.success) {
                    btn.innerHTML = `<i class="fa-solid fa-check-double"></i> Delivered!`;
                    btn.style.background = '#00b894';
                    adminMsgForm.reset();
                } else {
                    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Failed`;
                    btn.style.background = '#ff4a4a';
                }
            } catch (err) {
                console.error('Message delivery failed:', err);
                btn.innerHTML = `Error. Try Again.`;
            }

            // Reset button UI after 3 seconds
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        });
    }
    // ==========================================
    // 👁️ SYSTEM 11: SHOW/HIDE PASSWORD TOGGLE
    // ==========================================
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');
    
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            // Find the input field right next to this icon
            const input = this.previousElementSibling;
            
            // Toggle type between 'password' and 'text'
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    // ==========================================
    // 📁 SYSTEM 12: ADMIN FILE UPLOAD ENGINE
    // ==========================================
    const uploadForm = document.getElementById('upload-paper-form');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('upload-btn');
            const originalText = btn.innerHTML;
            
            // Show loading state
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading Securely...`;
            btn.disabled = true;

            // FormData automatically captures all inputs and the file!
            const formData = new FormData(uploadForm);

             try {
                // FIX: Sending the JWT token in headers for authorization
                const res = await fetch(`${API_BASE}/papers/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('examvault_token')}`
                    },
                    // Note: NO 'Content-Type' header here, FormData handles it automatically
                    body: formData 
                });
                
                const data = await res.json();

                if (data.success) {
                    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Upload Successful!`;
                    btn.style.background = '#00b894';
                    uploadForm.reset(); // Clear the form
                } else {
                    alert(data.message || 'Upload failed.');
                    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Try Again`;
                    btn.style.background = '#ff4a4a';
                }
            } catch (err) {
                console.error('Upload Error:', err);
                btn.innerHTML = `Error. Check Console.`;
            }

            // Reset button UI after 3 seconds
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        });
    }
    // ==========================================
    // 📬 SYSTEM 13: ADMIN INBOX ENGINE
    // ==========================================
    const adminMessagesGrid = document.getElementById('admin-messages-grid');

    if (adminMessagesGrid) {
        async function fetchAdminMessages() {
            try {
                const res = await fetch(`${API_BASE}/messages`);
                const data = await res.json();

                if (data.success && data.data.length > 0) {
                    adminMessagesGrid.innerHTML = ''; // Clear loader

                    data.data.forEach(msg => {
                        const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });

                        const msgHTML = `
                            <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--primary);">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <strong>${msg.subject}</strong>
                                    <span style="font-size: 0.85rem; color: var(--text-muted);">${date}</span>
                                </div>
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
                                    From: ${msg.userName} (${msg.userEmail})
                                </div>
                                <p style="margin: 0 0 1rem 0; font-size: 0.95rem;">${msg.body}</p>
                                
                                <a href="mailto:${msg.userEmail}?subject=Re: ${msg.subject}" class="btn-sm btn-outline" style="text-decoration: none; display: inline-block; padding: 0.5rem 1rem; font-size: 0.85rem;">
                                    <i class="fa-solid fa-reply"></i> Reply via Email
                                </a>
                            </div>
                        `;
                        adminMessagesGrid.insertAdjacentHTML('beforeend', msgHTML);
                    });
                } else {
                    adminMessagesGrid.innerHTML = '<div style="color: var(--text-muted); text-align: center;">No messages from students yet.</div>';
                }
            } catch (err) {
                console.error('Failed to load inbox:', err);
                adminMessagesGrid.innerHTML = '<div style="color: #ff4a4a; text-align: center;">Error loading inbox.</div>';
            }
        }
        
        // Auto-fetch when admin page loads
        fetchAdminMessages();
    }
    // ==========================================
    // 🚫 SYSTEM 14: ADMIN ROUTE SECURITY LOCK
    // ==========================================
    const isAdminPage = window.location.pathname.includes('admin.html');

    if (isAdminPage) {
        // Agar user logged in nahi hai, YA FIR uska role 'admin' nahi hai
        if (!currentUser || currentUser.role !== 'admin') {
            alert('Security Alert: Access Denied! You do not have admin privileges.');
            window.location.href = 'index.html'; // Seedha Home page par fek do
        }
    }
// ==========================================
    // 📨 SYSTEM 15: CONTACT FORM SUBMISSION
    // ==========================================
   const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userName = document.getElementById('contact-name').value;
        const userEmail = document.getElementById('contact-email').value;
        const subject = document.getElementById('contact-subject').value;
        const body = document.getElementById('contact-message').value;

        try {
            const res = await fetch(`${API_BASE}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName, userEmail, subject, body })
            });
            const data = await res.json();
            if(data.success) {
                alert("Message Sent to Admin successfully!");
                contactForm.reset();
            }
        } catch(err) {
            alert("Error sending message.");
        }
    });
}
  // 3. 💬 POST COMMENT BUTTON CLICK
/*
    const commentBtn = e.target.closest('#post-comment-btn');
    if (commentBtn) {
        e.preventDefault();
        if (!paperId) return alert("Error: Paper ID detect nahi hui! Kripya page refresh karein.");
        if (!token) return alert("Comment post karne ke liye login zaroori hai!");

        const textarea = document.getElementById('comment-body');
        const commentText = textarea ? textarea.value.trim() : '';

        if (!commentText) return alert("Kuch likho toh sahi bhai!");

        try {
            commentBtn.innerText = "Posting...";
            commentBtn.disabled = true;

            const apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '/api';
            
            // Backend ko request bhejo
            const res = await fetch(`${apiBase}/papers/${paperId}/comments`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ text: commentText }) // Hum 'text' bhej rahe hain
            });

            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

            const data = await res.json();

            if (data.success) {
                textarea.value = ''; // Textarea saaf karo
                
                // 🚨 MASTERSTROKE: Manual HTML lagane ke bajaye, fresh comments load karlo!
                if (typeof loadComments === 'function') {
                    await loadComments(paperId); // Yeh database se naya comment pull karke dikha dega!
                }
            } else {
                alert(data.message || "Comment post nahi ho paya!");
            }
        } catch (err) {
            console.error("Comment API Error Details:", err);
            alert("Comment post karne me error aayi. Console check karein.");
        } finally {
            commentBtn.innerText = "Post Comment";
            commentBtn.disabled = false;
        }
        return;
    }
*/
    // ====== ACTION BUTTONS ======

document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
});

const updateSavedPaperButton = (button, saved) => {
    if (!button) return;

    const icon = button.querySelector('i');
    const label = button.querySelector('#save-text');
    button.dataset.saved = String(saved);

    if (icon) icon.className = saved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    if (label) label.textContent = saved ? 'Saved' : 'Save';
    button.style.color = saved ? '#2ed573' : '';
    button.style.borderColor = saved ? '#2ed573' : '';
};

const saveButton = document.getElementById('save-btn');
if (saveButton && currentPaperId && token) {
    fetch(`${API_BASE}/papers/${currentPaperId}/save`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load save status');
            return data;
        })
        .then((data) => updateSavedPaperButton(saveButton, data.saved))
        .catch((err) => console.error('Save status loading failed:', err));
}
// ==========================================
    // 🖲️ SYSTEM 17: GLOBAL ACTION BUTTONS
    // ==========================================
   // =========================================================================
// 🔥 MASTER ACTION ENGINE (Bulletproof Save Toggle + Smart PDF Download)
// =========================================================================

document.addEventListener('click', async (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    const paperId = urlParams.get('id');
    const token = localStorage.getItem('examvault_token');

    // 1. 🔖 SAVE BUTTON CLICK (100% Guaranteed Toggle with data-attribute)
    const saveBtn = e.target.closest('#save-btn');
    if (saveBtn) {
        e.preventDefault();

        if (!paperId) return alert('Paper ID was not found. Please refresh the page.');
        if (!token) return alert('Please sign in to save papers.');

        const originalHTML = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span id="save-text">Saving...</span>';

        try {
            const res = await fetch(`${API_BASE}/papers/${paperId}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Paper could not be saved');
            }

            saveBtn.innerHTML = originalHTML;
            updateSavedPaperButton(saveBtn, data.saved);
        } catch (err) {
            console.error('Save paper error:', err);
            saveBtn.innerHTML = originalHTML;
            alert(err.message || 'Paper could not be saved.');
        } finally {
            saveBtn.disabled = false;
        }
        return;
    }

    // 2. 📥 DOWNLOAD PDF BUTTON CLICK (Smart Fallback)
    const downloadBtn = e.target.closest('#download-pdf-btn');
    if (downloadBtn) {
        const currentHref = downloadBtn.getAttribute('href');
        
        // Agar href me abhi bhi "#" ya empty hai, toh iframe se link chura lo
        if (!currentHref || currentHref === '#' || currentHref === '') {
            e.preventDefault();
            const iframe = document.getElementById('pdf-frame');
            
            if (iframe && iframe.src && iframe.src !== window.location.href) {
                // Iframe ke PDF URL ko nayi tab me khol do
                window.open(iframe.src, '_blank');
            } else {
                alert("Bhai, PDF abhi load ho rahi hai ya server par available nahi hai!");
            }
        }
        // Agar currentHref sahi URL hai, toh normal <a target="_blank"> apna kaam karega
        return;
    }

    // 3. ❤️ LIKE BUTTON CLICK
    const likeBtn = e.target.closest('#like-btn');
    if (likeBtn) {
        e.preventDefault();
        if (!token) return alert("Bhai, pehle login kar lo Like karne ke liye!");

        try {
            const res = await fetch(`/api/papers/${paperId}/like`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });
            const data = await res.json();

            if (data.success) {
                const icon = likeBtn.querySelector('i');
                const countSpan = document.getElementById('likes-count');
                
                if (data.isLiked) {
                    icon.className = 'fa-solid fa-heart';
                    likeBtn.style.color = '#ff4757';
                    likeBtn.style.borderColor = '#ff4757';
                } else {
                    icon.className = 'fa-regular fa-heart';
                    likeBtn.style.color = '';
                    likeBtn.style.borderColor = '';
                }
                if (countSpan && data.likesCount !== undefined) countSpan.innerText = `(${data.likesCount})`;
            }
        } catch (err) {
            console.error("Like error:", err);
        }
        return;
    }

    // 4. 👎 DISLIKE BUTTON CLICK
    const dislikeBtn = e.target.closest('#dislike-btn');
    if (dislikeBtn) {
        e.preventDefault();
        if (!token) return alert("Pehle login kar lo Dislike karne ke liye!");

        try {
            const res = await fetch(`/api/papers/${paperId}/dislike`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });
            const data = await res.json();

            if (data.success) {
                const icon = dislikeBtn.querySelector('i');
                if (data.isDisliked) {
                    icon.className = 'fa-solid fa-thumbs-down';
                    dislikeBtn.style.color = '#ffa502';
                    dislikeBtn.style.borderColor = '#ffa502';
                } else {
                    icon.className = 'fa-regular fa-thumbs-down';
                    dislikeBtn.style.color = '';
                    dislikeBtn.style.borderColor = '';
                }
            }
        } catch (err) {
            console.error("Dislike error:", err);
        }
        return;
    }
});

