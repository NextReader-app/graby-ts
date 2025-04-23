import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import { evaluateXPathToNodes, Node as FontoxpathNode } from 'fontoxpath';
import URLParse from 'url-parse';
import { format, parseISO } from 'date-fns';
import DOMPurify from 'dompurify';
import { ContentExtractorOptions, ExtractionResult, SiteConfig } from './interfaces';
import DomUtils from './DomUtils';

import type { SiteConfig as ExternalSiteConfig } from 'graby-ts-site-config/dist/types';

// Type definition for SiteConfigManager
interface SiteConfigManager {
  getConfigForHost(hostname: string): Promise<ExternalSiteConfig | null>;
}

/**
 * Extracts content from HTML using site-specific rules and Readability
 */
class ContentExtractor {
  private options: Required<ContentExtractorOptions>;
  private siteConfigManager: SiteConfigManager;
  private document: Document | null = null;
  private title: string | null = null;
  private content: Element | null = null;
  private authors: string[] = [];
  private date: string | null = null;
  private language: string | null = null;
  private image: string | null = null;
  private isNativeAd: boolean = false;
  private nextPageUrl: string | null = null;
  private singlePageUrl: string | null = null; // Added for single-page support
  private success: boolean = false;

  // List of accepted tags for wrap_in (for semantic HTML reasons)
  private acceptedWrapInTags: string[] = ['blockquote', 'p', 'div'];

  /**
   * Create a new ContentExtractor
   * @param options - Extractor options
   * @param siteConfigManager - SiteConfig manager instance
   */
  constructor(options: ContentExtractorOptions = {}, siteConfigManager: SiteConfigManager) {
    this.options = {
      enableXss: true,
      ...options
    };
    this.siteConfigManager = siteConfigManager;
  }

  /**
   * Reset the extractor state between extractions
   */
  reset(): void {
    this.document = null;
    this.title = null;
    this.content = null;
    this.authors = [];
    this.date = null;
    this.language = null;
    this.image = null;
    this.isNativeAd = false;
    this.nextPageUrl = null;
    this.singlePageUrl = null; // Reset single page URL
    this.success = false;
  }

  /**
   * Process HTML content and extract article
   * @param html - HTML content
   * @param url - URL of the page
   * @param siteConfig - Optional site configuration (to avoid fetching it again)
   * @returns - Success status
   */
  async process(html: string, url: string, siteConfig?: SiteConfig): Promise<boolean> {
    this.reset();

    // Parse URL
    const parsedUrl = new URLParse(url);

    // Get site config if not provided
    if (!siteConfig) {
      siteConfig = await this.siteConfigManager.getConfigForHost(parsedUrl.hostname) || undefined;
    }

    // Apply string replacements from site config if available
    if (siteConfig && siteConfig.find_string && siteConfig.replace_string) {
      html = this.processStringReplacements(html, siteConfig);
    }

    // Parse HTML with LinkedOM
    const { document } = parseHTML(html);
    this.document = document;

    // Fix document for Readability compatibility
    this.prepareDocumentForReadability(document, url);

    // Extract metadata (OpenGraph, JSON-LD, etc.)
    this.extractMetadata(document);

    // Extract links to single page and next page
    if (siteConfig) {
      this.extractSinglePageUrl(document, siteConfig);
      this.extractNextPageUrl(document, siteConfig);

      // Apply site-specific extraction rules
      this.applySiteConfig(siteConfig, document);
    }

    // If we don't have content yet, use Readability as fallback
    if (!this.content) {
      this.applyReadability(document);
    }

    // Post-process content (fix URLs, lazy images, etc.)
    if (this.content) {
      this.postProcess(parsedUrl);
      this.success = true;
    }

    return this.success;
  }

  /**
   * Get the URL to the next page, if found
   * @returns - Next page URL or null
   */
  public getNextPageUrl(): string | null {
    return this.nextPageUrl;
  }

  /**
   * Get the URL to the single page view, if found
   * @returns - Single page URL or null
   */
  public getSinglePageUrl(): string | null {
    return this.singlePageUrl;
  }

