import HttpClient from '../../lib/HttpClient';

// Mock isomorphic-fetch module
jest.mock('isomorphic-fetch', () => {
  return jest.fn();
});

// Import the mocked fetch
import fetch from 'isomorphic-fetch';

describe('HttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches content with default headers', async () => {
    // Mock fetch response
    const mockResponse = {
      url: 'https://example.com',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: jest.fn().mockResolvedValue('<html><body>Test content</body></html>')
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const client = new HttpClient({silent: true});
    const response = await client.fetch('https://example.com');

    // Verify the response has expected values
    expect(response.url).toMatch(/^https:\/\/example\.com\/?$/);
    expect(response.html).toBe('<html><body>Test content</body></html>');
    expect(response.contentType).toContain('text/html');
    
    // Verify fetch was called with expected URL
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/https:\/\/example\.com/),
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object),
        redirect: 'follow'
      })
    );
  });

  test('handles redirects', async () => {
    // Mock fetch response for redirect
    const mockResponse = {
      url: 'https://example.com/redirected',
      redirected: true,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: jest.fn().mockResolvedValue('<html><body>Redirected content</body></html>')
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const client = new HttpClient({silent: true});
    const response = await client.fetch('https://example.com');

    // Verify redirect was handled correctly
    expect(response.url).toMatch(/^https:\/\/example\.com\/redirected\/?$/);
    expect(response.html).toBe('<html><body>Redirected content</body></html>');
  });

  test('handles non-HTML content types', async () => {
    // Mock fetch response for non-HTML content
    const mockResponse = {
      url: 'https://example.com/image.jpg',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'image/jpeg'
      }),
      text: jest.fn().mockResolvedValue('binary data')
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const client = new HttpClient({silent: true});
    const response = await client.fetch('https://example.com/image.jpg');

    // Verify non-HTML content handling
    expect(response.specialContent).toBe(true);
    expect(response.contentType).toBe('image/jpeg');
    expect(response.html).toBeNull();
  });

  test('handles fetch errors', async () => {
    // Mock fetch to reject with an error
    const mockError = new Error('Network error');
    (fetch as jest.Mock).mockRejectedValue(mockError);

    const client = new HttpClient({silent: true});

    // Verify error is properly propagated
    await expect(client.fetch('https://example.com')).rejects.toThrow('Network error');
  });
  
  test('handles errors with silent option', async () => {
    // Mock fetch to reject with an error
    const mockError = new Error('Network error');
    (fetch as jest.Mock).mockRejectedValue(mockError);
    
    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Client with silent option
    const silentClient = new HttpClient({ silent: true });
    
    try {
      await silentClient.fetch('https://example.com');
    } catch (error) {
      // Error should be thrown but no console output
    }
    
    // Should not log error message
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    // Client without silent option
    const verboseClient = new HttpClient({ silent: false });
    
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
    // Mock fetch response
    const mockResponse = {
      url: 'https://example.com',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: jest.fn().mockResolvedValue('<html><body>Test content</body></html>')
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const client = new HttpClient({
      userAgent: 'Custom User Agent',
      referer: 'https://custom-referer.com',
      silent: true
    });

    await client.fetch('https://example.com', {
      headers: {
        'cookie': 'session=abc123',
        'accept': 'application/json',
        'X-Custom-Header': 'Custom Value' // Should be ignored
      }
    });
    
    // Verify fetch was called with custom headers (only the supported ones)
    expect(fetch).toHaveBeenCalledWith(
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
    const fetchCall = (fetch as jest.Mock).mock.calls[0][1];
    expect(fetchCall.headers).not.toHaveProperty('X-Custom-Header');
  });
  
  test('handles redirects with silent option', async () => {
    // Mock fetch response with redirect
    const mockResponse = {
      url: 'https://example.com/redirected',
      redirected: true,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: jest.fn().mockResolvedValue('<html><body>Redirected content</body></html>')
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);
    
    // Spy on console.log
    const consoleLogSpy = jest.spyOn(console, 'log');
    
    // Client with silent option
    const silentClient = new HttpClient({ silent: true });
    await silentClient.fetch('https://example.com');
    
    // Should not log redirect message
    expect(consoleLogSpy).not.toHaveBeenCalled();
    
    // Client without silent option
    const verboseClient = new HttpClient({ silent: false });
    await verboseClient.fetch('https://example.com');
    
    // Should log redirect message
    expect(consoleLogSpy).toHaveBeenCalledWith('Redirected to: https://example.com/redirected');
    
    // Clean up spy
    consoleLogSpy.mockRestore();
  });

  test('handles site-specific HTTP headers', async () => {
    // Mock fetch response
    const mockResponse = {
      url: 'https://example.com',
      redirected: false,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: jest.fn().mockResolvedValue('<html><body>Test content</body></html>')
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const client = new HttpClient({ silent: true });
    
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
    
    // Verify fetch was called with only the supported headers
    expect(fetch).toHaveBeenCalledWith(
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
    const fetchCall = (fetch as jest.Mock).mock.calls[0][1];
    expect(fetchCall.headers).not.toHaveProperty('X-API-Key');
    expect(fetchCall.headers).not.toHaveProperty('Authorization');
  });
});