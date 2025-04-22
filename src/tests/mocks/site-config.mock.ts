// Mock for graby-ts-site-config
export class SiteConfigManager {
  async getConfigForHost(hostname: string) {
    // Return a mock configuration for testing
    return {
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