  /**
   * Prepare document for Readability compatibility
   * @param document - DOM document
   * @param url - URL of the page
   */
  private prepareDocumentForReadability(document: Document, url: string): void {
    // Set baseURI if not present (respects existing <base> tag if present)
    if (!document.baseURI) {
      // Create clean URL for baseURI (without hash fragment as per spec)
      const parsedUrl = new URLParse(url);
      parsedUrl.set('hash', '');
      const cleanBaseUrl = parsedUrl.toString();

      try {
        Object.defineProperty(document, 'baseURI', {
          get: function() { return cleanBaseUrl; }
        });
      } catch (e) {
        console.warn("Could not set baseURI:", e);
      }
    }

    // Set documentURI to the full original URL
    try {
      Object.defineProperty(document, 'documentURI', {
        get: function() { return url; }
      });
    } catch (e) {
      console.warn("Could not set documentURI:", e);
    }

    (document as any).location = { href: url };

    // Add minimal TreeWalker implementation if needed
    if (!(document as any).createTreeWalker) {
      (document as any).createTreeWalker = function(root: Node) {
        return {
          root,
          currentNode: root,
          nextNode() { return null; }
        };
      };
    }
  }

  /**
   * Extract metadata from document
   * @param document - DOM document
   */
  private extractMetadata(document: Document): void {
    // Extract metadata in priority order:

    // First get basic metadata (title from title tag, language, etc)
    this.extractBasicMetadata(document);

    // Then OpenGraph metadata (which may override basic metadata)
    this.extractOpenGraph(document);

    // Finally JSON-LD metadata (highest priority)
    this.extractJsonLd(document);
  }

  /**
   * Extract OpenGraph metadata
   * @param document - DOM document
   */
  private extractOpenGraph(document: Document): void {
    // Extract og:title, og:image, etc.
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImage = document.querySelector('meta[property="og:image"]');

    // OpenGraph should override basic metadata
    if (ogTitle && ogTitle.getAttribute('content')) {
      this.title = ogTitle.getAttribute('content');
    }
    if (ogImage) this.image = ogImage.getAttribute('content');

    // Extract article metadata
    const articlePublished = document.querySelector('meta[property="article:published_time"]');
    if (articlePublished) this.date = articlePublished.getAttribute('content');
  }

  /**
   * Extract basic metadata
   * @param document - DOM document
   */
  private extractBasicMetadata(document: Document): void {
    // Extract language
    const htmlElement = document.documentElement;
    if (htmlElement && htmlElement.hasAttribute('lang')) {
      this.language = htmlElement.getAttribute('lang');
    }

    // Extract title if not already set
    if (!this.title && document.title) {
      this.title = document.title;
    }
  }

  /**
   * Extract JSON-LD metadata
   * @param document - DOM document
   */
  private extractJsonLd(document: Document): void {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '{}');

        // Extract article data
        if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle') {
          // JSON-LD should override other metadata sources
          if (data.headline) {
            this.title = data.headline;
          }

          // JSON-LD date should override other sources too
          if (data.datePublished) {
            this.date = data.datePublished;
          }

