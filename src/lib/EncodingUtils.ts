import chardet from 'chardet';
import iconv from 'iconv-lite';

/**
 * Maximum number of bytes to analyze for charset detection
 * This prevents analyzing huge documents
 */
const MAX_CHARSET_DETECTION_SIZE = 50000;

/**
 * Utility class for handling text encoding detection and conversion
 */
export class EncodingUtils {
  /**
   * Detect encoding from HTTP headers
   * @param headers - HTTP response headers
   * @returns Detected encoding or null if not found
   */
  static detectEncodingFromHeaders(headers: Record<string, string>): string | null {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    let encoding: string | null = null;

    // Try to extract charset from Content-Type header
    if (contentType && contentType.includes('charset=')) {
      const matches = contentType.match(/charset=["']?([^"';]+)/i);
      if (matches && matches[1]) {
        encoding = matches[1].trim();
      }
    }

    // Try Content-Language header as a fallback for language detection
    if (!encoding) {
      const contentLanguage = headers['content-language'] || headers['Content-Language'] || '';
      if (contentLanguage) {
        // This doesn't give us encoding but can be useful for language detection
        // We'll return null here as we couldn't determine the actual encoding
        return null;
      }
    }

    return encoding ? EncodingUtils.fixCommonEncodingMistakes(encoding) : null;
  }

  /**
   * Detect encoding from HTML content
   * @param bytes - Raw HTML content as Uint8Array
   * @returns Detected encoding or 'utf-8' as fallback
   */
  static detectEncodingFromHtml(bytes: Uint8Array): string {
    // Limit buffer size for performance
    const sampleBytes = bytes.length > MAX_CHARSET_DETECTION_SIZE
      ? bytes.slice(0, MAX_CHARSET_DETECTION_SIZE)
      : bytes;

    // Try to detect encoding from content
    let encoding: string | null = null;
    let chardetResult: string | null = null;

    // First, try to detect encoding with chardet
    try {
      const detectedEncoding = chardet.detect(sampleBytes);
      if (detectedEncoding) {
        chardetResult = detectedEncoding.toLowerCase();
        encoding = chardetResult;
      }
    } catch (e) {
      console.error('Error detecting encoding with chardet:', e);
    }

    // Check HTML for encoding declaration if chardet failed or detected ASCII
    // ASCII detection from chardet usually happens with HTML that only contains ASCII
    // in the analyzed section but may specify a different encoding in meta tags
    if (!encoding || encoding === 'ascii') {
      // Convert to string for regex analysis - use ASCII which should be safe for meta tags
      // iconv-lite requires Buffer, so convert Uint8Array to Buffer
      const htmlHead = iconv.decode(Buffer.from(sampleBytes), 'ascii');

      // Try to find encoding in XML declaration
      const xmlMatch = htmlHead.match(/^<\?xml\s+version=(?:"[^"]*"|'[^']*')\s+encoding=("[^"]*"|'[^']*')/i);
      if (xmlMatch) {
        encoding = xmlMatch[1].replace(/['"]/g, '');
      }
      // Try to find in meta http-equiv
      else if (htmlHead.match(/<meta\s+http-equiv\s*=\s*["']?Content-Type["']?/i)) {
        const metaMatch = htmlHead.match(/<meta\s+http-equiv\s*=\s*["']?Content-Type["']?\s+content\s*=\s*["'][^;]+;\s*charset=["']?([^;"'>]+)/i);
        if (metaMatch) {
          encoding = metaMatch[1];
        }
      }
      // Try to find in meta charset
      else {
        const charsetMatch = htmlHead.match(/<meta\s+charset\s*=\s*["']?([^"'>\s]+)/i);
        if (charsetMatch) {
          encoding = charsetMatch[1];
        } else {
          // Check all meta tags
          const metaTags = htmlHead.match(/<meta\s+([^>]+)>/ig);
          if (metaTags) {
            for (const metaTag of metaTags) {
              if (metaTag.match(/charset\s*=\s*["']?([^"']+)/i)) {
                const match = metaTag.match(/charset\s*=\s*["']?([^"'>\s]+)/i);
                if (match) {
                  encoding = match[1];
                  break;
                }
              }
            }
          }
        }
      }
    }

    // If we couldn't detect encoding, default to utf-8
    if (!encoding) {
      return 'utf-8';
    }

    // If we detected ASCII with chardet, but couldn't find any encoding declaration in HTML,
    // treat it as UTF-8 (since ASCII is a subset of UTF-8)
    if (encoding === 'ascii') {
      return 'utf-8';
    }

    return EncodingUtils.fixCommonEncodingMistakes(encoding);
  }

  /**
   * Convert Uint8Array to UTF-8 string
   * @param bytes - Raw content as Uint8Array
   * @param encoding - Source encoding
   * @returns UTF-8 encoded string
   */
  static convertToUtf8(bytes: Uint8Array, encoding: string): string {
    // Fix common encoding mistakes
    encoding = EncodingUtils.fixCommonEncodingMistakes(encoding);

    // If encoding is already UTF-8, we can simply decode it
    if (encoding.toLowerCase() === 'utf-8' || encoding.toLowerCase() === 'utf8') {
      // iconv-lite requires Buffer, so convert Uint8Array to Buffer
      return iconv.decode(Buffer.from(bytes), 'utf8');
    }

    // Check if encoding is supported by iconv-lite
    if (!iconv.encodingExists(encoding)) {
      console.warn(`Encoding '${encoding}' is not supported by iconv-lite, falling back to utf-8`);
      return iconv.decode(Buffer.from(bytes), 'utf8');
    }

    // Convert from detected encoding to UTF-8
    try {
      // iconv-lite requires Buffer, so convert Uint8Array to Buffer
      const decodedText = iconv.decode(Buffer.from(bytes), encoding);

      // Apply special character handling for certain encodings
      return EncodingUtils.handleSpecialChars(decodedText, encoding);
    } catch (e) {
      console.error(`Error converting from ${encoding} to UTF-8:`, e);
      // Fallback to UTF-8 if conversion fails
      return iconv.decode(Buffer.from(bytes), 'utf8');
    }
  }

  /**
   * Fix common encoding mistakes
   * @param encoding - Original encoding string
   * @returns Corrected encoding string
   */
  static fixCommonEncodingMistakes(encoding: string): string {
    encoding = encoding.toLowerCase().trim();

    // Common encoding mistakes
    const encodingMap: Record<string, string> = {
      'iso-8850-1': 'iso-8859-1',
      'windows': 'windows-1252', // Sometimes specified incorrectly
      'win': 'windows-1252',
      'cp1251': 'windows-1251',
      'cp1252': 'windows-1252',
      'latin1': 'iso-8859-1',
      'latin-1': 'iso-8859-1',
      'unicode': 'utf-8',
      'utf': 'utf-8',
      'none': 'utf-8', // Some sites set "none" as encoding
    };

    return encodingMap[encoding] || encoding;
  }

  /**
   * Handle special characters for certain encodings
   * @param text - Decoded text
   * @param sourceEncoding - Original encoding
   * @returns Processed text
   */
  static handleSpecialChars(text: string, sourceEncoding: string): string {
    // Apply special handling for ISO-8859-1 (similar to PHP Graby implementation)
    if (sourceEncoding.toLowerCase() === 'iso-8859-1') {
      // Replace MS Word smart quotes and special chars with HTML entities
      const specialChars: Record<string, string> = {
        '\u0082': '&sbquo;', // Single Low-9 Quotation Mark
        '\u0083': '&fnof;',  // Latin Small Letter F With Hook
        '\u0084': '&bdquo;', // Double Low-9 Quotation Mark
        '\u0085': '&hellip;', // Horizontal Ellipsis
        '\u0086': '&dagger;', // Dagger
        '\u0087': '&Dagger;', // Double Dagger
        '\u0088': '&circ;',   // Modifier Letter Circumflex Accent
        '\u0089': '&permil;', // Per Mille Sign
        '\u008A': '&Scaron;', // Latin Capital Letter S With Caron
        '\u008B': '&lsaquo;', // Single Left-Pointing Angle Quotation Mark
        '\u008C': '&OElig;',  // Latin Capital Ligature OE
        '\u0091': '&lsquo;',  // Left Single Quotation Mark
        '\u0092': '&rsquo;',  // Right Single Quotation Mark
        '\u0093': '&ldquo;',  // Left Double Quotation Mark
        '\u0094': '&rdquo;',  // Right Double Quotation Mark
        '\u0095': '&bull;',   // Bullet
        '\u0096': '&ndash;',  // En Dash
        '\u0097': '&mdash;',  // Em Dash
        '\u0098': '&tilde;',  // Small Tilde
        '\u0099': '&trade;',  // Trade Mark Sign
        '\u009A': '&scaron;', // Latin Small Letter S With Caron
        '\u009B': '&rsaquo;', // Single Right-Pointing Angle Quotation Mark
        '\u009C': '&oelig;',  // Latin Small Ligature OE
        '\u009F': '&Yuml;',   // Latin Capital Letter Y With Diaeresis
      };

      return Object.entries(specialChars).reduce(
        (result, [char, entity]) => result.replace(new RegExp(char, 'g'), entity),
        text
      );
    }

    return text;
  }
}

export default EncodingUtils;