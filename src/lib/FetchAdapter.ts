import { IHttpAdapter, AdapterResponse } from './HttpAdapterInterface.js';
// Direct import of isomorphic-fetch
import fetch from 'isomorphic-fetch';

// Adapter for Node.js and browsers using fetch API
export class FetchAdapter implements IHttpAdapter {
  async request(url: string, options: any): Promise<AdapterResponse> {
    // Set timeout
    const timeout = options.timeout || 30000;

    // Create controller for request cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        url: response.url,
        status: response.status,
        headers: this.extractHeaders(response.headers),
        redirected: response.redirected,
        text: () => response.text()
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // @ts-expect-error todo
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

// Override adapter creation function
export function createHttpAdapter(): IHttpAdapter {
  return new FetchAdapter();
}