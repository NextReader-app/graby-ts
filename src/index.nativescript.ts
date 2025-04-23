import { NativeScriptAdapter } from './lib/NativeScriptAdapter.js';
import { IHttpAdapter } from './lib/HttpAdapterInterface.js';
import HttpClient from './lib/HttpClient.js';

// NativeScript specific adapter factory
export function getHttpAdapter(): IHttpAdapter {
  return new NativeScriptAdapter();
}

// Re-export everything from the core module
export * from './core.js';
// Export HttpClient which needs the platform-specific adapter
export { HttpClient };