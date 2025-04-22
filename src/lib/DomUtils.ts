import URLParse from 'url-parse';

/**
 * Utility functions for DOM manipulation
 */
class DomUtils {
  /**
   * Make URLs in element absolute
   * @param element - Element containing URLs
   * @param baseUrl - Base URL for resolution
   */
  static makeUrlsAbsolute(element: Element, baseUrl: string): void {
    if (!element) return;

    const base = new URLParse(baseUrl);

    // Process links
    const links = element.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        link.setAttribute('href', this.resolveUrl(href, base));
      }
    });

    // Process images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        img.setAttribute('src', this.resolveUrl(src, base));
      }

      // Process srcset
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const newSrcset = srcset.split(',').map(part => {
          const [url, descriptor] = part.trim().split(/\s+/);
          return `${this.resolveUrl(url, base)} ${descriptor || ''}`.trim();
        }).join(', ');

        img.setAttribute('srcset', newSrcset);
      }
    });
  }

  /**
   * Resolve a URL against a base URL
   * @param url - URL to resolve
   * @param base - Base URL
   * @returns - Resolved absolute URL
   */
  static resolveUrl(url: string, base: URLParse<string>): string {
    // Skip already absolute URLs
    if (/^(https?:)?\/\//i.test(url)) {
      return url;
    }

    // Skip anchor links and javascript
    if (url.startsWith('#') || url.startsWith('javascript:')) {
      return url;
    }

    try {
      // Parse and resolve URL
      return new URLParse(url, base as any).toString();
    } catch (e) {
      return url;
    }
  }

  /**
   * Fix lazy-loaded images
   * @param element - Element containing images
   */
  static fixLazyImages(element: Element): void {
    if (!element) return;

    const images = element.querySelectorAll('img');

    images.forEach(img => {
      // Common lazy load attributes
      const lazyAttrs = [
        'data-src', 'data-lazy-src', 'data-original',
        'data-srcset', 'data-lazy-srcset', 'loading-src'
      ];

      // Check for lazy load attributes
      lazyAttrs.forEach(attr => {
        const value = img.getAttribute(attr);
        if (value) {
          // Handle src attributes
          if (attr.endsWith('src')) {
            img.setAttribute('src', value);
          }

          // Handle srcset attributes
          if (attr.endsWith('srcset')) {
            img.setAttribute('srcset', value);
          }

          // Remove the data attribute
          // Make sure removeAttribute is a function before calling it
          if (typeof img.removeAttribute === 'function') {
            img.removeAttribute(attr);
          }
        }
      });

      // Check for placeholder images
      const src = img.getAttribute('src');
      if (src && (
        src.includes('data:image/') ||
        src.includes('blank.gif') ||
        src.endsWith('1x1.png')
      )) {
        // If we've set a real src from data attribute, remove placeholder
        if (img.hasAttribute('data-src') || img.hasAttribute('data-original')) {
          img.removeAttribute('src');
        }
      }
    });
  }
}

export default DomUtils;