// Default site config for tests
export const defaultSiteConfig = {
  title: ['.//title'],
  body: ['.//div[@class="content"]'],
  date: ['.//meta[@property="article:published_time"]/@content'],
  author: ['.//span[@class="author"]'],
  strip: ['.//div[@class="comments"]'],
  next_page_link: ['.//a[@class="next-page"]'],
  native_ad_clue: ['.//div[@class="sponsored"]', './/span[contains(text(), "Sponsored")]'],
  find_string: ['oldText'],
  replace_string: ['newText']
};

// Site config with HTTP headers for testing
export const siteConfigWithHeaders = {
  ...defaultSiteConfig,
  http_header: {
    'user-agent': 'Site Specific User Agent',
    'referer': 'https://site-specific-referer.com',
    'cookie': 'session=abc123',
    'accept': 'application/json',
    // These should be ignored by the HttpClient:
    'X-API-Key': 'site-specific-key',
    'Authorization': 'Bearer site-token'
  }
};

// Variable to control which config to return
export let currentSiteConfig = defaultSiteConfig;

// Mock for graby-ts-site-config
export class SiteConfigManager {
  async getConfigForHost(hostname: string) {
    // Return the current site config
    return currentSiteConfig;
  }
}

// Create a mock version that can be easily customized for tests
export class MockSiteConfigManager extends SiteConfigManager {
  // Add mockConfig property to the class definition
  public mockConfig: any = null;
  
  // Override the getConfigForHost method to use mockConfig when available
  async getConfigForHost(hostname: string) {
    if (this.mockConfig) {
      return this.mockConfig;
    }
    return super.getConfigForHost(hostname);
  }
}

// Default export a singleton instance
const siteConfigManager = new SiteConfigManager();
export default siteConfigManager;

// Also export the parsing function
export const parseConfigFile = jest.fn();