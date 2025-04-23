import * as xPath2Selector from "xpath-to-selector";

/**
 * Simple helper class to convert XPath to CSS selectors
 */
class XPathHelper {
  /**
   * Evaluates XPath expression using CSS selectors
   * @param xpath - XPath expression to evaluate
   * @param contextNode - Context node (document or element)
   * @returns - Array of matching nodes
   */
  static evaluateXPath(
    xpath: string,
    contextNode: Node,
  ): Node[] {
    // Handle empty or invalid xpath
    if (!xpath) {
      return [];
    }

    try {
      // Convert XPath to CSS selector using xpath-to-selector library
      const cssSelector = xPath2Selector.xpath2css(xpath);
      if (cssSelector) {
        // Get appropriate context for querying
        const context = this.getQueryContext(contextNode);

        if (!context) {
          console.warn('Invalid context node for CSS query');
          return [];
        }

        // Return matching nodes
        return Array.from(context.querySelectorAll(cssSelector));
      }
    } catch (error) {
      console.error(`Error converting XPath "${xpath}" to CSS:`, error);
    }

    console.warn(`Could not convert XPath to CSS: ${xpath}`);
    return [];
  }

  /**
   * Safely get a node that can be used for querySelectorAll
   * @param node - Node to check
   * @returns - Node that supports querySelectorAll or null
   */
  private static getQueryContext(node: Node): Document | Element | null {
    // Check if node itself has querySelectorAll method
    if (node && typeof (node as any).querySelectorAll === 'function') {
      return node as any;
    }

    // Check if node has ownerDocument with querySelectorAll
    if (node && (node as any).ownerDocument &&
        typeof (node as any).ownerDocument.querySelectorAll === 'function') {
      return (node as any).ownerDocument;
    }

    return null;
  }
}

export default XPathHelper;