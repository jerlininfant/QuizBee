import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class FileService {
  /**
   * Extract text from uploaded buffer depending on mimetype or extension
   * @param {Object} file - Multer file object
   * @returns {Promise<string>}
   */
  static async extractText(file) {
    if (!file || !file.buffer) {
      return '';
    }

    const filename = (file.originalname || '').toLowerCase();
    const mimeType = file.mimetype || '';

    // 1. TXT file
    if (filename.endsWith('.txt') || mimeType === 'text/plain') {
      try {
        return file.buffer.toString('utf-8');
      } catch (e) {
        return file.buffer.toString('ascii');
      }
    }

    // 2. PDF file
    if (filename.endsWith('.pdf') || mimeType === 'application/pdf') {
      try {
        const data = await pdfParse(file.buffer);
        if (data && data.text && data.text.trim().length > 10) {
          return data.text.trim();
        }
      } catch (err) {
        console.warn('[FileService] PDF parsing note:', err.message);
      }

      // Fallback extraction for text from PDF raw stream
      try {
        const str = file.buffer.toString('latin1');
        const matches = str.match(/\(([^()]{3,})\)Tj/g) || str.match(/[A-Za-z0-9 ,.?!:;'-]{4,}/g);
        if (matches && matches.length > 0) {
          return matches
            .map(m => m.replace(/^[()]|[()]Tj$/g, '').trim())
            .filter(s => s.length > 3)
            .join(' ');
        }
      } catch (fallbackErr) {
        console.warn('[FileService] PDF text stream extraction notice:', fallbackErr.message);
      }
      return '';
    }

    // 3. DOCX file
    if (
      filename.endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        if (result && result.value) {
          return result.value.trim();
        }
      } catch (err) {
        console.warn('[FileService] DOCX parsing note:', err.message);
      }

      // Fallback: extract XML text from docx zip stream
      try {
        const str = file.buffer.toString('utf-8');
        const matches = str.match(/<w:t[^>]*>(.*?)<\/w:t>/gi);
        if (matches && matches.length > 0) {
          return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        }
      } catch (e) {}
      return '';
    }

    // 4. PPTX file
    if (
      filename.endsWith('.pptx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      try {
        const textContent = file.buffer.toString('utf-8');
        const matches = textContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi);
        if (matches && matches.length > 0) {
          return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        }
      } catch (err) {
        console.warn('[FileService] PPTX XML extraction note:', err.message);
      }

      // Stream fallback: extract readable ASCII sequences
      try {
        const latin = file.buffer.toString('latin1');
        const readable = latin.match(/[A-Za-z0-9 ,.?!'-]{5,}/g);
        if (readable && readable.length > 0) {
          return readable.slice(0, 500).join(' ');
        }
      } catch (e) {}
      return '';
    }

    // Default fallback try UTF-8 string
    try {
      return file.buffer.toString('utf-8');
    } catch {
      return '';
    }
  }
}
