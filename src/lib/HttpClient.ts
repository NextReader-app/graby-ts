import { HttpClientOptions, FetchOptions, HttpResponse } from './interfaces.js';
import URLParse from 'url-parse';
import { IHttpAdapter } from './HttpAdapterInterface.js';

// Import getHttpAdapter from the appropriate entry point (will be resolved at runtime)
declare function getHttpAdapter(): IHttpAdapter;

/**
 * HTTP client for fetching web content
 */
class HttpClient {
  private options: Required<HttpClientOptions>;
  private httpAdapter: IHttpAdapter | null = null;

  /**
   * Create a new HttpClient
   * @param options - Client options
   * @param customAdapter - Optional adapter for testing purposes
   */
  constructor(options: HttpClientOptions = {}, customAdapter?: IHttpAdapter) {
    this.options = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referer: 'https://www.google.com/',
      maxRedirects: 10,
      silent: false,
      ...options
    };

    // Use custom adapter if provided (for testing) or get default adapter
    this.httpAdapter = customAdapter || getHttpAdapter();
  }

  /**
   * Fetch content from a URL
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<HttpResponse> {
    const { skipTypeCheck = false, headers = {} } = options;
    const parsedUrl = new URLParse(url);

    // Setup headers
    const requestHeaders: Record<string, string> = {
      'User-Agent': this.getUserAgent(headers),
      'Referer': this.getReferer(headers),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...this.getAcceptedHeaders(headers)
    };

    try {
      // Perform request through adapter
      const response = await this.httpAdapter!.request(parsedUrl.toString(), {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'follow'
      });

      // Handle redirects
      if (response.redirected && !this.options.silent) {
        console.log(`Redirected to: ${response.url}`);
      }

      // Get content type
      const contentType = response.headers['content-type'] ||
                         response.headers['Content-Type'] || '';

      // Handle special content types
      if (!skipTypeCheck &&
          !contentType.includes('text/html') &&
          !contentType.includes('application/xhtml+xml')) {
        return this.handleSpecialContentType(response, contentType);
      }

      // Get HTML content
      const html = await response.text();

      // Process response URL
      let responseUrl = response.url;
      if (responseUrl.endsWith('/') && !parsedUrl.toString().endsWith('/')) {
        responseUrl = responseUrl.slice(0, -1);
      }

      return {
        url: responseUrl,
        html,
        contentType,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (!this.options.silent) {
        console.error('Error fetching URL:', error);
      }
      throw error;
    }
  }

  /**
   * Handle special content types
   */
  private async handleSpecialContentType(response: any, contentType: string): Promise<HttpResponse> {
    let responseUrl = response.url;
    if (responseUrl.endsWith('/')) {
      responseUrl = responseUrl.slice(0, -1);
    }

    return {
      url: responseUrl,
      html: null,
      contentType,
      status: response.status,
      headers: response.headers,
      specialContent: true
    };
  }

  /**
   * Get User-Agent header
   */
  private getUserAgent(headers: Record<string, string>): string {
    if (headers['user-agent']) {
      if (!this.options.silent) {
        console.log(`Using User-Agent from site config: ${headers['user-agent']}`);
      }
      return headers['user-agent'];
    }
    return this.options.userAgent;
  }

  /**
   * Get Referer header
   */
  private getReferer(headers: Record<string, string>): string {
    if (headers['referer']) {
      if (!this.options.silent) {
        console.log(`Using Referer from site config: ${headers['referer']}`);
      }
      return headers['referer'];
    }
    return this.options.referer;
  }

  /**
   * Get other accepted headers
   */
  private getAcceptedHeaders(headers: Record<string, string>): Record<string, string> {
    const acceptedHeaders: Record<string, string> = {};

    if (headers['cookie']) {
      acceptedHeaders['Cookie'] = headers['cookie'];
    }

    if (headers['accept']) {
      acceptedHeaders['Accept'] = headers['accept'];
    }

    return acceptedHeaders;
  }
}

export default HttpClient;