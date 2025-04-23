// Vitest global setup
import { vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Setup ESM-friendly global variables
globalThis.vi = vi;

beforeEach(() => {
  vi.clearAllMocks();
});

// Silence console output during test runs unless specifically testing console behavior
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Mute console output during tests
  console.log = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Set up fetch mock
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    status: 200,
    url: 'https://example.com',
    redirected: false,
    headers: new Headers({
      'content-type': 'text/html'
    }),
    text: () => Promise.resolve('<html><body>Test content</body></html>')
  })
);

// Set up Headers mock
global.Headers = class Headers {
  constructor(init) {
    this.headers = {};
    if (init) {
      Object.keys(init).forEach(key => {
        this.headers[key] = init[key];
      });
    }
  }

  get(name) {
    return this.headers[name.toLowerCase()];
  }

  has(name) {
    return this.headers.hasOwnProperty(name.toLowerCase());
  }

  set(name, value) {
    this.headers[name.toLowerCase()] = value;
  }

  forEach(callback) {
    Object.keys(this.headers).forEach(key => {
      callback(this.headers[key], key, this);
    });
  }
};