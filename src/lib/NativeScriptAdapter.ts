import { IHttpAdapter, AdapterResponse } from './HttpAdapterInterface.js';
// Direct import, as this file will only be used in NativeScript environment
import { Http, isAndroid } from '@nativescript/core';

// java.nio lives in the Android runtime, which declares no types of its own
declare const java: any;

/**
 * The response body as bytes.
 *
 * On Android the portable toArrayBuffer() reads the Java byte array one element
 * at a time over the JNI bridge - a quarter of a second for a 300KB page - while
 * the runtime converts a java.nio.ByteBuffer in a single step. On iOS the same
 * method is already a zero copy interop call, so it is used as it stands.
 */
function toBytes(content: any): Uint8Array {
  if (isAndroid && content.raw) {
    try {
      const buffer = java.nio.ByteBuffer.wrap(content.raw.toByteArray());

      return new Uint8Array((ArrayBuffer as any).from(buffer));
    } catch {
      // Whatever the runtime did not support, the portable path still covers
    }
  }

  return new Uint8Array(content.toArrayBuffer());
}

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

    // NativeScript Http returns both text and binary content
    const response = await Http.request(nsOptions);

    return {
      url: url,
      status: response.statusCode,
      headers: this.extractHeaders(response.headers),
      redirected: false,
      text: async () => {
        // Return text content
        if (response.content) {
          return response.content.toString();
        }
        return '';
      },
      bytes: async () => {
        // Convert content to Uint8Array
        if (response.content) {
          return toBytes(response.content);
        }

        // Fallback to empty Uint8Array
        return new Uint8Array(0);
      }
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