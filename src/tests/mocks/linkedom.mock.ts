import { vi } from 'vitest';

// Minimal linkedom implementation for testing
export const parseHTML = (html: string) => {
  // Create mock elements
  const mockElement = {
    innerHTML: '',
    classList: { remove: vi.fn(), add: vi.fn() },
    hasAttribute: vi.fn().mockReturnValue(true),
    getAttribute: vi.fn((attr) => {
      if (attr === 'href') return '/relative-link';
      if (attr === 'src') return '/image.jpg';
      if (attr === 'content') return 'OpenGraph Title';
      return '';
    }),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    remove: vi.fn(),
    cloneNode: vi.fn().mockReturnValue({ tagName: 'DIV', innerHTML: 'cloned' }),
    appendChild: vi.fn(),
    querySelectorAll: vi.fn().mockImplementation((selector) => {
      if (selector === 'a') {
        return [
          { getAttribute: vi.fn().mockReturnValue('/relative-link'), setAttribute: vi.fn() },
          { getAttribute: vi.fn().mockReturnValue('https://absolute-link.com'), setAttribute: vi.fn() },
          { getAttribute: vi.fn().mockReturnValue('#'), setAttribute: vi.fn() }
        ];
      }
      if (selector === 'img') {
        return [
          { getAttribute: vi.fn().mockReturnValue('/relative-image.jpg'), setAttribute: vi.fn(), hasAttribute: vi.fn().mockReturnValue(false) },
          { getAttribute: vi.fn().mockReturnValue('https://absolute-image.com/img.jpg'), setAttribute: vi.fn(), hasAttribute: vi.fn().mockReturnValue(false) },
          { getAttribute: vi.fn().mockImplementation(attr => attr === 'data-src' ? '/real-image.jpg' : '/lazy.jpg'), 
            setAttribute: vi.fn(), 
            hasAttribute: vi.fn().mockImplementation(attr => attr === 'data-src'),
            removeAttribute: vi.fn() },
          { getAttribute: vi.fn().mockImplementation(attr => attr === 'data-original' ? 'https://example.com/lazy-load.jpg' : 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='), 
            setAttribute: vi.fn(), 
            hasAttribute: vi.fn().mockImplementation(attr => attr === 'data-original'),
            removeAttribute: vi.fn() }
        ];
      }
      return [];
    })
  };

  // Create a simple DOM implementation for testing
  const document = {
    documentElement: { hasAttribute: vi.fn().mockReturnValue(true), getAttribute: vi.fn().mockReturnValue('en') },
    title: 'Test Title',
    querySelector: vi.fn().mockImplementation((selector) => {
      if (selector === 'meta[property="og:title"]') {
        return { getAttribute: vi.fn().mockReturnValue('OpenGraph Title') };
      }
      if (selector === 'meta[property="og:image"]') {
        return { getAttribute: vi.fn().mockReturnValue('https://example.com/og-image.jpg') };
      }
      if (selector === 'meta[property="article:published_time"]') {
        return { getAttribute: vi.fn().mockReturnValue('2023-08-15T14:30:00Z') };
      }
      if (selector === 'meta[property="og:locale"]') {
        return { getAttribute: vi.fn().mockReturnValue('en_US') };
      }
      if (selector === 'div') {
        return mockElement;
      }
      return null;
    }),
    querySelectorAll: vi.fn().mockImplementation((selector) => {
      if (selector === 'script[type="application/ld+json"]') {
        return [{
          textContent: JSON.stringify({
            '@type': 'NewsArticle',
            headline: 'JSON-LD Headline',
            datePublished: '2023-08-15T10:30:00Z',
            author: { name: 'Jane Doe' }
          })
        }];
      }
      if (selector === '.native-advertisement') {
        return [{ textContent: 'Sponsored Content' }];
      }
      if (selector === 'a.next-page') {
        return [{ 
          getAttribute: vi.fn().mockReturnValue('/article/page2'),
          hasAttribute: vi.fn().mockReturnValue(true)
        }];
      }
      return [];
    }),
    createElement: vi.fn().mockImplementation((tag) => ({
      tagName: tag.toUpperCase(),
      innerHTML: tag === 'div' ? '<p>This is the first paragraph of the article.</p>' : '',
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      appendChild: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([])
    }))
  };

  return { document };
};