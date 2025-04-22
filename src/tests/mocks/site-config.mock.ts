// Mock for grabby-js-site-config
export class SiteConfigManager {
  async getConfigForHost(hostname: string) {
    // Return a mock configuration for testing
    return {
      title: ['.//h1', './/title'],
      body: ['.//div[@class="content"]'],
      date: ['.//meta[@property="article:published_time"]/@content'],
      author: ['.//span[@class="author"]'],
      strip: ['.//div[@class="comments"]'],
      find_string: ['oldText'],
      replace_string: ['newText']
    };
  }
}

// Default export a singleton instance
const siteConfigManager = new SiteConfigManager();
export default siteConfigManager;

// Also export the parsing function
export const parseConfigFile = jest.fn();