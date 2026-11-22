const { PDFParse } = require('pdf-parse');

/**
 * Extracts text per page from a PDF buffer using pdf-parse v2 API.
 * 
 * @param {Buffer} buffer - Raw PDF buffer
 * @returns {Promise<Array<{ page: number, text: string }>>} Array of page objects with 1-based page number and text
 * @throws {Error} If buffer is invalid or PDF has under 200 characters of selectable text
 */
const extractPdfPages = async (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Invalid PDF buffer provided.');
    }

    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();

        const rawFullText = (result && typeof result.text === 'string') ? result.text.trim() : '';
        if (rawFullText.length < 200) {
            throw new Error('PDF has no selectable text (scanned)');
        }

        const pages = [];
        if (result && Array.isArray(result.pages)) {
            for (let i = 0; i < result.pages.length; i++) {
                const p = result.pages[i];
                pages.push({
                    page: Number(p.num) || (i + 1),
                    text: typeof p.text === 'string' ? p.text.trim() : ''
                });
            }
        }

        const totalCharacters = pages.reduce((acc, curr) => acc + curr.text.length, 0);
        if (totalCharacters < 200) {
            throw new Error('PDF has no selectable text (scanned)');
        }

        return pages;
    } finally {
        if (typeof parser.destroy === 'function') {
            await parser.destroy().catch(() => {});
        }
    }
};

module.exports = {
    extractPdfPages
};
