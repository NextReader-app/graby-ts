import { SiteConfig } from '../../lib/interfaces';

// Mock site configuration manager
export class MockSiteConfigManager {
  private configs: Record<string, SiteConfig> = {
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

  async getConfigForHost(hostname: string): Promise<SiteConfig | null> {
    return this.configs[hostname] || null;
  }
}