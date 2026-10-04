import URLParse from 'url-parse';

// The marking a link standing in for an embed travels under, from linkEmbeds
// to frameEmbeds
export const EMBED_CLASS = 'graby-embed';

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

    // Process frames, whose address is as relative as any other
    const frames = element.querySelectorAll('iframe');
    frames.forEach(frame => {
      const src = frame.getAttribute('src');
      if (src) {
        frame.setAttribute('src', this.resolveUrl(src, base));
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
    } catch (_e) {
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
  /**
   * Carry an embed placeholder through extraction as a link.
   *
   * A placeholder is an empty element holding the address of the embed in
   * `data-src`, which the script of the site turns into an iframe once the page
   * runs - habr builds the videos of an article this way. Nothing runs that
   * script here, so the element would reach the reader as an empty box.
   *
   * A link is the one shape that survives the way in: an empty element is junk
   * to Readability, and a frame it keeps only when the address looks like a
   * video to it. frameEmbeds writes the frame out afterwards.
   * @param element - Element containing placeholders
   */
  static linkEmbeds(element: Element): void {
    if (!element) return;

    const placeholders = element.querySelectorAll('[data-src]');

    placeholders.forEach(node => {
      // A media element carries its own address and is left to fixLazyImages
      if (!this.embedContainers.has(node.tagName)) {
        return;
      }

      const src = node.getAttribute('data-src');

      // `data-src` serves a hundred other purposes. A relative address is kept:
      // makeUrlsAbsolute reaches it later, as it does every other one
      if (!src || (!/^(https?:)?\/\//i.test(src) && !src.startsWith('/'))) {
        return;
      }

      // Anything holding content of its own is not a placeholder
      if (node.children.length || (node.textContent || '').trim()) {
        return;
      }

      const document = node.ownerDocument;
      const parent = node.parentNode;

      if (!document || !parent) {
        return;
      }

      const link = document.createElement('a');

      link.setAttribute('class', EMBED_CLASS);
      link.setAttribute('href', src);
      // Readability keeps no empty link
      link.textContent = new URLParse(src).hostname || src;

      parent.replaceChild(link, node);
    });
  }

  /**
   * Write out the frame each embed link stands for - what the script of the
   * site would have built, had anything run it.
   * @param element - Extracted content, with its addresses already absolute
   */
  static frameEmbeds(element: Element): void {
    if (!element) return;

    element.querySelectorAll(`a.${EMBED_CLASS}`).forEach(link => {
      const src = link.getAttribute('href');

      // The marking is a class, and the page being extracted could carry one of
      // its own: nothing but an address on the web goes into a frame
      if (!src || !/^https?:\/\//i.test(src)) {
        return;
      }

      const document = link.ownerDocument;
      const parent = link.parentNode;

      if (!document || !parent) {
        return;
      }

      const frame = document.createElement('iframe');

      frame.setAttribute('src', src);
      frame.setAttribute('allowfullscreen', '');

      parent.replaceChild(frame, link);
    });
  }

  // What may stand in for an embed. A placeholder is a container the script of
  // the site fills, never an element that would carry the embed itself
  private static embedContainers = new Set(['DIV', 'SPAN', 'P', 'FIGURE', 'SECTION']);
}

export default DomUtils;
