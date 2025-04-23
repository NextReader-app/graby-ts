import { IHttpAdapter, AdapterResponse } from './HttpAdapterInterface.js';
// Direct import, as this file will only be used in NativeScript environment
import { Http } from '@nativescript/core';

// Adapter for NativeScript
export class NativeScriptAdapter implements IHttpAdapter {
  async request(url: string, options: any): Promise<AdapterResponse> {
    const timeout = options.timeout || 30000;

    const nsOptions = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout
    };

    const response = await Http.request(nsOptions);

    return {
      url: url,
      status: response.statusCode,
      headers: this.extractHeaders(response.headers),
      redirected: false,
      text: async () => response.content?.toString() || ''
    };
  }
  
  private extractHeaders(headers: any): Record<string, string> {
    const result: Record<string, string> = {};
    // NativeScript Headers is different from DOM Headers
    if (headers && typeof headers === 'object') {
      Object.keys(headers).forEach(key => {
        const value = headers[key];
        result[key] = typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : String(value));
      });
    }
    return result;
  }
}

// Override adapter creation function
export function createHttpAdapter(): IHttpAdapter {
  return new NativeScriptAdapter();
}