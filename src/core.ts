import { SiteConfigManager } from 'graby-ts-site-config';
import HttpClient from './lib/HttpClient.js';
import ContentExtractor from './lib/ContentExtractor.js';
import DomUtils from './lib/DomUtils.js';
import { GrabyOptions, ExtractionResult } from './lib/interfaces.js';
import URLParse from 'url-parse';

/**
 * Main Graby class for content extraction
 */
class Graby {
  private httpClient: HttpClient;
  private siteConfigManager: SiteConfigManager;
  private extractor: ContentExtractor;
  private options: Required<GrabyOptions>;

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
      multipage: true, // Multi-page support enabled by default
      multipageLimit: 10, // Maximum number of pages to process
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
      // Get site config for the initial URL
      const initialUrl = new URLParse(url);
      let siteConfig = await this.siteConfigManager.getConfigForHost(initialUrl.hostname);

      // Fetch content with site config's HTTP headers
      const response = await this.httpClient.fetch(url, {
        headers: siteConfig?.http_header || {}
      });

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

      // If the URL was redirected to a different hostname, get the new site config
      const responseUrl = new URLParse(response.url);
      if (responseUrl.hostname !== initialUrl.hostname) {
        siteConfig = await this.siteConfigManager.getConfigForHost(responseUrl.hostname);
      }

      // Check for single page view if available
      if (siteConfig.single_page_link && siteConfig.single_page_link.length > 0) {
        const singlePageUrl = await this.getSinglePageUrl(response.html, response.url);

        if (singlePageUrl) {
          try {
            const singlePageResponse = await this.httpClient.fetch(singlePageUrl, {
              skipTypeCheck: true,
              headers: siteConfig.http_header || {}
            });

            if (!this.options.silent) {
              console.log(`Retrieved single-page view from "${singlePageUrl}"`);
            }

            if (singlePageResponse.html) {
              // Use the single page content
              response.html = singlePageResponse.html;
              response.url = singlePageResponse.url;

              // Check if we need to update the site config for the single page URL
              const singlePageHostname = new URLParse(singlePageResponse.url).hostname;
              if (singlePageHostname !== responseUrl.hostname) {
                siteConfig = await this.siteConfigManager.getConfigForHost(singlePageHostname);
              }
            }
          } catch (error) {
            if (!this.options.silent) {
              console.error('Error fetching single page URL:', error);
            }
          }
        }
      }

      // Process HTML
      await this.extractor.process(response.html, response.url, siteConfig);

      // Get result
      let result = this.extractor.getResult();

      // Handle multi-page articles if enabled
      if (this.options.multipage && result.nextPageUrl) {
        const multiPageResult = await this.processMultiPage(result, response.url);
        if (multiPageResult) {
          result = multiPageResult;
        }
      }

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
      // Get site config for this URL
      const siteConfig = await this.siteConfigManager.getConfigForHost(new URLParse(url).hostname);

      // Process HTML
      await this.extractor.process(html, url, siteConfig);

      // Get result
      let result = this.extractor.getResult();

      // Handle multi-page articles if enabled
      if (this.options.multipage && result.nextPageUrl) {
        const multiPageResult = await this.processMultiPage(result, url);
        if (multiPageResult) {
          result = multiPageResult;
        }
      }

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

