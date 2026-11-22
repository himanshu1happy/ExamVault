/**
 * server/services/chunker.js
 * 
 * Intelligent PDF text chunker:
 * - Splits by question-number patterns (Q1., Q.1, 1., 1), Question 1, (1), Ans 1, Sol. 1).
 * - Stricter question detection regex that avoids splitting on option lists (e.g. "(1) 5 (2) 10") or numbered steps.
 * - Detects section/subject headings (Physics, Chemistry, Mathematics, Maths, Biology, Botany, Zoology, Section A/B).
 * - Fallback to sliding window (~350 words, 60 words overlap, questionNo: null) if < 3 questions detected.
 * - Caps any chunk at ~900 words by splitting.
 */

// Matches subject/section headings across competitive exams (JEE, NEET, etc.)
const SECTION_HEADING_REGEX = /^\s*(?:(?:SECTION|PART)\s*[-:]?\s*[A-Z0-9](?:\s*[-:]\s*)?|\s*)*(?:PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|BIOLOGY|BOTANY|ZOOLOGY)(?:\s*[-:]\s*(?:SECTION|PART)?\s*[A-Z0-9])?\s*$/i;
const SECTION_LETTER_ONLY_REGEX = /^\s*(?:SECTION|PART)\s*[-:]?\s*([A-Z0-9])\s*$/i;

/**
 * Checks if a line is a section/subject heading.
 * @param {string} line
 * @returns {string|null}
 */
const detectSectionHeading = (line) => {
    if (!line || typeof line !== 'string') return null;
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 60) return null;

    if (SECTION_HEADING_REGEX.test(trimmed)) {
        return trimmed;
    }
    if (SECTION_LETTER_ONLY_REGEX.test(trimmed)) {
        return trimmed;
    }
    return null;
};

/**
 * Checks if a line is an option list (e.g., "(1) 5 (2) 10" or "(A) x (B) y").
 * Should NOT trigger a new question chunk.
 * @param {string} line
 * @returns {boolean}
 */
const isOptionListLine = (line) => {
    if (!line) return false;
    const trimmed = line.trim();
    // Matches lines containing multiple option indicators
    return /(?:\([1-4a-d]\)|\b[1-4a-d]\))\s+.*(?:\([1-4a-d]\)|\b[1-4a-d]\))/i.test(trimmed);
};

// Stricter regex for question/solution/answer start anchored at beginning of line
const QUESTION_START_REGEX = /^\s*(?:Q(?:uestion)?\.?\s*(\d+)[:.)\-\s]?|Q(\d+)[:.)\-]|Sol(?:ution)?\.?\s*(\d+)[:.)\-\s]?|Ans(?:wer)?\.?\s*(\d+)[:.)\-\s]?|(\d+)[.)]\s+|^\((\d+)\)\s+)/i;

/**
 * Split a chunk's text if it exceeds maxWords.
 * 
 * @param {Array<{ questionNo: number|null, section?: string|null, text: string, page: number }>} chunks
 * @param {number} maxWords
 * @returns {Array<{ questionNo: number|null, section?: string|null, text: string, page: number }>}
 */
const capChunkWords = (chunks, maxWords = 900) => {
    const capped = [];

    for (const chunk of chunks) {
        const words = chunk.text.trim().split(/\s+/).filter(Boolean);
        if (words.length <= maxWords) {
            capped.push(chunk);
        } else {
            for (let i = 0; i < words.length; i += maxWords) {
                const slice = words.slice(i, i + maxWords);
                capped.push({
                    questionNo: chunk.questionNo,
                    section: chunk.section || null,
                    text: slice.join(' '),
                    page: chunk.page
                });
            }
        }
    }

    return capped;
};

/**
 * Fallback sliding window over pages: ~350 words with 60 words overlap, questionNo: null.
 * Preserves detected sections.
 * 
 * @param {Array<{ page: number, text: string }>} pages
 * @param {number} windowSize
 * @param {number} overlap
 * @returns {Array<{ questionNo: null, section: string|null, text: string, page: number }>}
 */
const buildSlidingWindowChunks = (pages, windowSize = 350, overlap = 60) => {
    const chunks = [];
    const step = Math.max(1, windowSize - overlap);
    let currentSection = null;

    for (const pageObj of pages) {
        const pageNum = pageObj.page;
        const pageLines = (pageObj.text || '').split('\n');

        // Check if a section header exists on this page
        for (const line of pageLines) {
            const detected = detectSectionHeading(line);
            if (detected) currentSection = detected;
        }

        const words = (pageObj.text || '').trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) continue;

        if (words.length <= windowSize) {
            chunks.push({
                questionNo: null,
                section: currentSection || null,
                text: words.join(' '),
                page: pageNum
            });
            continue;
        }

        for (let i = 0; i < words.length; i += step) {
            const slice = words.slice(i, i + windowSize);
            if (slice.length === 0) break;

            chunks.push({
                questionNo: null,
                section: currentSection || null,
                text: slice.join(' '),
                page: pageNum
            });

            if (i + windowSize >= words.length) break;
        }
    }

    return chunks;
};

/**
 * Split extracted pages into chunks.
 * Primary: Stricter question-number pattern detection with section tracking.
 * Fallback: Sliding window if < 3 question markers found.
 * 
 * @param {Array<{ page: number, text: string }>} pages
 * @returns {Array<{ questionNo: number|null, section: string|null, text: string, page: number }>}
 */
const splitByQuestions = (pages) => {
    if (!Array.isArray(pages) || pages.length === 0) return [];

    const rawChunks = [];
    let currentChunk = null;
    let currentSection = null;

    for (const pageObj of pages) {
        const pageNum = pageObj.page;
        const lines = (pageObj.text || '').split('\n');

        for (const line of lines) {
            const detectedSection = detectSectionHeading(line);
            if (detectedSection) {
                currentSection = detectedSection;
            }

            // Check if this line is an option list (e.g. "(1) 5 (2) 10")
            if (isOptionListLine(line)) {
                if (currentChunk) {
                    currentChunk.text += '\n' + line;
                }
                continue;
            }

            const match = line.match(QUESTION_START_REGEX);
            if (match) {
                // Find first non-undefined captured digit group
                const numStr = match.slice(1).find(x => x !== undefined);
                const questionNo = numStr ? parseInt(numStr, 10) : null;

                // Validate reasonable exam question number (1 to 200)
                if (Number.isFinite(questionNo) && questionNo >= 1 && questionNo <= 200) {
                    if (currentChunk && currentChunk.text.trim()) {
                        rawChunks.push(currentChunk);
                    }

                    currentChunk = {
                        questionNo,
                        section: currentSection || null,
                        text: line,
                        page: pageNum
                    };
                    continue;
                }
            }

            if (currentChunk) {
                currentChunk.text += '\n' + line;
            }
        }
    }

    if (currentChunk && currentChunk.text.trim()) {
        rawChunks.push(currentChunk);
    }

    // Fallback: If fewer than 3 question markers are found across the entire document
    if (rawChunks.length < 3) {
        const slidingChunks = buildSlidingWindowChunks(pages, 350, 60);
        return capChunkWords(slidingChunks, 900);
    }

    // Clean up texts and apply the ~900 words ceiling
    const cleaned = rawChunks.map(c => ({
        questionNo: c.questionNo,
        section: c.section || null,
        text: c.text.trim(),
        page: c.page
    })).filter(c => c.text.length > 0);

    return capChunkWords(cleaned, 900);
};

module.exports = {
    splitByQuestions,
    buildSlidingWindowChunks,
    capChunkWords
};
