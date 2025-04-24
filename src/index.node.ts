import { FetchAdapter } from './lib/FetchAdapter.js';
import { IHttpAdapter } from './lib/HttpAdapterInterface.js';
import HttpClient from './lib/HttpClient.js';
import { Graby } from './core.js';
import { HttpClientOptions, GrabyOptions } from './lib/interfaces.js';

// Create a platform-specific adapter factory
export function createAdapter(): IHttpAdapter {
  return new FetchAdapter();
}

// Create a wrapper for Graby with pre-configured adapter
export class NodeGraby extends Graby {
  constructor(options: GrabyOptions = {}) {
    // Pre-configure the HttpClient with our adapter
    const httpClientFactory = (httpOptions: HttpClientOptions) => {
      return new HttpClient(httpOptions, createAdapter());
    };

    super({
      ...options,
      httpClientFactory
    });
  }
}

// For direct use with existing code, re-export
export { Graby };

// Re-export everything from the core module
export * from './core.js';
export { HttpClient };