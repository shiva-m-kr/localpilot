import { ValidationFailedError } from '../errors.js';

export class ContentSanitizer {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
  ]);

  /**
   * Validates file signature (magic bytes) against declared MIME type.
   */
  static validateImageBuffer(buffer: Buffer, declaredMimeType: string): void {
    if (!this.ALLOWED_MIME_TYPES.has(declaredMimeType.toLowerCase())) {
      throw new ValidationFailedError(`MIME type '${declaredMimeType}' is not supported. Allowed: JPEG, PNG, WebP.`);
    }

    if (buffer.length < 4) {
      throw new ValidationFailedError('Buffer is too short to be a valid image file.');
    }

    // Magic Bytes Checks
    const hex = buffer.subarray(0, 4).toString('hex').toUpperCase();

    if (declaredMimeType === 'image/jpeg') {
      // JPEG starts with FF D8 FF
      if (!hex.startsWith('FFD8FF')) {
        throw new ValidationFailedError('File signature does not match declared JPEG MIME type.');
      }
    } else if (declaredMimeType === 'image/png') {
      // PNG starts with 89 50 4E 47
      if (hex !== '89504E47') {
        throw new ValidationFailedError('File signature does not match declared PNG MIME type.');
      }
    } else if (declaredMimeType === 'image/webp') {
      // WebP starts with RIFF (52 49 46 46)
      if (hex !== '52494646') {
        throw new ValidationFailedError('File signature does not match declared WebP MIME type.');
      }
    }
  }

  /**
   * Sanitizes untrusted crawled HTML or imported business description strings,
   * stripping executable script tags, event handlers, and javascript: links.
   */
  static sanitizeHtml(rawHtml: string): string {
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Strip iframes
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')                     // Strip on* event handlers (e.g. onerror=, onclick=)
      .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/javascript:[^"'\s>]+/gi, '#');                            // Neutralize javascript: URIs
  }

  /**
   * HTML escapes a string to prevent XSS when embedding text inside HTML documents.
   */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
