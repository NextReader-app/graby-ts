import { describe, test, expect, beforeEach, vi } from 'vitest';
import ContentExtractor from '../../lib/ContentExtractor.js';
import { createMockSiteConfigManager } from '../mocks/siteconfig.mock.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseHTML } from 'linkedom/worker';

// Helper to load test fixtures
const loadFixture = (name: string): string => {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');
};

describe('ContentExtractor', () => {
  let extractor: ContentExtractor;
  let mockSiteConfigManager: ReturnType<typeof createMockSiteConfigManager>;

  beforeEach(() => {
    // Create a fresh mock with clean state for each test
    mockSiteConfigManager = createMockSiteConfigManager();
    extractor = new ContentExtractor({}, mockSiteConfigManager);
  });

  test('extracts content using site config rules', async () => {
    // Use the basic article fixture
    const html = loadFixture('article.html');
    const url = 'https://example.com/article';

    // Set custom config for this test
    mockSiteConfigManager.setMockConfig({
      title: ['//h1[@class="title"]'],
      body: ['//div[@class="content"]'],
      strip: ['//div[@class="ads"]']
    });

    const success = await extractor.process(html, url);

    expect(success).toBe(true);

    const result = extractor.getResult();
    expect(result.title).toBe('Test Article Title');
    expect(result.html).toContain('This is the first paragraph of the article.');
    expect(result.html).not.toContain('This is an advertisement');
  });

  test('XPath has higher priority than OpenGraph', async () => {
    // Use the article with OpenGraph metadata
    const html = loadFixture('article-with-opengraph.html');
    const url = 'https://example.com/article';

    // Set config that will match the h1 element
    mockSiteConfigManager.setMockConfig({
      title: ['//h1[@class="title"]'],
      body: ['//div[@class="content"]']
    });

    await extractor.process(html, url);

    const result = extractor.getResult();

    // XPath has higher priority than OpenGraph in PHP version
    expect(result.title).toBe('Test Article Title');
    expect(result.image).toBe('https://example.com/og-image.jpg');
    expect(result.date).toMatch(/2023-08-15/);
    expect(result.language).toBe('en_US');
  });

  test('OpenGraph is used when siteConfig XPath fails', async () => {
    // Use the article with OpenGraph metadata
    const html = loadFixture('article-with-opengraph.html');
    const url = 'https://example.com/article';

    // Set config with XPath that won't match anything
    mockSiteConfigManager.setMockConfig({
      title: ['//non-existent-element[@impossible="true" and @doesNotExist="at-all"]'],
      body: ['//div[@class="content"]']
    });

    await extractor.process(html, url);

    const result = extractor.getResult();

    // OpenGraph should be used as fallback when XPath fails
    expect(result.title).toBe('OpenGraph Title');
    expect(result.image).toBe('https://example.com/og-image.jpg');
    expect(result.date).toMatch(/2023-08-15/);
    expect(result.language).toBe('en_US');
  });

  test('extracts metadata from JSON-LD', async () => {
    // Use the article with JSON-LD metadata
    const html = loadFixture('article-with-jsonld.html');
    const url = 'https://example.com/article';

    // Set config with XPath that will match h1 element
    mockSiteConfigManager.setMockConfig({
      title: ['//nonexistent'],
      body: ['//div[@class="content"]']
    });

    await extractor.process(html, url);

    const result = extractor.getResult();

    // Validate JSON-LD metadata
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

    // Set config with next page link pattern
    mockSiteConfigManager.setMockConfig({
      title: ['//h1'],
      body: ['//article'],
      next_page_link: ['//a[@class="next-page"]']
    });

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.nextPageUrl).toBe('/article/page2');
  });

  test('detects native advertisements', async () => {
    const html = `
      <html>
        <body>
          <h1 class="article-title">Sponsored Article</h1>
          <div class="sponsored-content">Sponsored</div>
          <article class="main-content">
            <p>This is sponsored content</p>
          </article>
        </body>
      </html>
    `;
    const url = 'https://news.example.org/sponsored';

    // Set config with native ad clues
    mockSiteConfigManager.setMockConfig({
      title: ['//h1'],
      body: ['//article'],
      native_ad_clue: ['//div[@class="sponsored-content"]']
    });

    await extractor.process(html, url);

    const result = extractor.getResult();
    expect(result.isNativeAd).toBe(true);
  });

  test('falls back to Readability when site config fails', async () => {
    // Use the basic article fixture but with incorrect selectors
    const html = loadFixture('article.html');
    const url = 'https://example.com/article';

    // Set config with selectors that won't match anything
    mockSiteConfigManager.setMockConfig({
      title: ['//nonexistent'],
      body: ['//nonexistent']
    });

    await extractor.process(html, url);

    // The mock readability will be used here, so we check for expected values
    const result = extractor.getResult();
    expect(result.success).toBe(true);
    expect(result.title).toBe('Test Article');
    expect(result.html).toContain('readability-page');
    expect(result.authors).toContain('By John Smith');
  });

  test('processes string replacements from site config', async () => {
    // Use the basic article fixture
    const html = loadFixture('article.html');
    const url = 'https://example.com/article';

    // Set config with string replacements
    mockSiteConfigManager.setMockConfig({
      title: ['//h1[@class="title"]'],
      body: ['//div[@class="content"]'],
      find_string: ['Test Article Title', 'advertisement'],
      replace_string: ['Modified Title', 'sponsor content']
    });

    await extractor.process(html, url);

    const result = extractor.getResult();

    // Verify the extractor ran successfully
    expect(result.success).toBe(true);

    // The title should reflect what's in the document, with modifications
    expect(result.title).toBe('Modified Title');

    // Content should contain the original content
    expect(result.html).toContain('This is the first paragraph of the article.');

    // The replacement should have occurred in the processed HTML
    expect(result.html).not.toContain('advertisement');
    expect(result.html).toContain('sponsor content');
  });

  test('validates the accepted wrap_in tags', () => {
    // Create a test instance
    const testExtractor = new ContentExtractor({}, mockSiteConfigManager);

    // Check that the acceptedWrapInTags property contains the expected tags
    const acceptedTags = (testExtractor as any).acceptedWrapInTags;
    expect(acceptedTags).toContain('blockquote');
    expect(acceptedTags).toContain('p');
    expect(acceptedTags).toContain('div');
    expect(acceptedTags.length).toBe(3); // Only these 3 tags should be allowed
  });

  test('has limited set of accepted wrap_in tags for security', () => {
    // Direct test of the acceptedWrapInTags property
    const testExtractor = new ContentExtractor({}, mockSiteConfigManager);

    // Access the private property using type assertion
    const acceptedTags = (testExtractor as any).acceptedWrapInTags;

    // Verify it contains only the expected safe tags
    expect(acceptedTags).toEqual(['blockquote', 'p', 'div']);

    // Verify it doesn't contain unsafe tags
    expect(acceptedTags).not.toContain('script');
    expect(acceptedTags).not.toContain('iframe');
    expect(acceptedTags).not.toContain('object');
  });

  test('logs warning for disallowed wrap_in tags', () => {
    // Create a direct instance for testing
    const testExtractor = new ContentExtractor({}, mockSiteConfigManager);

    // Mock console.warn
    const originalWarn = console.warn;
    const mockWarn = vi.fn();
    console.warn = mockWarn;

    // Use the basic article fixture
    const html = loadFixture('article.html');

    // Create a mock site config with a disallowed tag
    const mockConfig = {
      wrap_in: {
        'script': '//div' // script is not allowed
      }
    };

    // Call the method that processes wrap_in directives
    (testExtractor as any).applySiteConfig(mockConfig, parseHTML(html).document);

    // Verify the warning was logged
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Tag "script" is not allowed for wrap_in')
    );

    // Restore console.warn
    console.warn = originalWarn;
  });

  // New test specific to XPath functionality using the HTML fixtures
  test('correctly evaluates complex XPath expressions', async () => {
    // Use the basic article fixture
    const html = loadFixture('article.html');
    const url = 'https://example.com/article';

    // Set config with complex XPath expressions
    mockSiteConfigManager.setMockConfig({
      title: ['//h1[@class="title"]'],
      body: ['//div[@class="content"]'],
      strip: ['//div[@class="ads"]'],
      wrap_in: {
        'blockquote': '//p[contains(text(), "first paragraph")]'
      }
    });

    await extractor.process(html, url);

    const result = extractor.getResult();

    // The extractor should have run successfully
    expect(result.success).toBe(true);

    // Title should be extracted
    expect(result.title).toBe('Test Article Title');

    // Content should include the paragraphs
    expect(result.html).toContain('This is the first paragraph of the article.');
    expect(result.html).toContain('This is the second paragraph');

    // The first paragraph should be wrapped in a blockquote
    expect(result.html).toMatch(/<blockquote[^>]*>.*?first paragraph.*?<\/blockquote>/s);

    // Advertisement content should be stripped
    expect(result.html).not.toContain('This is an advertisement');
  });
});