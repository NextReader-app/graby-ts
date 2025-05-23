import { describe, test, expect, vi } from 'vitest';
import DomUtils from '../../lib/DomUtils.js';
import URLParse from 'url-parse';

describe('DomUtils', () => {
  test('makeUrlsAbsolute converts relative URLs to absolute', () => {
    // Create mock element with query results
    const mockLinks = [
      { getAttribute: vi.fn().mockReturnValue('/relative-link'), setAttribute: vi.fn() },
      { getAttribute: vi.fn().mockReturnValue('https://absolute-link.com'), setAttribute: vi.fn() },
      { getAttribute: vi.fn().mockReturnValue('#'), setAttribute: vi.fn() }
    ];
    
    const mockImages = [
      { getAttribute: vi.fn().mockReturnValue('/relative-image.jpg'), setAttribute: vi.fn() },
      { getAttribute: vi.fn().mockReturnValue('https://absolute-image.com/img.jpg'), setAttribute: vi.fn() }
    ];
    
    const mockDiv = {
      querySelectorAll: vi.fn().mockImplementation(selector => {
        if (selector === 'a') return mockLinks;
        if (selector === 'img') return mockImages;
        return [];
      })
    };
    
    // Call function under test
    DomUtils.makeUrlsAbsolute(mockDiv as any, 'https://example.com');
    
    // Verify the correct calls were made
    expect(mockLinks[0].setAttribute).toHaveBeenCalledWith('href', 'https://example.com/relative-link');
    expect(mockLinks[1].setAttribute).toHaveBeenCalledWith('href', 'https://absolute-link.com');
    expect(mockLinks[2].setAttribute).not.toHaveBeenCalled(); // Hash link should not be modified
    
    expect(mockImages[0].setAttribute).toHaveBeenCalledWith('src', 'https://example.com/relative-image.jpg');
    expect(mockImages[1].setAttribute).toHaveBeenCalledWith('src', 'https://absolute-image.com/img.jpg');
  });

  test('resolveUrl handles different URL types', () => {
    // Absolute URLs
    expect(DomUtils.resolveUrl('https://other.com/page', new URLParse('https://example.com'))).toBe('https://other.com/page');
    expect(DomUtils.resolveUrl('//other.com/page', new URLParse('https://example.com'))).toBe('//other.com/page');

    // Relative URLs
    expect(DomUtils.resolveUrl('/path/page.html', new URLParse('https://example.com'))).toBe('https://example.com/path/page.html');
    expect(DomUtils.resolveUrl('path/page.html', new URLParse('https://example.com'))).toBe('https://example.com/path/page.html');
    expect(DomUtils.resolveUrl('../page.html', new URLParse('https://example.com/path/'))).toBe('https://example.com/page.html');

    // Special cases
    expect(DomUtils.resolveUrl('#section', new URLParse('https://example.com'))).toBe('#section');
    expect(DomUtils.resolveUrl('javascript:void(0)', new URLParse('https://example.com'))).toBe('javascript:void(0)');
  });

  test('fixLazyImages handles various lazy loading techniques', () => {
    // Create mock images with various lazy-loading attributes
    const mockImages = [
      { 
        getAttribute: vi.fn().mockImplementation(attr => {
          if (attr === 'src') return '/normal-image.jpg';
          return null;
        }),
        setAttribute: vi.fn(),
        hasAttribute: vi.fn().mockReturnValue(false),
        removeAttribute: vi.fn()
      },
      { 
        getAttribute: vi.fn().mockImplementation(attr => {
          if (attr === 'src') return '/lazy.jpg';
          if (attr === 'data-src') return '/real-image.jpg';
          return null;
        }),
        setAttribute: vi.fn(),
        hasAttribute: vi.fn().mockImplementation(attr => attr === 'data-src'),
        removeAttribute: vi.fn()
      },
      { 
        getAttribute: vi.fn().mockImplementation(attr => {
          if (attr === 'src') return 'data:image/gif;base64,R0lGOD';
          if (attr === 'data-original') return 'https://example.com/lazy-load.jpg';
          return null;
        }),
        setAttribute: vi.fn(),
        hasAttribute: vi.fn().mockImplementation(attr => {
          return attr === 'data-original';
        }),
        removeAttribute: vi.fn()
      }
    ];
    
    const mockDiv = {
      querySelectorAll: vi.fn().mockReturnValue(mockImages)
    };
    
    // Call the function under test
    DomUtils.fixLazyImages(mockDiv as any);
    
    // Verify lazy loading attributes were correctly processed
    // First image should not be modified (no lazy attributes)
    expect(mockImages[0].setAttribute).not.toHaveBeenCalled();
    
    // Second image should have data-src moved to src
    expect(mockImages[1].setAttribute).toHaveBeenCalledWith('src', '/real-image.jpg');
    expect(mockImages[1].removeAttribute).toHaveBeenCalledWith('data-src');

    expect(mockImages[2].removeAttribute).toHaveBeenCalledWith('data-original');
  });
});