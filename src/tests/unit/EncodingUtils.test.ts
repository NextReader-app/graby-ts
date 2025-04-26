import { describe, vi, it, expect } from 'vitest';
import { EncodingUtils } from '../../lib/EncodingUtils.js';
import iconv from 'iconv-lite';

describe('EncodingUtils', () => {
  describe('detectEncodingFromHeaders', () => {
    it('should detect encoding from Content-Type header', () => {
      const headers = {
        'content-type': 'text/html; charset=utf-8'
      };
      expect(EncodingUtils.detectEncodingFromHeaders(headers)).toBe('utf-8');
    });

    it('should return null if no encoding in headers', () => {
      const headers = {
        'content-type': 'text/html'
      };
      expect(EncodingUtils.detectEncodingFromHeaders(headers)).toBeNull();
    });

    it('should handle quoted charset values', () => {
      const headers = {
        'content-type': 'text/html; charset="iso-8859-1"'
      };
      expect(EncodingUtils.detectEncodingFromHeaders(headers)).toBe('iso-8859-1');
    });

    it('should fix common encoding mistakes', () => {
      const headers = {
        'content-type': 'text/html; charset=iso-8850-1'
      };
      expect(EncodingUtils.detectEncodingFromHeaders(headers)).toBe('iso-8859-1');
    });
  });

  describe('fixCommonEncodingMistakes', () => {
    it('should fix iso-8850-1 to iso-8859-1', () => {
      expect(EncodingUtils.fixCommonEncodingMistakes('iso-8850-1')).toBe('iso-8859-1');
    });

    it('should convert windows to windows-1252', () => {
      expect(EncodingUtils.fixCommonEncodingMistakes('windows')).toBe('windows-1252');
    });

    it('should handle uppercase and trim input', () => {
      expect(EncodingUtils.fixCommonEncodingMistakes('  WIN  ')).toBe('windows-1252');
    });

    it('should return the same encoding if no fix is needed', () => {
      expect(EncodingUtils.fixCommonEncodingMistakes('utf-8')).toBe('utf-8');
    });
  });

  describe('detectEncodingFromHtml', () => {
    it('should detect UTF-8 encoding from content', () => {
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>Test</body></html>';
      const bytes = Buffer.from(html);
      expect(EncodingUtils.detectEncodingFromHtml(bytes)).toBe('utf-8');
    });

    it('should detect encoding from XML declaration', () => {
      const html = '<?xml version="1.0" encoding="windows-1251"?><html><body>Test</body></html>';
      const bytes = Buffer.from(html);
      expect(EncodingUtils.detectEncodingFromHtml(bytes)).toBe('windows-1251');
    });

    it('should detect encoding from meta http-equiv', () => {
      const html = '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1"></head><body>Test</body></html>';
      const bytes = Buffer.from(html);
      expect(EncodingUtils.detectEncodingFromHtml(bytes)).toBe('iso-8859-1');
    });

    it('should limit analysis to MAX_CHARSET_DETECTION_SIZE', () => {
      // Create a large HTML document with encoding defined beyond the limit
      let html = '<!DOCTYPE html><html><head><title>Large Document</title></head><body>';
      // Add content to exceed the limit
      for (let i = 0; i < 60000; i++) {
        html += 'x';
      }
      html += '<meta charset="koi8-r"></body></html>';

      const bytes = Buffer.from(html);
      // The charset declaration is beyond the limit, so it should default to utf-8
      expect(EncodingUtils.detectEncodingFromHtml(bytes)).toBe('utf-8');
    });
  });

  describe('convertToUtf8', () => {
    it('should convert windows-1251 to UTF-8', () => {
      // Text in windows-1251: "Привет, мир!"
      const win1251Bytes = iconv.encode('Привет, мир!', 'windows-1251');
      const utf8String = EncodingUtils.convertToUtf8(win1251Bytes, 'windows-1251');
      expect(utf8String).toBe('Привет, мир!');
    });

    it('should handle UTF-8 input correctly', () => {
      const utf8Text = 'Hello, world! UTF-8 already.';
      const bytes = Buffer.from(utf8Text);
      expect(EncodingUtils.convertToUtf8(bytes, 'utf-8')).toBe(utf8Text);
    });

    it('should handle unsupported encodings by falling back to UTF-8', () => {
      const text = 'Some text with unsupported encoding claim';
      const bytes = Buffer.from(text);

      // Mock console.warn to prevent test output pollution
      const originalWarn = console.warn;
      console.warn = vi.fn();

      // Test with non-existent encoding
      const result = EncodingUtils.convertToUtf8(bytes, 'non-existent-encoding');

      // Restore console.warn
      console.warn = originalWarn;

      expect(result).toBe(text);
    });

    it('should handle special characters for ISO-8859-1', () => {
      // Some text with special Windows-1252 characters
      // This includes characters like smart quotes, em dash, etc.
      const specialChars = Buffer.from([0x93, 0x94, 0x97]); // Left/right double quotes and em dash in Windows-1252
      const result = EncodingUtils.convertToUtf8(specialChars, 'iso-8859-1');

      // Check that special characters were converted to HTML entities
      expect(result).toContain('&ldquo;'); // Left double quote
      expect(result).toContain('&rdquo;'); // Right double quote
      expect(result).toContain('&mdash;'); // Em dash
    });
  });
});