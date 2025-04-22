// Mock for @mozilla/readability
export class Readability {
  constructor(document: Document, options?: any) {}

  parse() {
    return {
      title: 'Readability Title',
      content: '<div><p>Readability content</p></div>',
      textContent: 'Readability content plain text',
      length: 20,
      byline: 'Readability Author',
      publishedTime: '2023-08-15T10:00:00Z'
    };
  }
}

// Mock global parser
export const __JSDOMParser__ = {
  prototype: {
    // Add required properties for Readability
    parseFromString: jest.fn()
  }
};