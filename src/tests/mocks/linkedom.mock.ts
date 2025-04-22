// Minimal linkedom implementation for testing
export const parseHTML = (html: string) => {
  // Create mock elements
  const mockElement = {
    innerHTML: '',
    classList: { remove: jest.fn(), add: jest.fn() },
    hasAttribute: jest.fn().mockReturnValue(true),
    getAttribute: jest.fn((attr) => {
      if (attr === 'href') return '/relative-link';
      if (attr === 'src') return '/image.jpg';
      if (attr === 'content') return 'OpenGraph Title';
      return '';
    }),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    remove: jest.fn(),
    cloneNode: jest.fn().mockReturnValue({ tagName: 'DIV', innerHTML: 'cloned' }),
    appendChild: jest.fn(),
    querySelectorAll: jest.fn().mockImplementation((selector) => {
      if (selector === 'a') {
        return [
          { getAttribute: jest.fn().mockReturnValue('/relative-link'), setAttribute: jest.fn() },
          { getAttribute: jest.fn().mockReturnValue('https://absolute-link.com'), setAttribute: jest.fn() },
          { getAttribute: jest.fn().mockReturnValue('#'), setAttribute: jest.fn() }
        ];
      }
      if (selector === 'img') {
        return [
          { getAttribute: jest.fn().mockReturnValue('/relative-image.jpg'), setAttribute: jest.fn(), hasAttribute: jest.fn().mockReturnValue(false) },
          { getAttribute: jest.fn().mockReturnValue('https://absolute-image.com/img.jpg'), setAttribute: jest.fn(), hasAttribute: jest.fn().mockReturnValue(false) },
          { getAttribute: jest.fn().mockImplementation(attr => attr === 'data-src' ? '/real-image.jpg' : '/lazy.jpg'), 
            setAttribute: jest.fn(), 
            hasAttribute: jest.fn().mockImplementation(attr => attr === 'data-src'),
            removeAttribute: jest.fn() },
          { getAttribute: jest.fn().mockImplementation(attr => attr === 'data-original' ? 'https://example.com/lazy-load.jpg' : 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='), 
            setAttribute: jest.fn(), 
            hasAttribute: jest.fn().mockImplementation(attr => attr === 'data-original'),
            removeAttribute: jest.fn() }
        ];
      }
      return [];
    })
  };

  // Create a simple DOM implementation for testing
  const document = {
    documentElement: { hasAttribute: jest.fn().mockReturnValue(true), getAttribute: jest.fn().mockReturnValue('en') },
    title: 'Test Title',
    querySelector: jest.fn().mockImplementation((selector) => {
      if (selector === 'meta[property="og:title"]') {
        return { getAttribute: jest.fn().mockReturnValue('OpenGraph Title') };
      }
      if (selector === 'meta[property="og:image"]') {
        return { getAttribute: jest.fn().mockReturnValue('https://example.com/og-image.jpg') };
      }
      if (selector === 'meta[property="article:published_time"]') {
        return { getAttribute: jest.fn().mockReturnValue('2023-08-15T14:30:00Z') };
      }
      if (selector === 'meta[property="og:locale"]') {
        return { getAttribute: jest.fn().mockReturnValue('en_US') };
      }
      if (selector === 'div') {
        return mockElement;
      }
      return null;
    }),
    querySelectorAll: jest.fn().mockImplementation((selector) => {
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
          getAttribute: jest.fn().mockReturnValue('/article/page2'),
          hasAttribute: jest.fn().mockReturnValue(true)
        }];
      }
      return [];
    }),
    createElement: jest.fn().mockImplementation((tag) => ({
      tagName: tag.toUpperCase(),
      innerHTML: tag === 'div' ? '<p>This is the first paragraph of the article.</p>' : '',
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      appendChild: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([])
    }))
  };

  return { document };
};