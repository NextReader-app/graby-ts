import HttpClient from "./HttpClient.js";

/**
 * HTTP response interface
 */
export interface HttpResponse {
  url: string;
  html: string | null;
  contentType: string;
  status: number;
  headers: Record<string, string>;
  specialContent?: boolean;
  rawBytes?: Uint8Array;
  detectedEncoding?: string; // Detected encoding from the content
}

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  userAgent?: string;
  referer?: string;
  maxRedirects?: number;
  silent?: boolean;
  autoDetectEncoding?: boolean; // Whether to auto-detect encoding (default: true)
  forceEncoding?: string | null; // Force specific encoding (default: null)
}

/**
 * Fetch options
 */
export interface FetchOptions {
  skipTypeCheck?: boolean;
  headers?: Record<string, string>;
  rawResponse?: boolean; // Return raw bytes instead of converted text
}

/**
 * Content extractor options
 */
export interface ContentExtractorOptions {
  enableXss?: boolean;
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  title: string;
  html: string;
  authors: string[];
  date: string | null;
  language: string | null;
  image: string | null;
  nextPageUrl: string | null;
  isNativeAd: boolean;
  success: boolean;
  originalUrl?: string;
  finalUrl?: string;
  status?: number;
  detectedEncoding?: string; // Detected content encoding
}

/**
 * Site configuration interface
 */
export interface SiteConfig {
  title?: string[];
  body?: string[];
  date?: string[];
  author?: string[];
  strip?: string[];
  strip_id_or_class?: string[];
  find_string?: string[];
  replace_string?: string[];
  next_page_link?: string[];
  single_page_link?: string[];
  native_ad_clue?: string[];

  // Add support for conditional expressions
  if_page_contains?: {
    next_page_link?: Record<string, string>;
    single_page_link?: Record<string, string>;
  } | string[];

  // Other site config properties
  tidy?: boolean;
  prune?: boolean;
  autodetect_on_failure?: boolean;
  parser?: string;
  http_header?: Record<string, string>;
  wrap_in?: Record<string, string>;
  src_lazy_load_attr?: string | string[];
  skip_json_ld?: boolean;
}

/**
 * Graby options
 */
export interface GrabyOptions {
  httpClient?: HttpClientOptions;
  extractor?: ContentExtractorOptions;
  siteConfig?: Record<string, any>;
  silent?: boolean;
  multipage?: boolean; // Control for multi-page support
  multipageLimit?: number; // Maximum number of pages to process
  httpClientFactory?: ((options: HttpClientOptions) => HttpClient) | null; // An option for testing
}