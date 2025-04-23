import type { SiteConfig as ExternalSiteConfig } from 'graby-ts-site-config/dist/types.js';

/**
 * Factory function to create a MockSiteConfigManager with flexible configuration
 */
export function createMockSiteConfigManager(options: {
  mockConfig?: ExternalSiteConfig | null,
  configByHost?: Record<string, ExternalSiteConfig>
} = {}) {
  return new MockSiteConfigManager(options);
}

/**
 * Unified MockSiteConfigManager implementation for testing
 */
export class MockSiteConfigManager {
  // Configuration for specific test
  public mockConfig: ExternalSiteConfig | null;

  // Configurations by host
  private configByHost: Record<string, ExternalSiteConfig>;

  constructor(options: {
    mockConfig?: ExternalSiteConfig | null,
    configByHost?: Record<string, ExternalSiteConfig>
  } = {}) {
    this.mockConfig = options.mockConfig || null;
    this.configByHost = options.configByHost || {
      'example.com': {
        title: ['//h1[@class="title"]'],
        body: ['//div[@class="content"]'],
        strip: ['//div[@class="ads"]'],
        find_string: ['<h1 class="bad-title">', '<div class="ad-container">'],
        replace_string: ['<h1 class="title">', '']
      },
      'news.example.org': {
        title: ['//h1[@class="article-title"]'],
        body: ['//article[@class="main-content"]'],
        next_page_link: ['//a[@class="next-page"]'],
        native_ad_clue: ['//div[@class="sponsored-content"]']
      }
    };
  }

  /**
   * Get configuration based on hostname
   * @param hostname - Host name to get config for
   * @returns Site configuration or null
   */
  async getConfigForHost(hostname: string): Promise<ExternalSiteConfig | null> {
    // mockConfig has priority if set
    if (this.mockConfig !== null) {
      return this.mockConfig;
    }

    // Otherwise return host-specific config or null
    return this.configByHost[hostname] || null;
  }

  /**
   * Convenient method to dynamically set mockConfig
   * @param config - Configuration to set or null to clear
   */
  setMockConfig(config: ExternalSiteConfig | null): void {
    this.mockConfig = config;
  }
}