  /**
   * Process a multi-page article
   * @param firstPageResult - Result from the first page
   * @param baseUrl - Base URL for resolving relative URLs
   * @returns - Combined extraction result or null if error
   */
  private async processMultiPage(firstPageResult: ExtractionResult, baseUrl: string): Promise<ExtractionResult | null> {
    // Store URLs we've already processed to avoid cycles
    const processedUrls = new Set<string>([baseUrl]);

    // Create a copy of the result to avoid modifying the original
    const result = { ...firstPageResult };

    // Create an array to store the content of all pages
    const allPages: Element[] = [];
    const tempDoc = document.implementation.createHTMLDocument('');
    const container = tempDoc.createElement('div');
    container.innerHTML = result.html;

    // Add the first page content
    if (container.firstElementChild) {
      allPages.push(container.firstElementChild);
    }

    let nextPageUrl = result.nextPageUrl;
    let pageCount = 1;

    // Continue as long as we have a next page URL and haven't exceeded the limit
    while (nextPageUrl && pageCount < this.options.multipageLimit) {
      // Convert relative URL to absolute
      const absoluteUrl = this.makeAbsoluteUrl(nextPageUrl, baseUrl);

      if (!absoluteUrl || processedUrls.has(absoluteUrl)) {
        // URL already processed or cannot be converted
        break;
      }

      // Add URL to the list of processed URLs
      processedUrls.add(absoluteUrl);

      try {
        // Get site config for next page URL
        const nextPageHostname = new URLParse(absoluteUrl).hostname;
        const siteConfig = await this.siteConfigManager.getConfigForHost(nextPageHostname);

        // Fetch the next page with site config's HTTP headers
        const nextPageResponse = await this.httpClient.fetch(absoluteUrl, {
          headers: siteConfig?.http_header || {}
        });

        if (!nextPageResponse.html) {
          if (!this.options.silent) {
            console.error('No HTML content in next page response');
          }
          break;
        }

        // Process the page
        const tempExtractor = new ContentExtractor(this.options.extractor, this.siteConfigManager);
        const success = await tempExtractor.process(nextPageResponse.html, absoluteUrl, siteConfig);

        if (success) {
          const nextPageResult = tempExtractor.getResult();

          // Add the content to our pages array
          const nextPageContainer = tempDoc.createElement('div');
          nextPageContainer.innerHTML = nextPageResult.html;

          if (nextPageContainer.firstElementChild) {
            allPages.push(nextPageContainer.firstElementChild);
          }

          // Update the next page URL
          nextPageUrl = nextPageResult.nextPageUrl;

          // Increment the page counter
          pageCount++;

          if (!this.options.silent) {
            console.log(`Processed page ${pageCount} of multi-page article: ${absoluteUrl}`);
          }
        } else {
          if (!this.options.silent) {
            console.log(`Failed to extract content from page: ${absoluteUrl}`);
          }
          // If failed to extract content, we add a note about it
          const errorNote = tempDoc.createElement('p');
          errorNote.innerHTML = '<em>This article appears to continue on subsequent pages which we could not extract</em>';
          allPages.push(errorNote);
          break;
        }
      } catch (error) {
        if (!this.options.silent) {
          console.error('Error processing multi-page article:', error);
        }
        // If error, we add a note about it
        const errorNote = tempDoc.createElement('p');
        errorNote.innerHTML = '<em>This article appears to continue on subsequent pages which we could not extract</em>';
        allPages.push(errorNote);
        break;
      }
    }

    // If we have more than one page, combine the content
    if (allPages.length > 1) {
      // Create a container for all pages
      const combinedContent = tempDoc.createElement('div');

      // Add each page to the container
      for (const page of allPages) {
        combinedContent.appendChild(page);
      }

      // Update the HTML in the result
      result.html = combinedContent.innerHTML;

      return result;
    }

    // If we only have one page, return null to use the original result
    return null;
  }

  /**
   * Convert a relative URL to an absolute URL
   * @param url - URL to convert
   * @param baseUrl - Base URL for resolving
   * @returns - Absolute URL or null if error
   */
  private makeAbsoluteUrl(url: string, baseUrl: string): string | null {
    if (!url) {
      return null;
    }

    try {
      // Check if URL is already absolute
      if (/^https?:\/\//i.test(url)) {
        return url;
      }

      // Create absolute URL using the base URL
      const base = new URLParse(baseUrl);
      const absoluteUrl = new URLParse(url, base).toString();

      return absoluteUrl;
    } catch (error) {
      if (!this.options.silent) {
        console.error('Error making absolute URL:', error);
      }
      return null;
    }
  }

  /**
   * Get the URL for a single page view if available
   * @param html - HTML content
   * @param baseUrl - Base URL for resolving relative URLs
   * @returns - Single page URL or null
   */
  private async getSinglePageUrl(html: string, baseUrl: string): Promise<string | null> {
    try {
      const siteConfig = await this.siteConfigManager.getConfigForHost(new URLParse(baseUrl).hostname);

      if (!siteConfig.single_page_link || siteConfig.single_page_link.length === 0) {
        return null;
      }

      // Create temporary extractor to find single page link
      const tempExtractor = new ContentExtractor(this.options.extractor, this.siteConfigManager);
      await tempExtractor.process(html, baseUrl, siteConfig);

      // Check if single page link was found
      const singlePageUrl = tempExtractor.getSinglePageUrl();

      if (singlePageUrl) {
        // Make absolute URL if it's relative
        return this.makeAbsoluteUrl(singlePageUrl, baseUrl);
      }

      return null;
    } catch (error) {
      if (!this.options.silent) {
        console.error('Error getting single page URL:', error);
      }
      return null;
    }
  }
}

export { Graby, ContentExtractor, DomUtils };
export type {
  ExtractionResult,
  GrabyOptions,
  HttpClientOptions,
  ContentExtractorOptions,
  HttpResponse,
  SiteConfig
} from './lib/interfaces.js';