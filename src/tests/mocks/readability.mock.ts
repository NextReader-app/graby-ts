import { vi } from 'vitest';

// Mock for @mozilla/readability
export class Readability {
  constructor(document: Document, options?: any) {}

  parse() {
    return {
      title: 'Test Article Title',
      content: '<div><p>This is the first paragraph of the article.</p></div>',
      textContent: 'This is the first paragraph of the article.',
      length: 42,
      byline: 'Jane Doe',
      publishedTime: '2023-08-15T10:00:00Z'
    };
  }
}

// Mock global parser
export const __JSDOMParser__ = {
  prototype: {
    // Add required properties for Readability
    parseFromString: vi.fn()
  }
};