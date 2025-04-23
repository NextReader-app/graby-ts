import { vi } from 'vitest';

// Mock for fontoxpath
export const evaluateXPathToNodes = vi.fn().mockImplementation((xpath: string) => {
  if (xpath.includes('title')) {
    return [{ 
      textContent: 'Test Article Title',
      nodeType: 1,
      hasAttribute: (): boolean => true, 
      getAttribute: (attr: string): string => attr === 'href' ? '/article/page2' : 'test',
      cloneNode: (): any => ({ textContent: 'Test Article Title Clone' }),
      parentNode: {
        removeChild: vi.fn()
      }
    }];
  } else if (xpath.includes('body')) {
    return [{ 
      textContent: 'This is the first paragraph of the article.',
      nodeType: 1,
      hasAttribute: (): boolean => true, 
      getAttribute: (): string => 'test',
      cloneNode: (): any => ({ textContent: 'Content Clone', innerHTML: '<p>This is the first paragraph of the article.</p>' }),
      parentNode: {
        removeChild: vi.fn()
      }
    }];
  } else if (xpath.includes('next_page') || xpath.includes('a[@class="next-page"]')) {
    return [{ 
      textContent: '/article/page2',
      nodeType: 1,
      hasAttribute: (attr: string): boolean => attr === 'href',
      getAttribute: (attr: string): string | null => attr === 'href' ? '/article/page2' : null,
      cloneNode: (): any => ({ textContent: 'Next Page Clone' }),
      parentNode: {
        removeChild: vi.fn()
      }
    }];
  } else if (xpath.includes('native_ad') || xpath.includes('sponsored')) {
    return [{ 
      textContent: 'Sponsored Content',
      nodeType: 1,
      hasAttribute: (): boolean => true, 
      getAttribute: (): string => 'test',
      cloneNode: (): any => ({ textContent: 'Native Ad Clone' }),
      parentNode: {
        removeChild: vi.fn()
      }
    }];
  } else {
    return [{ 
      textContent: 'Default Content',
      nodeType: 1,
      hasAttribute: (): boolean => true, 
      getAttribute: (): string => 'test',
      cloneNode: (): any => ({ textContent: 'Default Clone' }),
      parentNode: {
        removeChild: vi.fn()
      }
    }];
  }
});