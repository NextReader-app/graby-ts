import { FetchAdapter } from './lib/FetchAdapter.js';
import { IHttpAdapter } from './lib/HttpAdapterInterface.js';
import HttpClient from './lib/HttpClient.js';

// Node.js specific adapter factory
export function getHttpAdapter(): IHttpAdapter {
  return new FetchAdapter();
}

// Re-export everything from the core module
export * from './core.js';
// Export HttpClient which needs the platform-specific adapter
export { HttpClient };