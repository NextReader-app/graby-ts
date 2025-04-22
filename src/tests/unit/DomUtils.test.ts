import DomUtils from '../../lib/DomUtils';
import URLParse from 'url-parse';
import { parseHTML } from 'linkedom';

describe('DomUtils', () => {
  test('makeUrlsAbsolute converts relative URLs to absolute', () => {
    // Create mock element with query results
    const mockLinks = [
      { getAttribute: jest.fn().mockReturnValue('/relative-link'), setAttribute: jest.fn() },
      { getAttribute: jest.fn().mockReturnValue('https://absolute-link.com'), setAttribute: jest.fn() },
      { getAttribute: jest.fn().mockReturnValue('#'), setAttribute: jest.fn() }
    ];
    
    const mockImages = [
      { getAttribute: jest.fn().mockReturnValue('/relative-image.jpg'), setAttribute: jest.fn() },
      { getAttribute: jest.fn().mockReturnValue('https://absolute-image.com/img.jpg'), setAttribute: jest.fn() }
    ];
    
    const mockDiv = {
      querySelectorAll: jest.fn().mockImplementation(selector => {
        if (selector === 'a') return mockLinks;
        if (selector === 'img') return mockImages;
        return [];
      })
    };
    
    // Call function under test
    DomUtils.makeUrlsAbsolute(mockDiv as any, 'https://example.com');
    
    // Verify the correct calls were made
    expect(mockLinks[0].setAttribute).toHaveBeenCalledWith('href', 'https://example.com/relative-link');
    expect(mockLinks[1].setAttribute).not.toHaveBeenCalled(); // Absolute URL should not be modified
    expect(mockLinks[2].setAttribute).not.toHaveBeenCalled(); // Hash link should not be modified
    
    expect(mockImages[0].setAttribute).toHaveBeenCalledWith('src', 'https://example.com/relative-image.jpg');
    expect(mockImages[1].setAttribute).not.toHaveBeenCalled(); // Absolute URL should not be modified
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
        getAttribute: jest.fn().mockImplementation(attr => {
          if (attr === 'src') return '/normal-image.jpg';
          return null;
        }),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockReturnValue(false),
        removeAttribute: jest.fn()
      },
      { 
        getAttribute: jest.fn().mockImplementation(attr => {
          if (attr === 'src') return '/lazy.jpg';
          if (attr === 'data-src') return '/real-image.jpg';
          return null;
        }),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockImplementation(attr => attr === 'data-src'),
        removeAttribute: jest.fn()
      },
      { 
        getAttribute: jest.fn().mockImplementation(attr => {
          if (attr === 'src') return 'data:image/gif;base64,R0lGOD';
          if (attr === 'data-original') return 'https://example.com/lazy-load.jpg';
          return null;
        }),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockImplementation(attr => attr === 'data-original'),
        removeAttribute: jest.fn()
      }
    ];
    
    const mockDiv = {
      querySelectorAll: jest.fn().mockReturnValue(mockImages)
    };
    
    // Call the function under test
    DomUtils.fixLazyImages(mockDiv as any);
    
    // Verify lazy loading attributes were correctly processed
    // First image should not be modified (no lazy attributes)
    expect(mockImages[0].setAttribute).not.toHaveBeenCalled();
    
    // Second image should have data-src moved to src
    expect(mockImages[1].setAttribute).toHaveBeenCalledWith('src', '/real-image.jpg');
    expect(mockImages[1].removeAttribute).toHaveBeenCalledWith('data-src');
    
    // Third image with placeholder should have data-original moved to src
    expect(mockImages[2].setAttribute).toHaveBeenCalledWith('src', 'https://example.com/lazy-load.jpg');
    expect(mockImages[2].removeAttribute).toHaveBeenCalledWith('data-original');
  });
});