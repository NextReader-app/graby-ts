import { Grabby } from '../../index';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to load test fixtures
const loadFixture = (name: string): string => {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');
};

// Mock fetch API
const mockFetch = global.fetch as jest.Mock;

describe('Grabby', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extracts content from a URL', async () => {
    // Setup mock response
    mockFetch.mockImplementationOnce(async () => ({
      url: 'https://example.com/article',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: async () => loadFixture('article.html')
    }));

    const grabby = new Grabby();
    const result = await grabby.extract('https://example.com/article');

    expect(result.title).toBe('Test Article Title');
    expect(result.html).toContain('This is the first paragraph of the article.');
    expect(result.authors).toContain('John Smith');
    expect(result.date).toMatch(/2023-08-15/);
    expect(result.success).toBe(true);
  });

  test('extracts content from pre-fetched HTML', async () => {
    const html = loadFixture('article-with-opengraph.html');
    const url = 'https://example.com/article';

    const grabby = new Grabby();
    const result = await grabby.extractFromHtml(html, url);

    expect(result.title).toBe('OpenGraph Title');
    expect(result.image).toBe('https://example.com/og-image.jpg');
    expect(result.originalUrl).toBe(url);
    expect(result.finalUrl).toBe(url);
    expect(result.success).toBe(true);
  });

  test('handles fetch errors gracefully', async () => {
    mockFetch.mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    const grabby = new Grabby();
    
    try {
      await grabby.extract('https://example.com/article');
      // If we get here, the test should fail
      expect(true).toBe(false); // Force failure
    } catch (error: any) {
      expect(error.message).toContain('Network error');
    }
  });

  test('handles non-HTML content types', async () => {
    mockFetch.mockImplementationOnce(async () => ({
      url: 'https://example.com/image.jpg',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'image/jpeg'
      }),
      text: async () => 'binary data'
    }));

    const grabby = new Grabby();

    // This should throw because the response is not HTML
    try {
      await grabby.extract('https://example.com/image.jpg');
      // If we get here, the test should fail
      expect(true).toBe(false); // Force failure
    } catch (error: any) {
      expect(error.message).toContain('No HTML content found');
    }
  });

  test('customizes behavior through options', async () => {
    // Setup mock response
    mockFetch.mockImplementationOnce(async () => ({
      url: 'https://example.com/article',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: async () => loadFixture('article.html')
    }));

    const grabby = new Grabby({
      httpClient: {
        userAgent: 'Custom User Agent'
      },
      extractor: {
        enableXss: false
      }
    });

    const result = await grabby.extract('https://example.com/article');
    
    // Just verify we got a result
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });
});