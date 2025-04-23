// Base interfaces for HTTP adapters
export interface IHttpAdapter {
  request(url: string, options: any): Promise<AdapterResponse>;
}

export interface AdapterResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  text(): Promise<string>;
  redirected?: boolean;
}

// Placeholder function for adapter creation (will be overridden)
export function createHttpAdapter(): IHttpAdapter {
  throw new Error('Implementation not available');
}