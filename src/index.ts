import { parseHTML } from 'linkedom';
import { SiteConfigManager } from 'grabby-js-site-config';
import HttpClient from './lib/HttpClient';
import ContentExtractor from './lib/ContentExtractor';
import DomUtils from './lib/DomUtils';
import { GrabbyOptions, ExtractionResult } from './lib/interfaces';

/**
 * Main Grabby class for content extraction
 */
class Grabby {
  private httpClient: HttpClient;
  private siteConfigManager: SiteConfigManager;
  private extractor: ContentExtractor;
  private options: GrabbyOptions;

  /**
   * Create a new Grabby instance
   * @param options - Options for Grabby
   */
  constructor(options: GrabbyOptions = {}) {
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
      ...options
    };

    // Initialize components
    this.httpClient = new HttpClient(this.options.httpClient);
    this.siteConfigManager = new SiteConfigManager(this.options.siteConfig);
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

      if (!response.html) {
        throw new Error('No HTML content found');
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
      console.error('Error extracting content:', error);
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
      console.error('Error extracting from HTML:', error);
      throw error;
    }
  }
}

export { Grabby, HttpClient, ContentExtractor, DomUtils };
export type {
  ExtractionResult,
  GrabbyOptions,
  HttpClientOptions,
  ContentExtractorOptions,
  HttpResponse,
  SiteConfig
} from './lib/interfaces';