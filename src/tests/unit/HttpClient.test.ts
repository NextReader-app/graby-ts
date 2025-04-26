import { describe, test, expect, beforeEach, vi } from 'vitest';
import HttpClient from '../../lib/HttpClient.js';
import { IHttpAdapter } from '../../lib/HttpAdapterInterface.js';

describe('HttpClient', () => {
  let mockAdapter: IHttpAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a mock adapter before each test
    mockAdapter = {
      request: vi.fn()
    };
  });

  test('fetches content with default headers', async () => {
    // Mock adapter response
    const htmlContent = '<html><body>Test content</body></html>';
    const mockResponse = {
      url: 'https://example.com',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(htmlContent),
      bytes: vi.fn().mockResolvedValue(Buffer.from(htmlContent))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    // Pass the mock adapter as the second argument
    const client = new HttpClient({silent: true}, mockAdapter);
    const response = await client.fetch('https://example.com');

    // Verify the response has expected values
    expect(response.url).toMatch(/^https:\/\/example\.com\/?$/);
    expect(response.html).toBe('<html><body>Test content</body></html>');
    expect(response.contentType).toContain('text/html');

    // Verify adapter.request was called with expected URL
    expect(mockAdapter.request).toHaveBeenCalledTimes(1);
    expect(mockAdapter.request).toHaveBeenCalledWith(
      expect.stringMatching(/https:\/\/example\.com/),
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object),
        redirect: 'follow'
      })
    );
  });

  test('handles redirects', async () => {
    // Mock adapter response for redirect
    const htmlContent = '<html><body>Redirected content</body></html>';
    const mockResponse = {
      url: 'https://example.com/redirected',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: true,
      text: vi.fn().mockResolvedValue(htmlContent),
      bytes: vi.fn().mockResolvedValue(Buffer.from(htmlContent))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    const client = new HttpClient({silent: true}, mockAdapter);
    const response = await client.fetch('https://example.com');

    // Verify redirect was handled correctly
    expect(response.url).toMatch(/^https:\/\/example\.com\/redirected\/?$/);
    expect(response.html).toBe('<html><body>Redirected content</body></html>');
  });

  test('handles non-HTML content types', async () => {
    // Mock adapter response for non-HTML content
    const binaryContent = 'binary data';
    const mockResponse = {
      url: 'https://example.com/image.jpg',
      status: 200,
      headers: {
        'content-type': 'image/jpeg'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(binaryContent),
      bytes: vi.fn().mockResolvedValue(Buffer.from(binaryContent))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    const client = new HttpClient({silent: true}, mockAdapter);
    const response = await client.fetch('https://example.com/image.jpg');

    // Verify non-HTML content handling
    expect(response.specialContent).toBe(true);
    expect(response.contentType).toBe('image/jpeg');
    expect(response.html).toBeNull();
  });

  test('handles fetch errors', async () => {
    // Mock adapter to reject with an error
    const mockError = new Error('Network error');
    (mockAdapter.request as any).mockRejectedValue(mockError);

    const client = new HttpClient({silent: true}, mockAdapter);

    // Verify error is properly propagated
    await expect(client.fetch('https://example.com')).rejects.toThrow('Network error');
  });

  test('handles errors with silent option', async () => {
    // Mock adapter to reject with an error
    const mockError = new Error('Network error');
    (mockAdapter.request as any).mockRejectedValue(mockError);

    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error');

    // Client with silent option
    const silentClient = new HttpClient({ silent: true }, mockAdapter);

    try {
      await silentClient.fetch('https://example.com');
    } catch (error) {
      // Error should be thrown but no console output
    }

    // Should not log error message
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // Client without silent option
    const verboseClient = new HttpClient({ silent: false }, mockAdapter);

    try {
      await verboseClient.fetch('https://example.com');
    } catch (error) {
      // Error should be thrown and logged
    }

    // Should log error message
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching URL:', expect.any(Error));

    // Clean up spy
    consoleErrorSpy.mockRestore();
  });

  test('customizes headers via options', async () => {
    // Mock adapter response
    const htmlContent = '<html><body>Test content</body></html>';
    const mockResponse = {
      url: 'https://example.com',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(htmlContent),
      bytes: vi.fn().mockResolvedValue(Buffer.from(htmlContent))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    const client = new HttpClient({
      userAgent: 'Custom User Agent',
      referer: 'https://custom-referer.com',
      silent: true
    }, mockAdapter);

    await client.fetch('https://example.com', {
      headers: {
        'cookie': 'session=abc123',
        'accept': 'application/json',
        'X-Custom-Header': 'Custom Value' // Should be ignored
      }
    });

    // Verify request was called with custom headers (only the supported ones)
    expect(mockAdapter.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Custom User Agent',
          'Referer': 'https://custom-referer.com',
          'Cookie': 'session=abc123',
          'Accept': 'application/json'
        })
      })
    );

    // Verify unsupported headers were not included
    const requestCall = (mockAdapter.request as any).mock.calls[0][1];
    expect(requestCall.headers).not.toHaveProperty('X-Custom-Header');
  });

  test('handles redirects with silent option', async () => {
    // Mock adapter response with redirect
    const htmlContent = '<html><body>Redirected content</body></html>';
    const mockResponse = {
      url: 'https://example.com/redirected',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: true,
      text: vi.fn().mockResolvedValue(htmlContent),
      bytes: vi.fn().mockResolvedValue(Buffer.from(htmlContent))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    // Spy on console.log
    const consoleLogSpy = vi.spyOn(console, 'log');

    // Client with silent option
    const silentClient = new HttpClient({ silent: true }, mockAdapter);
    await silentClient.fetch('https://example.com');

    // Should not log redirect message
    expect(consoleLogSpy).not.toHaveBeenCalled();

    // Client without silent option
    const verboseClient = new HttpClient({ silent: false }, mockAdapter);
    await verboseClient.fetch('https://example.com');

    // Should log redirect message
    expect(consoleLogSpy).toHaveBeenCalledWith('Redirected to: https://example.com/redirected');

    // Clean up spy
    consoleLogSpy.mockRestore();
  });

  test('handles site-specific HTTP headers', async () => {
    // Mock adapter response
    const htmlContent = '<html><body>Test content</body></html>';
    const mockResponse = {
      url: 'https://example.com',
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      redirected: false,
      text: vi.fn().mockResolvedValue(htmlContent),
      bytes: vi.fn().mockResolvedValue(Buffer.from(htmlContent))
    };

    (mockAdapter.request as any).mockResolvedValue(mockResponse);

    const client = new HttpClient({ silent: true }, mockAdapter);

    // Test with site-specific headers (only the supported ones)
    await client.fetch('https://example.com', {
      headers: {
        'user-agent': 'Site Specific User Agent',
        'referer': 'https://site-specific-referer.com',
        'cookie': 'session=abc123',
        'accept': 'application/json',
        'X-API-Key': 'site-specific-api-key', // Should be ignored
        'Authorization': 'Bearer token123'     // Should be ignored
      }
    });

    // Verify request was called with only the supported headers
    expect(mockAdapter.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Site Specific User Agent',
          'Referer': 'https://site-specific-referer.com',
          'Cookie': 'session=abc123',
          'Accept': 'application/json'
        })
      })
    );

    // Verify unsupported headers were not included
    const requestCall = (mockAdapter.request as any).mock.calls[0][1];
    expect(requestCall.headers).not.toHaveProperty('X-API-Key');
    expect(requestCall.headers).not.toHaveProperty('Authorization');
  });
});