          // Extract authors
          if (data.author) {
            if (typeof data.author === 'string') {
              this.authors.push(data.author);
            } else if (data.author.name) {
              this.authors.push(data.author.name);
            }
          }
        }
      } catch (_e) {
        // Ignore JSON parsing errors
      }
    });
  }

  /**
   * Apply Readability algorithm as fallback
   * @param document - DOM document
   */
  private applyReadability(document: Document): void {
    try {
      // Create Readability instance
      const reader = new Readability(document as any, {
        // Optional Readability options
        charThreshold: 500
      });

      // Parse article
      const article = reader.parse();

      if (article) {
        // Use article data if needed
        if (!this.title) {
          this.title = article.title || null;
        }

        // Create content element
        if (!this.content) {
          const { document: contentDoc } = parseHTML(`<div>${article.content}</div>`);
          this.content = contentDoc.querySelector('div');

          // Set success to true when content is created through Readability
          if (this.content) {
            this.success = true;
          }
        }

        // Use article metadata
        if (!this.date && article.publishedTime) {
          this.date = article.publishedTime;
        }

        if (this.authors.length === 0 && article.byline) {
          this.authors = [article.byline];
        }
      }
    } catch (e) {
      console.error('Error applying Readability:', e);
    }
  }

  /**
   * Process string replacements from site config
   * @param html - HTML content
   * @param siteConfig - Site configuration
   * @returns - Processed HTML
   */
  private processStringReplacements(html: string, siteConfig: SiteConfig): string {
    let processed = html;

    if (siteConfig.find_string && siteConfig.replace_string) {
      for (let i = 0; i < siteConfig.find_string.length; i++) {
        const find = siteConfig.find_string[i];
        const replace = siteConfig.replace_string[i] || '';

        // Safely handle regex characters
        const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        processed = processed.replace(new RegExp(escapedFind, 'g'), replace);
      }
    }

    return processed;
  }

  /**
   * Extract single page URL from document using site config rules
   * @param document - DOM document
   * @param siteConfig - Site configuration
   */
  private extractSinglePageUrl(document: Document, siteConfig: SiteConfig): void {
    if (!siteConfig.single_page_link || siteConfig.single_page_link.length === 0) {
      return;
    }

    for (const pattern of siteConfig.single_page_link) {
      try {
        // Check if there's a condition for this pattern
        if (siteConfig.if_page_contains &&
            !Array.isArray(siteConfig.if_page_contains) &&
            siteConfig.if_page_contains.single_page_link &&
            siteConfig.if_page_contains.single_page_link[pattern]) {

          const condition = siteConfig.if_page_contains.single_page_link[pattern];
          const conditionNodes = evaluateXPathToNodes(condition, document, null, null);

          // Skip this pattern if condition isn't met
          if (!conditionNodes || conditionNodes.length === 0) {
            continue;
          }
        }

        // Try to evaluate the XPath expression
        const result = evaluateXPathToNodes(pattern, document, null, null);

        if (typeof result === 'string') {
          this.singlePageUrl = String(result).trim();
          break;
        } else if (result && result.length > 0) {
          for (const node of result) {
            if (node instanceof Element && node.hasAttribute('href')) {
              this.singlePageUrl = node.getAttribute('href');
              break;
            } else if (node instanceof Attr && node.value) {
              this.singlePageUrl = node.value;
              break;
            } else if (node && (node as any).textContent) {
              this.singlePageUrl = (node as any).textContent.trim();
              break;
            }
          }

          if (this.singlePageUrl) {
            break;
          }
        }
      } catch (e) {
        console.error('Error evaluating single page XPath:', e);
      }
    }
  }

  /**
   * Extract next page URL from document using site config rules
   * @param document - DOM document
   * @param siteConfig - Site configuration
   */
  private extractNextPageUrl(document: Document, siteConfig: SiteConfig): void {
    if (!siteConfig.next_page_link || siteConfig.next_page_link.length === 0) {
      return;
    }

    for (const pattern of siteConfig.next_page_link) {
      try {
        // Check if there's a condition for this pattern
        if (siteConfig.if_page_contains &&
            !Array.isArray(siteConfig.if_page_contains) &&
            siteConfig.if_page_contains.next_page_link &&
            siteConfig.if_page_contains.next_page_link[pattern]) {

          const condition = siteConfig.if_page_contains.next_page_link[pattern];
          const conditionNodes = evaluateXPathToNodes(condition, document, null, null);

          // Skip this pattern if condition isn't met
          if (!conditionNodes || conditionNodes.length === 0) {
            continue;
          }
        }

        // Try to evaluate the XPath expression
        const result = evaluateXPathToNodes(pattern, document, null, null);

        if (typeof result === 'string') {
          this.nextPageUrl = String(result).trim();
          break;
        } else if (result && result.length > 0) {
          for (const node of result) {
            if (node instanceof Element && node.hasAttribute('href')) {
              this.nextPageUrl = node.getAttribute('href');
              break;
            } else if (node instanceof Attr && node.value) {
              this.nextPageUrl = node.value;
              break;
            } else if (node && (node as any).textContent) {
              this.nextPageUrl = (node as any).textContent.trim();
              break;
            }
          }

          if (this.nextPageUrl) {
            break;
          }
        }
      } catch (e) {
        console.error('Error evaluating next page XPath:', e);
      }
    }
  }

  /**
   * Wrap elements with the provided tag
   * @param elements - Elements to wrap
   * @param tag - HTML tag to wrap elements with
   * @param logMessage - Optional log message
   */
  private wrapElements(elements: FontoxpathNode[], tag: string, logMessage?: string): void {
    if (!elements || elements.length === 0) {
      return;
    }

    if (logMessage) {
      console.log(logMessage, { length: elements.length });
    }

    for (const item of elements) {
      if (item instanceof Element && item.parentNode) {
        const document = item.ownerDocument;
        const newNode = document.createElement(tag);
        newNode.innerHTML = item.outerHTML;

        item.parentNode.replaceChild(newNode, item);
      }
    }
  }

  /**
   * Apply site-specific config rules
   * @param siteConfig - Site configuration
   * @param document - DOM document
   */
  private applySiteConfig(siteConfig: SiteConfig, document: Document): void {
    // This is a simplified implementation
    // In a full version, this would apply all the XPath patterns from site config

    // Extract title
    if (siteConfig.title && siteConfig.title.length > 0) {
      for (const titleXPath of siteConfig.title) {
        try {
          const titleNodes = evaluateXPathToNodes(titleXPath, document, null, null);
          if (titleNodes.length > 0) {
            const titleNode = titleNodes[0] as Node;
            this.title = titleNode.textContent || null;
            break;
          }
        } catch (e) {
          console.error('Error evaluating title XPath:', e);
        }
      }
    }

    // Check for native ads
    if (siteConfig.native_ad_clue && siteConfig.native_ad_clue.length > 0) {
      for (const clueXPath of siteConfig.native_ad_clue) {
        try {
          const clueNodes = evaluateXPathToNodes(clueXPath, document, null, null);
          if (clueNodes.length > 0) {
            this.isNativeAd = true;
            break;
          }
        } catch (e) {
          console.error('Error evaluating native ad clue XPath:', e);
        }
      }
    }

    // Extract main content
    if (siteConfig.body && siteConfig.body.length > 0) {
      for (const bodyXPath of siteConfig.body) {
        try {
          const bodyNodes = evaluateXPathToNodes(bodyXPath, document, null, null);
          if (bodyNodes.length > 0) {
            // Create a container for the content if multiple nodes
            const container = document.createElement('div');
            bodyNodes.forEach(node => {
              const elemNode = node as Node;
              if (elemNode.cloneNode) {
                container.appendChild(elemNode.cloneNode(true));
              }
            });
            this.content = container;
            break;
          }
        } catch (e) {
          console.error('Error evaluating body XPath:', e);
        }
      }
    }

    // Handle wrap_in rules - wrap elements with specified tags
    if (siteConfig.wrap_in) {
      for (const [tag, pattern] of Object.entries(siteConfig.wrap_in)) {
        // Only allow specific tags for semantic HTML reasons
        if (!this.acceptedWrapInTags.includes(tag)) {
          console.warn(`Tag "${tag}" is not allowed for wrap_in. Only blockquote, p, and div are supported for semantic HTML reasons.`);
          continue;
        }

        try {
          const elems = evaluateXPathToNodes(pattern, document, null, null);
          if (elems.length > 0) {
            this.wrapElements(Array.from(elems), tag, `Wrapping ${elems.length} elements with ${tag}`);
          }
        } catch (e) {
          console.error('Error evaluating wrap_in XPath:', e);
        }
      }
    }

    // Handle strip rules - remove unwanted elements
    if (siteConfig.strip && siteConfig.strip.length > 0) {
      for (const stripXPath of siteConfig.strip) {
        try {
          const stripNodes = evaluateXPathToNodes(stripXPath, document, null, null);
          stripNodes.forEach(node => {
            const elemNode = node as Node;
            if (elemNode.parentNode) {
              elemNode.parentNode.removeChild(elemNode);
            }
          });
        } catch (e) {
          console.error('Error evaluating strip XPath:', e);
        }
      }
    }
  }

  /**
   * Post-process extracted content
   * @param parsedUrl - Parsed URL
   */
  private postProcess(parsedUrl: URLParse<string>): void {
    if (this.content) {
      // Fix relative URLs to absolute
      DomUtils.makeUrlsAbsolute(this.content, parsedUrl.toString());

      // Handle lazy-loaded images
      DomUtils.fixLazyImages(this.content);

      // Apply XSS protection
      if (this.options.enableXss) {
        this.applyXssProtection();
      }
    }

    // Format date consistently
    if (this.date) {
      try {
        const parsedDate = parseISO(this.date);
        this.date = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
      } catch (_e) {
        // Keep original date if parsing fails
      }
    }
  }

  /**
   * Apply XSS protection to content
   */
  private applyXssProtection(): void {
    if (!this.content) return;

    // Use DOMPurify to sanitize content
    const html = this.content.innerHTML;
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'a', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em',
        'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
        'li', 'ol', 'p', 'pre', 'section', 'strong', 'table', 'tbody',
        'td', 'th', 'thead', 'tr', 'ul', 'iframe'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'srcset', 'alt', 'title', 'class', 'id', 'width',
        'height', 'target'
      ],
      KEEP_CONTENT: true
    });

    this.content.innerHTML = clean;
  }

  /**
   * Get the extracted content as HTML string
   * @returns - HTML content
   */
  getContentAsHtml(): string {
    if (!this.content) return '';
    return this.content.innerHTML;
  }

  /**
   * Get the extraction result
   * @returns - Extraction result
   */
  getResult(): ExtractionResult {
    return {
      title: this.title || '',
      html: this.getContentAsHtml(),
      authors: this.authors,
      date: this.date,
      language: this.language,
      image: this.image,
      nextPageUrl: this.nextPageUrl,
      isNativeAd: this.isNativeAd,
      success: this.success
    };
  }
}

export default ContentExtractor;