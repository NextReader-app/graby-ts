import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Graby } from '../../core.js';
import { IHttpAdapter } from '../../lib/HttpAdapterInterface.js';
import HttpClient from '../../lib/HttpClient.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to load test fixtures
const loadFixture = (name: string): string => {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');
};

describe('Graby', () => {
  let mockAdapter: IHttpAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a mock adapter before each test
    mockAdapter = {
      request: vi.fn()
    };
  });

  test('extracts content from a URL', async () => {
    // Setup mock response
    const mockResponse = {
      url: 'https://example.com/article',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(loadFixture('article.html'))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    // Create a custom HttpClient with our mock adapter
    const customHttpClient = new HttpClient({silent: true}, mockAdapter);

    // Pass custom HttpClient to Graby via options
    const graby = new Graby({
      silent: true,
      // Create factory function for custom HttpClient
      httpClientFactory: (options) => customHttpClient
    });

    const result = await graby.extract('https://example.com/article');

    expect(result.title).toBe('Test Article');
    expect(result.html).toContain('This is the first paragraph of the article.');
    expect(result.authors).toContain('By John Smith');
    expect(result.success).toBe(true);
  });

  test('extracts content from pre-fetched HTML', async () => {
    const html = loadFixture('article-with-opengraph.html');
    const url = 'https://example.com/article';

    const customHttpClient = new HttpClient({silent: true}, mockAdapter);
    const graby = new Graby({
      silent: true,
      httpClientFactory: (options) => customHttpClient
    });

    const result = await graby.extractFromHtml(html, url);

    // Title comes from the test fixture (Test Article Title instead of OpenGraph Title)
    expect(result.title).toBe('OpenGraph Title');
    expect(result.image).toBe('https://example.com/og-image.jpg');
    expect(result.originalUrl).toBe(url);
    expect(result.finalUrl).toBe(url);
    expect(result.success).toBe(true);
  });

  test('handles fetch errors gracefully', async () => {
    // Set up mock to reject with a network error
    const networkError = new Error('Network error');
    (mockAdapter.request as any).mockRejectedValue(networkError);

    const customHttpClient = new HttpClient({silent: true}, mockAdapter);
    const graby = new Graby({
      silent: true,
      httpClientFactory: (options) => customHttpClient
    });

    // Use Vitest's built-in async error handling
    await expect(graby.extract('https://example.com/article')).rejects.toThrow('Network error');
  });

  test('handles non-HTML content types', async () => {
    // Mock response to return a non-HTML content type
    const mockResponse = {
      url: 'https://example.com/image.jpg',
      status: 200,
      headers: {
        'content-type': 'image/jpeg'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue('binary data')
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    const customHttpClient = new HttpClient({silent: true}, mockAdapter);
    const graby = new Graby({
      silent: true,
      httpClientFactory: (options) => customHttpClient
    });

    // When we call extract, the non-HTML response should be detected
    // by HttpClient and processed to return an empty result
    const result = await graby.extract('https://example.com/image.jpg');

    expect(result.success).toBe(false);
    expect(result.html).toBe('');
    expect(result.title).toBe('');
    expect(result.authors).toEqual([]);
  });

  test('customizes behavior through options', async () => {
    // Setup mock response
    const mockResponse = {
      url: 'https://example.com/article',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(loadFixture('article.html'))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    // Create HttpClient with custom options
    const customHttpClient = new HttpClient({
      userAgent: 'Custom User Agent',
      silent: true
    }, mockAdapter);

    const graby = new Graby({
      httpClient: {
        userAgent: 'Custom User Agent'
      },
      extractor: {
        enableXss: false
      },
      silent: true,
      httpClientFactory: (options) => customHttpClient
    });

    const result = await graby.extract('https://example.com/article');

    // Just verify we got a result with expected properties
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();

    // Verify custom headers were passed to the adapter
    expect(mockAdapter.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Custom User Agent'
        })
      })
    );
  });

  test('properly handles silent option for error logging', async () => {
    // Mock a network error
    const networkError = new Error('Network error');
    (mockAdapter.request as any).mockRejectedValue(networkError);

    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error');

    // Create Graby with silent option and custom HttpClient
    const silentHttpClient = new HttpClient({silent: true}, mockAdapter);
    const silentGraby = new Graby({
      silent: true,
      httpClientFactory: (options) => silentHttpClient
    });

    try {
      await silentGraby.extract('https://example.com/article');
    } catch (error) {
      // Error should be thrown but not logged
    }

    // Should not log error messages
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // Create Graby without silent option
    // Reset mockAdapter for this test
    (mockAdapter.request as any).mockRejectedValue(networkError);

    const verboseHttpClient = new HttpClient({silent: false}, mockAdapter);
    const verboseGraby = new Graby({
      silent: false,
      httpClientFactory: (options) => verboseHttpClient
    });

    try {
      await verboseGraby.extract('https://example.com/article');
    } catch (error) {
      // Error should be thrown and logged
    }

    // Should log error messages
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error extracting content:', expect.any(Error));

    // Clean up spy
    consoleErrorSpy.mockRestore();
  });

  test('passes custom headers to http adapter', async () => {
    // Setup mock response
    const mockResponse = {
      url: 'https://example.com/article',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(loadFixture('article.html'))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    // Create HttpClient with custom options
    const customHttpClient = new HttpClient({
      userAgent: 'Custom User Agent',
      referer: 'https://custom-referer.com',
      silent: true
    }, mockAdapter);

    // Create Graby instance with custom headers
    const graby = new Graby({
      silent: true,
      httpClient: {
        userAgent: 'Custom User Agent',
        referer: 'https://custom-referer.com'
      },
      httpClientFactory: (options) => customHttpClient
    });

    // Extract content
    await graby.extract('https://example.com/article');

    // Verify that adapter was called with the custom headers
    expect(mockAdapter.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Custom User Agent',
          'Referer': 'https://custom-referer.com'
        })
      })
    );
  });
});