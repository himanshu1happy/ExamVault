/* ========================================
   EXAMVAULT - Core Application Script
   Full-Stack API & Animation Integration
   ======================================== */

const API_ORIGIN = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ? window.location.origin
    : '';
const API_BASE = `${API_ORIGIN}/api`;

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
window.escapeHTML = escapeHTML;

const token = localStorage.getItem('examvault_token');
let currentUser = (() => {
    try {
        return JSON.parse(localStorage.getItem('examvault_user') || 'null');
    } catch (err) {
        console.error('Failed to parse saved user:', err);
        return null;
    }
})();

const getCurrentUserRole = (user) => {
    const roles = [user?.role, user?.userType]
        .map(value => String(value || '').trim().toLowerCase());
    return roles.includes('admin') ? 'admin' : 'user';
};

const isAdmin = (user) => getCurrentUserRole(user) === 'admin';

const logout = () => {
    localStorage.removeItem('examvault_token');
    localStorage.removeItem('examvault_user');
    window.location.assign('index.html');
};

const getAuthHeaders = (extraHeaders = {}) => {
    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return { ...headers, ...extraHeaders };
};

const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const request = args[0];
    const headers = new Headers((args[1] && args[1].headers) || (request instanceof Request ? request.headers : undefined));
    if (response.status === 401 && headers.has('Authorization')) {
        localStorage.removeItem('examvault_token');
        localStorage.removeItem('examvault_user');
        if (!window.location.pathname.endsWith('/login.html')) {
            window.location.assign('login.html?expired=1');
        }
    }
    return response;
};

    // --- GLOBAL CONFIGURATION ---

    const toAbsoluteResourceUrl = (url) => {
        const safeUrl = String(url || '').trim();
        if (!safeUrl) return '';
        if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('/')) return '';

        let absoluteUrl = safeUrl;
        if (!/^https?:\/\//i.test(safeUrl)) {
            if (/^\/\//.test(safeUrl)) {
                absoluteUrl = `${window.location.protocol}${safeUrl}`;
            } else if (/^www\./i.test(safeUrl)) {
                absoluteUrl = `https://${safeUrl}`;
            } else if (safeUrl.startsWith('/')) {
                absoluteUrl = `${API_ORIGIN}${safeUrl}`;
            } else {
                try {
                    absoluteUrl = new URL(safeUrl, `${API_ORIGIN}/`).href;
                } catch (err) {
                    return '';
                }
            }
        }
        
        return absoluteUrl;
    };

    const isPdfResourceUrl = (url) => {
        const safeUrl = String(url || '').trim();
        return /^\/uploads\//i.test(safeUrl) || /\.pdf(?:$|[?#])/i.test(safeUrl);
    };

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
    const renderNavigation = (user) => {
        const profileArea = document.getElementById('nav-profile-subsystem');
        if (profileArea) {
            if (!user) {
                profileArea.innerHTML = '<a href="login.html" class="btn-nav-primary" id="nav-auth-btn">Sign In</a>';
            } else {
                profileArea.innerHTML = `
                    ${isAdmin(user) ? '<a href="admin.html" id="nav-admin-btn" aria-label="Open Admin Studio"><span class="admin-control-icon"><i class="fa-solid fa-shield-halved"></i></span><span class="admin-control-label">Admin Studio</span><i class="fa-solid fa-arrow-up-right-from-square admin-control-arrow"></i></a>' : ''}
                    <button type="button" class="btn-nav-primary" id="nav-logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                `;
                document.getElementById('nav-logout-btn')?.addEventListener('click', logout);
            }
        }

        document.querySelectorAll('a[href="dashboard.html"]').forEach((link) => link.remove());
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && user && !mobileMenu.querySelector('#mobile-logout-btn')) {
            const logoutLink = document.createElement('a');
            logoutLink.id = 'mobile-logout-btn';
            logoutLink.href = '#';
            logoutLink.className = 'nav-link';
            logoutLink.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Logout';
            logoutLink.addEventListener('click', (event) => {
                event.preventDefault();
                logout();
            });
            mobileMenu.appendChild(logoutLink);
        }
    };

    renderNavigation(currentUser);

    if (token) {
        fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok || !data.success || !data.user) throw new Error('Session refresh failed.');
                currentUser = data.user;
                localStorage.setItem('examvault_user', JSON.stringify(currentUser));
                renderNavigation(currentUser);
            })
            .catch(() => {});
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
const resendOtpBtn = document.getElementById('resend-otp-btn');
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

    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', async () => {
            resendOtpBtn.disabled = true;
            try {
                const response = await fetch(`${API_BASE}/auth/resend-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: pendingEmail })
                });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'Unable to resend code.');
                alert(data.message);
            } catch (error) {
                alert(error.message || 'Unable to resend code.');
            } finally {
                setTimeout(() => { resendOtpBtn.disabled = false; }, 60000);
            }
        });
    }
}

    // --- 5. SOLUTIONS & INTERACTION API BAR ---
    const urlParams = new URLSearchParams(window.location.search);
    const currentPaperId = urlParams.get('id') || '';
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
                headers: getAuthHeaders()
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
    const paperData = { videoLink: '', pdfUrl: '', solutionUrl: '' };

    const ensureToastContainer = () => {
        let container = document.getElementById('examvault-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'examvault-toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    };

    const showToast = (message, type = 'info') => {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        }, 2400);
    };

    const openViewer = (url) => {
        const fullUrl = toAbsoluteResourceUrl(url);
        if (!fullUrl) return;

        window.open(fullUrl, '_blank', 'noopener');
    };

    const handleWatchVideo = () => {
        const videoLink = (paperData.videoLink || '').trim();

        if (!videoLink) {
            showToast('Oops! No video solution has been uploaded for this paper yet.', 'error');
            return;
        }

        openViewer(videoLink);
    };

    const handleQuestionPaperView = () => {
        const paperUrl = (paperData.pdfUrl || '').trim();

        if (!paperUrl) {
            showToast('Question paper is not available yet!', 'error');
            return;
        }

        openViewer(paperUrl);
    };

    const isSolutionPage = window.location.pathname.includes('solution.html');

    if (isSolutionPage) {
        (async () => {
            try {
                if (!currentPaperId) {
                    throw new Error('Paper ID was not found in the page URL.');
                }

                const res = await fetch(`${API_BASE}/papers/${currentPaperId}`, { headers: getAuthHeaders() });
                const data = await res.json();

                if (!res.ok || !data || !data.success || !data.data) {
                    throw new Error(data?.message || 'Paper could not be loaded.');
                }

                if (data && data.success && data.data) {
                    const isLiked = Boolean(data.data.isLiked);
                    const isDisliked = Boolean(data.data.isDisliked);

                    updateLikeButton(isLiked, Number(data.data.likesCount) || 0);
                    updateDislikeButton(isDisliked);

                    // 1. Dynamic Title
                    const dynTitleEl = document.getElementById('dynamic-paper-title');
                    if (dynTitleEl) dynTitleEl.innerText = data.data.title;

                    const breadcrumbExamType = document.getElementById('breadcrumb-exam-type');
                    if (breadcrumbExamType) breadcrumbExamType.innerText = data.data.examType || 'Exam';

                    const solutionYear = document.getElementById('solution-year');
                    if (solutionYear) solutionYear.innerText = data.data.year || '----';

                    const solutionViews = document.getElementById('solution-views');
                    if (solutionViews) solutionViews.innerText = Number(data.data.views || 0).toLocaleString();

                    // 2. Paper Details
                    const detailsContainer = document.getElementById('dynamic-paper-details');
                    if (detailsContainer) {
                        detailsContainer.innerHTML = `
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:.5rem;">
                                <span style="color:var(--text-muted);">Exam:</span>
                                <strong>${escapeHTML(data.data.examType || 'N/A')}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:.5rem;">
                                <span style="color:var(--text-muted);">Year:</span>
                                <strong>${escapeHTML(data.data.year || 'N/A')}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:.5rem;">
                                <span style="color:var(--text-muted);">Subject:</span>
                                <strong>${escapeHTML(data.data.subject || 'N/A')}</strong>
                            </div>
                            <div style="display:flex;justify-content:space-between;">
                                <span style="color:var(--text-muted);">Difficulty:</span>
                                <strong style="color:#fdcb6e;">${escapeHTML(data.data.difficulty || 'Moderate')}</strong>
                            </div>
                        `;
                    }

                    const storedSolutionUrl = data.data.solutionPdfUrl || data.data.solutionUrl || '';

                    paperData.videoLink = data.data.videoUrl || (!isPdfResourceUrl(storedSolutionUrl) ? storedSolutionUrl : '');
                    paperData.pdfUrl = data.data.pdfUrl || '';
                    paperData.solutionUrl = isPdfResourceUrl(storedSolutionUrl) ? storedSolutionUrl : '';

                    // 3. Solution Video Button
                    const solutionBtn = document.getElementById('view-solution-btn');
                    if (solutionBtn) {
                        solutionBtn.style.display = paperData.videoLink ? 'inline-flex' : 'none';
                        solutionBtn.href = toAbsoluteResourceUrl(paperData.videoLink) || '#';
                        solutionBtn.addEventListener('click', (event) => {
                            event.preventDefault();
                            handleWatchVideo();
                        });
                    }

                    // 4. Question Paper View Button
                    const viewPaperBtn = document.getElementById('view-paper-btn');
                    if (viewPaperBtn) {
                        viewPaperBtn.addEventListener('click', (event) => {
                            event.preventDefault();
                            handleQuestionPaperView();
                        });
                    }

                    // 🚨 CORE FEATURE FIX: PDF VIEWER & DOWNLOAD BUTTON HYDRATION
                    const solutionPdfUrl = toAbsoluteResourceUrl(paperData.solutionUrl);
                    const downloadBtn = document.getElementById('download-pdf-btn');
                    if (downloadBtn) {
                        downloadBtn.href = solutionPdfUrl || '#';
                        downloadBtn.setAttribute('download', '');
                        downloadBtn.style.display = solutionPdfUrl ? 'inline-flex' : 'none';
                        downloadBtn.addEventListener('click', (event) => {
                            if (!solutionPdfUrl) {
                                event.preventDefault();
                                showToast('Solution PDF is not available yet!', 'error');
                            }
                        });
                    }

                    const iframe = document.getElementById('pdf-frame');
                    if (iframe) {
                        if (solutionPdfUrl) {
                            iframe.removeAttribute('srcdoc');
                            iframe.src = solutionPdfUrl;
                        } else {
                            iframe.src = 'about:blank';
                            iframe.srcdoc = `
                                <html>
                                    <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#1e1e24;color:#f5f6ff;font-family:Arial,sans-serif;text-align:center;">
                                        <div>
                                            <div style="font-size:42px;margin-bottom:16px;">PDF</div>
                                            <div style="font-size:20px;font-weight:700;margin-bottom:8px;">Solution PDF not available yet</div>
                                            <div style="font-size:14px;color:#b8b8d6;">Upload a solution PDF from the admin panel to show it here.</div>
                                        </div>
                                    </body>
                                </html>
                            `;
                        }
                    }

                }
            } catch (err) {
                console.error('Failed to load solution data:', err);
                const dynTitleEl = document.getElementById('dynamic-paper-title');
                if (dynTitleEl) dynTitleEl.innerText = err.message || 'Paper could not be loaded';
                const iframe = document.getElementById('pdf-frame');
                if (iframe) iframe.src = 'about:blank';
                showToast(err.message || 'Paper could not be loaded.', 'error');
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
    const isAdminUser = isAdmin(currentUser);

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
    
    const formatCommentDate = (value) => {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };



    let commentPage = 0;
    let commentPages = 0;
    const loadComments = async function(append = false) {
        if (!commentList) return;

        try {
            const requestedPage = append ? commentPage + 1 : 1;
            const res = await fetch(`${API_BASE}/papers/${currentPaperId}/comments?page=${requestedPage}&limit=20`);
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Unable to load comments');
            }

            const comments = data.data || [];
            if (!append) commentList.innerHTML = '';
            commentPage = data.page || requestedPage;
            commentPages = data.pages || 0;
            if (commentCount) commentCount.innerText = data.count || 0;

            if (comments.length === 0 && !append) {
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
            commentList.querySelector('[data-load-more-comments]')?.remove();
            if (commentPage < commentPages) {
                const loadMore = document.createElement('button');
                loadMore.type = 'button';
                loadMore.dataset.loadMoreComments = 'true';
                loadMore.className = 'btn-outline';
                loadMore.textContent = 'Load more comments';
                loadMore.addEventListener('click', () => loadComments(true));
                commentList.appendChild(loadMore);
            }
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
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
                        headers: getAuthHeaders()
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
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    let paperPage = 1;
    let paperPages = 1;
    let loadMorePapersButton;

    // Bug 21 fix: Pre-select exam from URL query param (e.g. papers.html?exam=JEE+Main)
    const pageUrlParams = new URLSearchParams(window.location.search);
    const examFromUrl = pageUrlParams.get('exam');
    if (examFromUrl) {
        selectedExam = examFromUrl;
        // Activate the matching filter button if present
        examButtons.forEach(btn => {
            if ((btn.getAttribute('data-exam') || '') === examFromUrl) {
                examButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    }

    const updatePaperSearchClearButton = () => {
        if (clearPaperSearchButton) {
            clearPaperSearchButton.hidden = !selectedSearch;
        }
    };

    if (papersGrid) {
        loadMorePapersButton = document.createElement('button');
        loadMorePapersButton.type = 'button';
        loadMorePapersButton.className = 'btn-outline';
        loadMorePapersButton.textContent = 'Load more papers';
        loadMorePapersButton.hidden = true;
        papersGrid.insertAdjacentElement('afterend', loadMorePapersButton);
        loadMorePapersButton.addEventListener('click', () => fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch, true));

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

    async function fetchAndRenderPapers(examType = 'all', year = 'all', search = '', append = false) {
        if (!papersGrid) return;

        try {
            if (!append) paperPage = 1;
            const queryParams = new URLSearchParams();
            if (examType && examType !== 'all') queryParams.set('examType', examType);
            if (year && year !== 'all') queryParams.set('year', year);
            if (search) queryParams.set('search', search);
            queryParams.set('page', String(append ? paperPage + 1 : paperPage));
            queryParams.set('limit', '20');
            const url = `${API_BASE}/papers?${queryParams.toString()}`;

            if (!append) papersGrid.innerHTML = '<div class="loader-spinner" style="padding:2rem; text-align:center; color:var(--text-muted); width:100%;">Opening Secure Repository Vault...</div>';

            const res = await fetch(url);
            const responseData = await res.json();

            if (responseData.success && responseData.data.length > 0) {
                if (!append) papersGrid.innerHTML = '';
                paperPage = responseData.page;
                paperPages = responseData.pages;

                responseData.data.forEach(paper => {
                    const downloads = Number(paper.downloads) || 0;
                    const downloadsFormatted = downloads >= 1000 ? (downloads / 1000).toFixed(1) + 'k' : downloads;
                    const safeTitle = escapeHTML(paper.title);
                    const safeExamType = escapeHTML(paper.examType);
                    const safeYear = escapeHTML(paper.year);
                    const paperPdfUrl = toAbsoluteResourceUrl(paper.pdfUrl) || '#';
                    const safePaperPdfUrl = escapeHTML(paperPdfUrl);
                    const safePaperId = escapeHTML(paper._id);
                    const safeSolutionHref = `solution.html?id=${encodeURIComponent(paper._id)}`;
                    const adminDeleteButton = isAdminUser ? `
            <button type="button" class="btn-sm btn-outline admin-delete-paper-btn" data-delete-paper-id="${safePaperId}" data-delete-paper-title="${safeTitle}" style="padding: 0.5rem 0.8rem; border: 1px solid #ff4a4a; background: transparent; border-radius: 6px; color: #ff4a4a; font-size: 0.85rem; cursor: pointer;">
                <i class="fa-solid fa-trash"></i> Delete
            </button>` : '';

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
            
            <a href="${safePaperPdfUrl}" target="_blank" rel="noopener" class="btn-sm btn-outline" style="padding: 0.5rem 0.8rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; text-decoration: none; color: var(--text); font-size: 0.85rem;">
                <i class="fa-solid fa-eye"></i> View Paper
            </a>

            <a href="${safePaperPdfUrl}" data-download-paper-id="${safePaperId}" class="btn-sm btn-outline" style="padding: 0.5rem 0.8rem; border: 1px solid var(--primary); border-radius: 6px; text-decoration: none; color: var(--text); font-size: 0.85rem;">
                <i class="fa-solid fa-download"></i> Download
            </a>
            
            <a href="${safeSolutionHref}" class="btn-sm btn-filled" style="padding: 0.5rem 0.8rem; background: var(--primary); color: white; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 500;">
                View Solution
            </a>

            ${adminDeleteButton}
        </div>
    </div>
`;
                    papersGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            } else if (!append) {
                papersGrid.innerHTML = `
                    <div class="no-data-msg" style="padding:3rem; text-align:center; color:#888; width:100%;">
                        <i class="fa-solid fa-folder-open" style="font-size:2.5rem; margin-bottom:1rem; display:block; color:var(--primary);"></i>
                        No question papers match your selected search filter.
                    </div>`;
            }
            if (loadMorePapersButton) loadMorePapersButton.hidden = paperPage >= paperPages;
        } catch (err) {
            console.error('Error fetching data arrays:', err);
            papersGrid.innerHTML = '<div class="error-msg" style="width:100%; text-align:center; color:#ff4a4a;">Failed to connect with remote repository cluster.</div>';
        }
    }

    if (papersGrid) {
        papersGrid.addEventListener('click', async (event) => {
            const downloadButton = event.target.closest('[data-download-paper-id]');
            if (downloadButton) {
                event.preventDefault();
                try {
                    const response = await fetch(`${API_BASE}/papers/${encodeURIComponent(downloadButton.dataset.downloadPaperId)}/download`, { method: 'POST' });
                    const data = await response.json();
                    if (!response.ok || !data.success) throw new Error(data.message || 'Download is unavailable.');
                    window.location.assign(toAbsoluteResourceUrl(data.url));
                } catch (error) {
                    showToast('Download is unavailable right now.', 'error');
                }
                return;
            }
            const deleteButton = event.target.closest('[data-delete-paper-id]');
            if (!deleteButton) return;

            event.preventDefault();
            event.stopPropagation();

            if (!isAdminUser) {
                alert('Only admins can remove papers.');
                return;
            }

            if (!token) {
                alert('Please sign in as admin to remove papers.');
                return;
            }

            const paperId = deleteButton.dataset.deletePaperId;
            const paperTitle = deleteButton.dataset.deletePaperTitle || 'this paper';

            if (!paperId) return;
            if (!window.confirm(`Remove "${paperTitle}" from ExamVault? This cannot be undone.`)) return;

            const originalHTML = deleteButton.innerHTML;
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Removing...';

            try {
                const res = await fetch(`${API_BASE}/papers/${encodeURIComponent(paperId)}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Paper could not be removed');
                }

                showToast(data.message || 'Paper removed successfully', 'success');
                await fetchAndRenderPapers(selectedExam, selectedYear, selectedSearch);
            } catch (err) {
                console.error('Delete paper error:', err);
                alert(err.message || 'Paper could not be removed.');
                deleteButton.innerHTML = originalHTML;
                deleteButton.disabled = false;
            }
        });
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
            const editableProfileFields = {
                phone: document.getElementById('profile-phone'),
                institution: document.getElementById('profile-institution'),
                targetExam: document.getElementById('profile-target-exam'),
                city: document.getElementById('profile-city'),
                studyTime: document.getElementById('profile-study-time')
            };

            const userName = currentUser.fullname || 'Student';
            const userEmail = currentUser.email || '';
            const userRole = getCurrentUserRole(currentUser);
            const profileKey = currentUser.id || currentUser._id || userEmail || 'user';
            const accountId = String(profileKey);

            const formatRole = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
            const formatProfileDate = (value) => {
                if (!value) return '—';
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return 'Today';
                return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            };

            const memberSince = currentUser.createdAt || '';

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

            applyProfilePhoto(currentUser?.photoUrl || currentUser?.profilePhoto || '');

            fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() })
                .then(response => response.json())
                .then(data => {
                    if (!data.success || !data.user) return;
                    currentUser = data.user;
                    localStorage.setItem('examvault_user', JSON.stringify(currentUser));
                    if (profileMemberSince && currentUser.createdAt) {
                        profileMemberSince.textContent = formatProfileDate(currentUser.createdAt);
                    }
                    applyProfilePhoto(currentUser.photoUrl || currentUser.profilePhoto || '');
                    if (currentUser.fullname && profileFullname) {
                        profileFullname.value = currentUser.fullname;
                    }
                })
                .catch((error) => console.error('Profile loading failed:', error));

            if (profilePhotoBtn && profilePhotoInput) {
                profilePhotoBtn.addEventListener('click', () => profilePhotoInput.click());
            }

            if (profilePhotoInput) {
                profilePhotoInput.addEventListener('change', async () => {
                    const file = profilePhotoInput.files && profilePhotoInput.files[0];
                    if (!file) return;

                    if (!file.type.startsWith('image/')) {
                        alert('Please choose an image file (JPG, PNG, or WebP).');
                        profilePhotoInput.value = '';
                        return;
                    }

                    if (file.size > 3 * 1024 * 1024) {
                        alert('Please choose an image smaller than 3 MB.');
                        profilePhotoInput.value = '';
                        return;
                    }

                    const formData = new FormData();
                    formData.append('photo', file);

                    try {
                        const response = await fetch(`${API_BASE}/auth/profile-photo`, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: formData
                        });
                        const data = await response.json();
                        if (!response.ok || !data.success) throw new Error(data.message || 'Photo upload failed.');
                        const newPhotoUrl = data.photoUrl || (data.data && data.data.photoUrl) || '';
                        applyProfilePhoto(newPhotoUrl);
                        if (currentUser) {
                            currentUser.photoUrl = newPhotoUrl;
                            currentUser.profilePhoto = newPhotoUrl;
                            localStorage.setItem('examvault_user', JSON.stringify(currentUser));
                        }
                    } catch (err) {
                        console.error('Profile photo save failed:', err);
                        alert(err.message || 'Could not save the photo.');
                    } finally {
                        profilePhotoInput.value = '';
                    }
                });
            }

            if (profilePhotoRemove) {
                profilePhotoRemove.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`${API_BASE}/auth/profile-photo`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        const data = await response.json();
                        if (!response.ok || !data.success) throw new Error(data.message || 'Photo removal failed.');
                        applyProfilePhoto('');
                        if (currentUser) {
                            currentUser.photoUrl = '';
                            currentUser.profilePhoto = '';
                            localStorage.setItem('examvault_user', JSON.stringify(currentUser));
                        }
                    } catch (err) {
                        console.error('Profile photo removal failed:', err);
                        alert(err.message || 'Could not remove the photo.');
                    }
                });
            }

            if (profileDetailsForm) {
                profileDetailsForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const nextDetails = {};

                    Object.entries(editableProfileFields).forEach(([key, field]) => {
                        nextDetails[key] = field ? field.value.trim() : '';
                    });

                    try {
                        const response = await fetch(`${API_BASE}/auth/profile`, {
                            method: 'PATCH',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({ profileDetails: nextDetails })
                        });
                        const data = await response.json();
                        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save profile details.');
                        if (profileDetailsStatus) profileDetailsStatus.textContent = 'Saved';
                    } catch (error) {
                        console.error('Profile details save failed:', error);
                        if (profileDetailsStatus) profileDetailsStatus.textContent = error.message || 'Unable to save.';
                    }
                    setTimeout(() => {
                        if (profileDetailsStatus) profileDetailsStatus.textContent = '';
                    }, 3000);
                });
            }

            if (clearProfileDetails) {
                clearProfileDetails.addEventListener('click', async () => {
                    const emptyDetails = Object.fromEntries(Object.keys(editableProfileFields).map(key => [key, '']));
                    try {
                        const response = await fetch(`${API_BASE}/auth/profile`, {
                            method: 'PATCH',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({ profileDetails: emptyDetails })
                        });
                        const data = await response.json();
                        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to clear profile details.');
                        Object.values(editableProfileFields).forEach((field) => {
                            if (field) field.value = '';
                        });
                        if (profileDetailsStatus) profileDetailsStatus.textContent = 'Cleared';
                    } catch (error) {
                        console.error('Profile details clearing failed:', error);
                        if (profileDetailsStatus) profileDetailsStatus.textContent = error.message || 'Unable to clear.';
                    }
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
                    headers: getAuthHeaders()
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
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ subject, body })
                });
                
                const data = await res.json();

                if (res.ok && data.success) {
                    btn.innerHTML = `<i class="fa-solid fa-check-double"></i> Delivered!`;
                    btn.style.background = '#00b894';
                    adminMsgForm.reset();
                } else {
                    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${data.message || 'Failed'}`;
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
    // 📁 SYSTEM 12: ADMIN STUDIO CONTROLLER
    // ==========================================
    const adminTabs = document.querySelectorAll('.admin-tab-btn');
    const adminPanels = document.querySelectorAll('.admin-tab-panel');

    if (adminTabs.length > 0) {
        // Tab switching
        adminTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                adminTabs.forEach(b => b.classList.remove('active'));
                adminPanels.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const activePanel = document.getElementById(`tab-${targetTab}`);
                if (activePanel) activePanel.classList.add('active');

                // Trigger appropriate loader
                if (targetTab === 'stats') loadAdminStats();
                else if (targetTab === 'papers') loadAdminPapers();
                else if (targetTab === 'users') loadAdminUsers();
                else if (targetTab === 'messages') fetchAdminMessages();
                else if (targetTab === 'comments') loadAdminComments();
            });
        });

        // 1. STATS LOADER
        async function loadAdminStats() {
            try {
                const res = await fetch(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() });
                const json = await res.json();
                if (json.success && json.data) {
                    const d = json.data;
                    const sp = document.getElementById('stat-papers');
                    const su = document.getElementById('stat-users');
                    const sv = document.getElementById('stat-views');
                    const sd = document.getElementById('stat-downloads');
                    const sc = document.getElementById('stat-comments');
                    const sf = document.getElementById('stat-failed');
                    if (sp) sp.textContent = Number(d.papers || 0).toLocaleString();
                    if (su) su.textContent = Number(d.users || 0).toLocaleString();
                    if (sv) sv.textContent = Number(d.views || 0).toLocaleString();
                    if (sd) sd.textContent = Number(d.downloads || 0).toLocaleString();
                    if (sc) sc.textContent = Number(d.comments || 0).toLocaleString();
                    if (sf) sf.textContent = Number(d.failedIndexings || 0).toLocaleString();
                }
            } catch (err) {
                console.error('Failed to load admin stats:', err);
            }
        }

        // 2. PAPERS TAB & ACTIONS
        const toggleUploadBtn = document.getElementById('toggle-upload-btn');
        const uploadPanel = document.getElementById('upload-panel');
        if (toggleUploadBtn && uploadPanel) {
            toggleUploadBtn.addEventListener('click', () => {
                const isHidden = uploadPanel.style.display === 'none' || !uploadPanel.style.display;
                uploadPanel.style.display = isHidden ? 'block' : 'none';
                toggleUploadBtn.innerHTML = isHidden 
                    ? '<i class="fa-solid fa-xmark"></i> Close Upload Panel'
                    : '<i class="fa-solid fa-cloud-arrow-up"></i> Upload New Paper';
            });
        }

        const uploadForm = document.getElementById('upload-paper-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('upload-btn');
                const originalText = btn.innerHTML;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading to Vault...`;
                btn.disabled = true;

                const formData = new FormData(uploadForm);
                try {
                    const res = await fetch(`${API_BASE}/papers/upload`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: formData
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Upload Successful!`;
                        btn.style.background = '#059669';
                        uploadForm.reset();
                        setTimeout(() => {
                            if (uploadPanel) uploadPanel.style.display = 'none';
                            if (toggleUploadBtn) toggleUploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload New Paper';
                        }, 1200);
                        loadAdminPapers();
                        loadAdminStats();
                    } else {
                        alert(data.message || 'Upload failed.');
                        btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Upload Failed`;
                        btn.style.background = '#ef4444';
                    }
                } catch (err) {
                    console.error('Upload Error:', err);
                    alert(err.message || 'Network error during upload.');
                    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Upload Failed`;
                    btn.style.background = '#ef4444';
                }
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            });
        }

        let adminPapersList = [];
        async function loadAdminPapers() {
            const tbody = document.getElementById('admin-papers-body');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading papers...</td></tr>';
            try {
                const res = await fetch(`${API_BASE}/papers?limit=100`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    adminPapersList = json.data;
                    if (adminPapersList.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No papers found in vault.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = adminPapersList.map(p => {
                        const status = (p.ragStatus || 'none').toLowerCase();
                        let badgeIcon = 'fa-circle-question';
                        if (status === 'ready') badgeIcon = 'fa-circle-check';
                        else if (status === 'pending') badgeIcon = 'fa-spinner fa-spin';
                        else if (status === 'failed') badgeIcon = 'fa-circle-xmark';

                        return `
                            <tr data-paper-id="${p._id}">
                                <td>
                                    <strong>${escapeHTML(p.title)}</strong>
                                    ${p.difficulty ? `<div style="font-size:0.75rem; color: var(--text-muted);">${escapeHTML(p.difficulty)}</div>` : ''}
                                </td>
                                <td>${escapeHTML(p.examType)}</td>
                                <td>${p.year}</td>
                                <td>${escapeHTML(p.subject || '-')}</td>
                                <td>
                                    <span class="status-badge ${status}">
                                        <i class="fa-solid ${badgeIcon}"></i> ${status}
                                    </span>
                                </td>
                                <td style="text-align: right; white-space: nowrap;">
                                    <button type="button" class="btn-table btn-edit-paper" data-id="${p._id}" title="Edit Details">
                                        <i class="fa-solid fa-pen"></i> Edit
                                    </button>
                                    <button type="button" class="btn-table btn-reindex-paper" data-id="${p._id}" title="Re-index">
                                        <i class="fa-solid fa-arrows-rotate"></i> Re-index
                                    </button>
                                    <button type="button" class="btn-table btn-replace-solution" data-id="${p._id}" data-title="${escapeHTML(p.title)}" title="Replace Solution PDF">
                                        <i class="fa-solid fa-file-arrow-up"></i> Solution
                                    </button>
                                    <button type="button" class="btn-table danger btn-delete-paper" data-id="${p._id}" title="Delete Paper">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');

                    tbody.querySelectorAll('.btn-edit-paper').forEach(btn => {
                        btn.addEventListener('click', () => openEditPaperModal(btn.dataset.id));
                    });
                    tbody.querySelectorAll('.btn-reindex-paper').forEach(btn => {
                        btn.addEventListener('click', () => handleReindexPaper(btn.dataset.id, btn));
                    });
                    tbody.querySelectorAll('.btn-replace-solution').forEach(btn => {
                        btn.addEventListener('click', () => openReplaceSolutionModal(btn.dataset.id, btn.dataset.title));
                    });
                    tbody.querySelectorAll('.btn-delete-paper').forEach(btn => {
                        btn.addEventListener('click', () => handleDeletePaper(btn.dataset.id));
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444;">Failed to load papers.</td></tr>';
                }
            } catch (err) {
                console.error('Error loading papers:', err);
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444;">Error loading papers.</td></tr>';
            }
        }

        // EDIT PAPER MODAL
        const editModal = document.getElementById('edit-paper-modal');
        const editForm = document.getElementById('edit-paper-form');
        function openEditPaperModal(paperId) {
            const paper = adminPapersList.find(p => p._id === paperId);
            if (!paper || !editModal) return;
            document.getElementById('edit-paper-id').value = paper._id;
            document.getElementById('edit-paper-title').value = paper.title || '';
            document.getElementById('edit-paper-exam').value = paper.examType || 'JEE Main';
            document.getElementById('edit-paper-year').value = paper.year || 2026;
            document.getElementById('edit-paper-subject').value = paper.subject || '';
            document.getElementById('edit-paper-difficulty').value = paper.difficulty || 'Moderate';
            document.getElementById('edit-paper-video').value = paper.videoUrl || '';
            document.getElementById('edit-paper-notes').value = paper.adminNotes || '';
            editModal.classList.add('open');
        }
        function closeEditPaperModal() {
            if (editModal) editModal.classList.remove('open');
        }
        document.getElementById('close-edit-modal-btn')?.addEventListener('click', closeEditPaperModal);
        document.getElementById('cancel-edit-btn')?.addEventListener('click', closeEditPaperModal);

        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const paperId = document.getElementById('edit-paper-id').value;
                const payload = {
                    title: document.getElementById('edit-paper-title').value.trim(),
                    examType: document.getElementById('edit-paper-exam').value,
                    year: Number(document.getElementById('edit-paper-year').value),
                    subject: document.getElementById('edit-paper-subject').value.trim(),
                    difficulty: document.getElementById('edit-paper-difficulty').value,
                    videoUrl: document.getElementById('edit-paper-video').value.trim(),
                    adminNotes: document.getElementById('edit-paper-notes').value.trim()
                };
                try {
                    const res = await fetch(`${API_BASE}/papers/${paperId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            ...getAuthHeaders()
                        },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();
                    if (res.ok && json.success) {
                        closeEditPaperModal();
                        loadAdminPapers();
                    } else {
                        alert(json.message || 'Failed to update paper details.');
                    }
                } catch (err) {
                    console.error('Update paper error:', err);
                    alert('Network error while updating paper.');
                }
            });
        }

        // RE-INDEX ACTION
        async function handleReindexPaper(paperId, btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;
            try {
                const res = await fetch(`${API_BASE}/papers/${paperId}/reindex`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    alert('Re-indexing initiated in the background.');
                    loadAdminPapers();
                    loadAdminStats();
                } else {
                    alert(json.message || 'Failed to start re-indexing.');
                }
            } catch (err) {
                console.error('Re-index error:', err);
                alert('Network error while requesting re-index.');
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        }

        // REPLACE SOLUTION MODAL
        const replaceModal = document.getElementById('replace-solution-modal');
        const replaceForm = document.getElementById('replace-solution-form');
        function openReplaceSolutionModal(paperId, paperTitle) {
            if (!replaceModal) return;
            document.getElementById('replace-solution-paper-id').value = paperId;
            const titleElem = document.getElementById('replace-solution-paper-title');
            if (titleElem) titleElem.textContent = `Paper: ${paperTitle || paperId}`;
            document.getElementById('replace-solution-file').value = '';
            replaceModal.classList.add('open');
        }
        function closeReplaceSolutionModal() {
            if (replaceModal) replaceModal.classList.remove('open');
        }
        document.getElementById('close-replace-modal-btn')?.addEventListener('click', closeReplaceSolutionModal);
        document.getElementById('cancel-replace-btn')?.addEventListener('click', closeReplaceSolutionModal);

        if (replaceForm) {
            replaceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const paperId = document.getElementById('replace-solution-paper-id').value;
                const fileInput = document.getElementById('replace-solution-file');
                if (!fileInput.files || fileInput.files.length === 0) {
                    alert('Please select a solution PDF file.');
                    return;
                }
                const btn = document.getElementById('replace-submit-btn');
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
                btn.disabled = true;

                const formData = new FormData();
                formData.append('solutionFile', fileInput.files[0]);

                try {
                    const res = await fetch(`${API_BASE}/papers/${paperId}/replace-solution`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: formData
                    });
                    const json = await res.json();
                    if (res.ok && json.success) {
                        alert('Solution PDF replaced and re-indexing started.');
                        closeReplaceSolutionModal();
                        loadAdminPapers();
                    } else {
                        alert(json.message || 'Failed to replace solution PDF.');
                    }
                } catch (err) {
                    console.error('Replace solution error:', err);
                    alert('Network error during solution replacement.');
                } finally {
                    btn.innerHTML = orig;
                    btn.disabled = false;
                }
            });
        }

        // DELETE PAPER ACTION
        async function handleDeletePaper(paperId) {
            if (!confirm('Are you sure you want to delete this paper? All indexed chunks and Cloudinary files will be deleted.')) {
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/papers/${paperId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    loadAdminPapers();
                    loadAdminStats();
                } else {
                    alert(json.message || 'Failed to delete paper.');
                }
            } catch (err) {
                console.error('Delete paper error:', err);
                alert('Network error while deleting paper.');
            }
        }

        // 3. USERS TAB & ACTIONS
        const userSearchInput = document.getElementById('admin-user-search-input');
        const userSearchBtn = document.getElementById('admin-user-search-btn');

        async function loadAdminUsers(search = '') {
            const tbody = document.getElementById('admin-users-body');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading users...</td></tr>';
            try {
                const queryParam = search ? `?search=${encodeURIComponent(search)}` : '';
                const res = await fetch(`${API_BASE}/admin/users${queryParam}`, {
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const users = json.data;
                    if (users.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = users.map(u => {
                        const isUserAdmin = u.role === 'admin';
                        const isSelf = currentUser && (currentUser._id === u.id || currentUser.id === u.id);
                        const roleBadge = isUserAdmin 
                            ? '<span class="status-badge" style="background: rgba(79, 70, 229, 0.15); color: var(--primary); font-weight:700;"><i class="fa-solid fa-shield-halved"></i> Admin</span>'
                            : '<span class="status-badge none">User</span>';
                        const verifiedBadge = u.isVerified 
                            ? '<span class="status-badge ready"><i class="fa-solid fa-check"></i> Verified</span>'
                            : '<span class="status-badge none">Unverified</span>';

                        const actionBtn = isUserAdmin
                            ? `<button type="button" class="btn-table danger btn-toggle-role" data-id="${u.id}" data-role="user" ${isSelf ? 'disabled title="You cannot demote yourself"' : ''}><i class="fa-solid fa-user-minus"></i> Remove Admin</button>`
                            : `<button type="button" class="btn-table btn-toggle-role" data-id="${u.id}" data-role="admin"><i class="fa-solid fa-user-shield"></i> Make Admin</button>`;

                        return `
                            <tr>
                                <td><strong>${escapeHTML(u.fullname || u.name || 'User')}</strong> ${isSelf ? '<span style="font-size:0.75rem; color:var(--text-muted);">(You)</span>' : ''}</td>
                                <td>${escapeHTML(u.email)}</td>
                                <td>${roleBadge}</td>
                                <td>${verifiedBadge}</td>
                                <td style="text-align: right; white-space: nowrap;">
                                    ${actionBtn}
                                </td>
                            </tr>
                        `;
                    }).join('');

                    tbody.querySelectorAll('.btn-toggle-role').forEach(btn => {
                        btn.addEventListener('click', () => handleToggleUserRole(btn.dataset.id, btn.dataset.role));
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Failed to load users.</td></tr>';
                }
            } catch (err) {
                console.error('Error loading users:', err);
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Error loading users.</td></tr>';
            }
        }

        async function handleToggleUserRole(userId, newRole) {
            const actionText = newRole === 'admin' ? 'promote this user to Admin' : 'remove Admin privileges from this user';
            if (!confirm(`Are you sure you want to ${actionText}?`)) return;

            try {
                const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({ role: newRole })
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    loadAdminUsers(userSearchInput ? userSearchInput.value.trim() : '');
                } else {
                    alert(json.message || 'Failed to update user role.');
                }
            } catch (err) {
                console.error('Toggle role error:', err);
                alert('Network error while updating role.');
            }
        }

        if (userSearchBtn && userSearchInput) {
            userSearchBtn.addEventListener('click', () => {
                loadAdminUsers(userSearchInput.value.trim());
            });
            userSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loadAdminUsers(userSearchInput.value.trim());
                }
            });
        }

        // 4. MESSAGES TAB & ACTIONS
        const adminMessagesGrid = document.getElementById('admin-messages-grid');
        async function fetchAdminMessages() {
            if (!adminMessagesGrid) return;
            adminMessagesGrid.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading messages...</div>';
            try {
                const res = await fetch(`${API_BASE}/messages?limit=50`, {
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                    adminMessagesGrid.innerHTML = data.data.map(msg => {
                        const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        const isRead = msg.status === 'read';
                        const safeSubject = escapeHTML(msg.subject || 'General Inquiry');
                        const safeName = escapeHTML(msg.userName || 'Student');
                        const safeEmail = escapeHTML(msg.userEmail || '');
                        const safeBody = escapeHTML(msg.body || '');
                        const mailSubject = encodeURIComponent(`Re: ${msg.subject || 'General Inquiry'}`);
                        const mailEmail = encodeURIComponent(msg.userEmail || '');

                        const statusBadge = isRead
                            ? '<span class="status-badge ready"><i class="fa-solid fa-check-double"></i> Read</span>'
                            : '<span class="status-badge pending"><i class="fa-solid fa-envelope"></i> Unread</span>';

                        return `
                            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid ${isRead ? 'var(--border-color)' : 'var(--primary)'}; margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                                    <div>
                                        <strong style="font-size: 1rem; color: var(--text-primary);">${safeSubject}</strong>
                                        <div style="margin-top: 0.25rem;">${statusBadge}</div>
                                    </div>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">${date}</span>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                                    From: <strong style="color: var(--text-secondary);">${safeName}</strong> &lt;${safeEmail}&gt;
                                </div>
                                <p style="margin: 0 0 1.25rem 0; font-size: 0.95rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${safeBody}</p>
                                <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center;">
                                    <a href="mailto:${mailEmail}?subject=${mailSubject}" class="btn-table" style="text-decoration: none;">
                                        <i class="fa-solid fa-reply"></i> Reply via Email
                                    </a>
                                    ${!isRead ? `<button type="button" class="btn-table btn-mark-read" data-id="${msg._id}"><i class="fa-solid fa-check"></i> Mark as Read</button>` : ''}
                                    <button type="button" class="btn-table danger btn-delete-msg" data-id="${msg._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                                </div>
                            </div>
                        `;
                    }).join('');

                    adminMessagesGrid.querySelectorAll('.btn-mark-read').forEach(btn => {
                        btn.addEventListener('click', () => handleMarkMessageRead(btn.dataset.id));
                    });
                    adminMessagesGrid.querySelectorAll('.btn-delete-msg').forEach(btn => {
                        btn.addEventListener('click', () => handleDeleteMessage(btn.dataset.id));
                    });
                } else {
                    adminMessagesGrid.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No messages from students yet.</div>';
                }
            } catch (err) {
                console.error('Failed to load inbox:', err);
                adminMessagesGrid.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 2rem;">Error loading inbox.</div>';
            }
        }

        async function handleMarkMessageRead(messageId) {
            try {
                const res = await fetch(`${API_BASE}/admin/messages/${messageId}/read`, {
                    method: 'PATCH',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    fetchAdminMessages();
                } else {
                    alert(json.message || 'Failed to mark message as read.');
                }
            } catch (err) {
                console.error('Mark read error:', err);
            }
        }

        async function handleDeleteMessage(messageId) {
            if (!confirm('Are you sure you want to delete this message?')) return;
            try {
                const res = await fetch(`${API_BASE}/admin/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    fetchAdminMessages();
                } else {
                    alert(json.message || 'Failed to delete message.');
                }
            } catch (err) {
                console.error('Delete message error:', err);
            }
        }

        // 5. COMMENTS TAB & ACTIONS
        async function loadAdminComments() {
            const tbody = document.getElementById('admin-comments-body');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</td></tr>';
            try {
                const res = await fetch(`${API_BASE}/admin/comments`, {
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const comments = json.data;
                    if (comments.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No comments found across papers.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = comments.map(c => {
                        const date = new Date(c.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                        });
                        return `
                            <tr>
                                <td><strong>${escapeHTML(c.paperTitle || 'Untitled Paper')}</strong></td>
                                <td>${escapeHTML(c.userName || 'Student')}</td>
                                <td style="max-width: 320px; word-break: break-word;">${escapeHTML(c.text)}</td>
                                <td style="white-space: nowrap; font-size: 0.8rem; color: var(--text-muted);">${date}</td>
                                <td style="text-align: right; white-space: nowrap;">
                                    <button type="button" class="btn-table danger btn-delete-comment" data-paper-id="${c.paperId}" data-comment-id="${c.commentId}">
                                        <i class="fa-solid fa-trash"></i> Delete
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');

                    tbody.querySelectorAll('.btn-delete-comment').forEach(btn => {
                        btn.addEventListener('click', () => handleDeleteComment(btn.dataset.paperId, btn.dataset.commentId));
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Failed to load comments.</td></tr>';
                }
            } catch (err) {
                console.error('Error loading comments:', err);
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Error loading comments.</td></tr>';
            }
        }

        async function handleDeleteComment(paperId, commentId) {
            if (!confirm('Are you sure you want to delete this comment?')) return;
            try {
                const res = await fetch(`${API_BASE}/admin/comments/${paperId}/${commentId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    loadAdminComments();
                    loadAdminStats();
                } else {
                    alert(json.message || 'Failed to delete comment.');
                }
            } catch (err) {
                console.error('Delete comment error:', err);
                alert('Network error while deleting comment.');
            }
        }

        // Auto-fetch initial dashboard stats on page load
        loadAdminStats();
    }
    // ==========================================
    // 🚫 SYSTEM 14: ADMIN ROUTE SECURITY LOCK
    // ==========================================
    const isAdminPage = window.location.pathname.includes('admin.html');

    if (isAdminPage) {
        if (!isAdmin(currentUser)) {
            window.location.replace(token ? 'index.html' : 'login.html');
        }
    }

    document.querySelectorAll('[data-navigation-target]').forEach((card) => {
        const navigate = () => window.location.assign(card.dataset.navigationTarget);
        card.addEventListener('click', navigate);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate();
            }
        });
    });

    // Exam Page Category Filter (exam.html)
    const isExamPage = window.location.pathname.includes('exam.html');
    if (isExamPage) {
        const examFilterBtns = document.querySelectorAll('.papers-filter .filter-btn');
        const examCards = document.querySelectorAll('.exam-grid .exam-card');

        examFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                examFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const category = btn.textContent.trim().toLowerCase();
                examCards.forEach(card => {
                    const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
                    if (category === 'all exams' || cardCategory === category) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // Account deletion notice (dashboard.html)
    const deleteAccountBtn = document.querySelector('.danger-zone .profile-tool-btn.danger');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            alert('Account deletion is not yet available online. Please contact the administrator.');
        });
    }
// ==========================================
    // 📨 SYSTEM 15: CONTACT FORM SUBMISSION
    // ==========================================
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const contactNameInput = document.getElementById('contact-name');
        const contactEmailInput = document.getElementById('contact-email');
        if (currentUser) {
            if (contactNameInput && currentUser.fullname) contactNameInput.value = currentUser.fullname;
            if (contactEmailInput && currentUser.email) contactEmailInput.value = currentUser.email;
        }

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('contact-form-status');
            const subject = document.getElementById('contact-subject').value;
            const body = document.getElementById('contact-message').value;

            if (!token) {
                status.textContent = 'Please sign in before sending a message.';
                return;
            }

        try {
            const res = await fetch(`${API_BASE}/messages`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ subject, body })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                status.textContent = 'Message sent to the admin.';
                contactForm.reset();
            } else {
                status.textContent = data.message || 'Unable to send your message.';
            }
        } catch (err) {
            console.error('Contact message submission failed:', err);
            status.textContent = 'Unable to send your message. Please try again.';
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
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAuthHeaders()
    })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load save status');
            return data;
        })
        .then((data) => updateSavedPaperButton(saveButton, data.saved))
        .catch((err) => console.error('Save status loading failed:', err));
}

// =========================================================================
// ?? MASTER ACTION ENGINE (Bulletproof Save Toggle + Smart PDF Download)
// =========================================================================
document.addEventListener('click', async (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    const paperId = urlParams.get('id');

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
                headers: getAuthHeaders()
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

    const downloadBtn = e.target.closest('#download-pdf-btn');
    if (downloadBtn) {
        if (currentPaperId && downloadBtn.getAttribute('href') && downloadBtn.getAttribute('href') !== '#') {
            e.preventDefault();
            try {
                const response = await fetch(`${API_BASE}/papers/${encodeURIComponent(currentPaperId)}/download`, { method: 'POST' });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error('Download unavailable');
                window.location.assign(toAbsoluteResourceUrl(data.url));
            } catch (error) {
                showToast('Download is unavailable right now.', 'error');
            }
            return;
        }
        const currentHref = downloadBtn.getAttribute('href');
        if (!currentHref || currentHref === '#' || currentHref === '') {
            e.preventDefault();
            const iframe = document.getElementById('pdf-frame');
            if (iframe && iframe.src && iframe.src !== window.location.href && iframe.src !== 'about:blank') {
                window.open(iframe.src, '_blank');
            } else {
                alert('PDF is still loading or is not available on the server yet.');
            }
        }
        return;
    }
});
/**
 * ExamVault Core Frontend Logic
 * Note: AI Study Assistant logic is handled entirely in ai-assistant.js.
 */

document.addEventListener('DOMContentLoaded', () => {
    initUtilityFunctions();
});

function initUtilityFunctions() {
    // Utility to securely escape HTML
    window.escapeHTML = function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };
}