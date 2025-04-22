import ContentExtractor from '../../lib/ContentExtractor';
import { MockSiteConfigManager } from '../mocks/siteconfig.mock';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to load test fixtures
const loadFixture = (name: string): string => {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');
};

describe('ContentExtractor', () => {
  let extractor: ContentExtractor;
  let mockSiteConfigManager: MockSiteConfigManager;

  beforeEach(() => {
    mockSiteConfigManager = new MockSiteConfigManager();
    extractor = new ContentExtractor({}, mockSiteConfigManager);
  });

  test('extracts content using site config rules', async () => {
    const html = loadFixture('article.html');
    const url = 'https://example.com/article';

    const success = await extractor.process(html, url);

    expect(success).toBe(true);

    const result = extractor.getResult();
    expect(result.title).toBe('Test Article Title');
    expect(result.html).toContain('This is the first paragraph of the article.');
    expect(result.html).not.toContain('This is an advertisement');
  });

  test('extracts metadata from OpenGraph tags', async () => {
    const html = loadFixture('article-with-opengraph.html');
    const url = 'https://example.com/article';

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.title).toBe('OpenGraph Title');
    expect(result.image).toBe('https://example.com/og-image.jpg');
    expect(result.date).toMatch(/2023-08-15/);
    expect(result.language).toBe('en_US');
  });

  test('extracts metadata from JSON-LD', async () => {
    const html = loadFixture('article-with-jsonld.html');
    const url = 'https://example.com/article';

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.title).toBe('JSON-LD Headline');
    expect(result.date).toMatch(/2023-08-15/);
    expect(result.authors).toContain('Jane Doe');
  });

  test('detects next page links', async () => {
    const html = `
      <html>
        <body>
          <h1 class="article-title">Multi-page Article</h1>
          <article class="main-content">
            <p>Content of page 1</p>
            <a class="next-page" href="/article/page2">Next Page</a>
          </article>
        </body>
      </html>
    `;
    const url = 'https://news.example.org/article/page1';

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.nextPageUrl).toBe('/article/page2');
  });

  test('detects native advertisements', async () => {
    const html = `
      <html>
        <body>
          <h1 class="article-title">Sponsored Article</h1>
          <div class="sponsored-content"></div>
          <article class="main-content">
            <p>This is sponsored content</p>
          </article>
        </body>
      </html>
    `;
    const url = 'https://news.example.org/sponsored';

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.isNativeAd).toBe(true);
  });

  test('falls back to Readability when site config fails', async () => {
    // Mock Readability parser
    jest.mock('@mozilla/readability', () => ({
      Readability: jest.fn().mockImplementation(() => ({
        parse: () => ({
          title: 'Readability Title',
          content: '<div><p>Readability content</p></div>',
          textContent: 'Readability content',
          length: 20,
          byline: 'Readability Author'
        })
      }))
    }));

    const html = `
      <html>
        <body>
          <article>
            <h1>Unknown Site Article</h1>
            <p>This is content from a site without specific config</p>
          </article>
        </body>
      </html>
    `;
    const url = 'https://unknown-site.com/article';

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.success).toBe(true);
    expect(result.title).toBe('Readability Title');
    expect(result.html).toContain('Readability content');
    expect(result.authors).toContain('Readability Author');
  });

  test('processes string replacements from site config', async () => {
    const html = `
      <html>
        <body>
          <h1 class="bad-title">This should be replaced</h1>
          <div class="ad-container">This ad should be removed</div>
          <div class="content">Article content</div>
        </body>
      </html>
    `;
    const url = 'https://example.com/article';

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.html).not.toContain('bad-title');
    expect(result.html).toContain('title');
    expect(result.html).not.toContain('ad-container');
  });
});