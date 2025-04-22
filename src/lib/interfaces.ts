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
}

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  userAgent?: string;
  referer?: string;
  maxRedirects?: number;
  silent?: boolean;
}

/**
 * Fetch options
 */
export interface FetchOptions {
  skipTypeCheck?: boolean;
  headers?: Record<string, string>;
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
  // Other site config properties...
}

/**
 * Graby options
 */
export interface GrabyOptions {
  httpClient?: HttpClientOptions;
  extractor?: ContentExtractorOptions;
  siteConfig?: Record<string, any>;
  silent?: boolean;
}