import { SiteConfigManager } from 'graby-ts-site-config';
import HttpClient from './lib/HttpClient';
import ContentExtractor from './lib/ContentExtractor';
import DomUtils from './lib/DomUtils';
import { GrabyOptions, ExtractionResult } from './lib/interfaces';

/**
 * Main Graby class for content extraction
 */
class Graby {
  private httpClient: HttpClient;
  private siteConfigManager: SiteConfigManager;
  private extractor: ContentExtractor;
  private options: GrabyOptions;

  /**
   * Create a new Graby instance
   * @param options - Options for Graby
   */
  constructor(options: GrabyOptions = {}) {
    this.options = {
      // Default options
      httpClient: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        referer: 'https://www.google.com/',
        maxRedirects: 10
      },
      extractor: {
        enableXss: true
      },
      siteConfig: {},
      silent: false,
      ...options
    };

    // Initialize components
    const httpClientOptions = {
      ...this.options.httpClient,
      silent: this.options.silent
    };
    this.httpClient = new HttpClient(httpClientOptions);
    this.siteConfigManager = new SiteConfigManager();
    this.extractor = new ContentExtractor(this.options.extractor, this.siteConfigManager);
  }

  /**
   * Extract content from a URL
   * @param url - URL to extract content from
   * @returns - Extraction result
   */
  async extract(url: string): Promise<ExtractionResult> {
    try {
      // Fetch content
      const response = await this.httpClient.fetch(url);

      // Check for HTML content
      if (!response.html && response.contentType.includes('html')) {
        throw new Error('No HTML content found');
      }
      
      // For non-HTML content, return a blank result
      if (!response.html) {
        const result: ExtractionResult = {
          title: '',
          html: '',
          authors: [],
          date: null,
          language: null,
          image: null,
          nextPageUrl: null,
          isNativeAd: false,
          success: false,
          originalUrl: url,
          finalUrl: response.url,
          status: response.status,
        };
        return result;
      }

      // Process HTML
      await this.extractor.process(response.html, response.url);

      // Get result
      const result = this.extractor.getResult();

      // Add response info
      result.originalUrl = url;
      result.finalUrl = response.url;
      result.status = response.status;

      return result;
    } catch (error) {
      if (!this.options.silent) {
        console.error('Error extracting content:', error);
      }
      throw error;
    }
  }

  /**
   * Extract content from pre-fetched HTML
   * @param html - HTML content
   * @param url - URL associated with the HTML
   * @returns - Extraction result
   */
  async extractFromHtml(html: string, url: string): Promise<ExtractionResult> {
    try {
      // Process HTML
      await this.extractor.process(html, url);

      // Get result
      const result = this.extractor.getResult();

      // Add URL info
      result.originalUrl = url;
      result.finalUrl = url;

      return result;
    } catch (error) {
      if (!this.options.silent) {
        console.error('Error extracting from HTML:', error);
      }
      throw error;
    }
  }
}

export { Graby, HttpClient, ContentExtractor, DomUtils };
export type {
  ExtractionResult,
  GrabyOptions,
  HttpClientOptions,
  ContentExtractorOptions,
  HttpResponse,
  SiteConfig
} from './lib/interfaces';