import { vi } from 'vitest';

// Mock for DOMPurify
const DOMPurify = {
  sanitize: vi.fn().mockImplementation((html, options) => {
    return html; // Simply return the input HTML
  })
};

export default DOMPurify;