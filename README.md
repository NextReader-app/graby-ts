# Graby-TS

A JavaScript implementation of [Graby](https://github.com/j0k3r/graby), the content extraction library.

## Overview

Graby-TS extracts content from web pages using site-specific configurations
from [FiveFilters ftr-site-config](https://github.com/fivefilters/ftr-site-config) and the Mozilla Readability algorithm.
This library is designed to be platform-agnostic, working in Node.js and NativeScript environments,
with theoretical support for browsers and React Native (though these haven't been tested yet).

## Installation

```bash
npm install graby-ts
```

## Usage

### Node.js
```javascript
import { NodeGraby } from 'graby-ts/node';

// Create a Graby instance for Node.js
const graby = new NodeGraby();

// Extract content from a URL
const result = await graby.extract('https://example.com/article');

console.log(result.title);       // Article title
console.log(result.html);        // Article HTML content
console.log(result.authors);     // Article authors
console.log(result.date);        // Publication date
console.log(result.image);       // Featured image URL
```

### NativeScript
```javascript
import { NativeScriptGraby } from 'graby-ts/nativescript';

// Create a Graby instance for NativeScript
const graby = new NativeScriptGraby();

// Extract content from a URL
const result = await graby.extract('https://example.com/article');

console.log(result.title);       // Article title
console.log(result.html);        // Article HTML content
// ... and other properties
```

## API Reference

### Extraction Result Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | The extracted title of the article |
| `html` | `string` | The extracted HTML content of the article |
| `authors` | `string[]` | Array of author names extracted from the article |
| `date` | `string \| null` | Publication date in ISO format (if available) |
| `language` | `string \| null` | Detected language of the content (if available) |
| `image` | `string \| null` | URL of the featured image (if available) |
| `nextPageUrl` | `string \| null` | URL to the next page (for multi-page articles) |
| `isNativeAd` | `boolean` | Indicates if the content is a native advertisement |
| `success` | `boolean` | Whether the extraction was successful |
| `originalUrl` | `string` | The original URL that was processed |
| `finalUrl` | `string` | The final URL after following any redirects |
| `status` | `number` | HTTP status code of the response |

### Configuration Options

When creating a Graby instance, you can provide configuration options:

```javascript
const graby = new NodeGraby({
  httpClient: {
    userAgent: 'Custom User Agent',
    // other options...
  },
  // other settings...
});
```

#### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `httpClient` | `object` | See below | HTTP client configuration |
| `httpClient.userAgent` | `string` | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 | User agent string for requests |
| `httpClient.referer` | `string` | https://www.google.com/ | Referer header for requests |
| `httpClient.maxRedirects` | `number` | 10 | Maximum number of redirects to follow |
| `extractor` | `object` | See below | Extractor configuration |
| `extractor.enableXss` | `boolean` | true | Enable XSS protection for extracted content |
| `silent` | `boolean` | false | Suppress console messages |
| `multipage` | `boolean` | true | Enable multi-page article support |
| `multipageLimit` | `number` | 10 | Maximum number of pages to process for multi-page articles |

## Extracting from HTML

If you already have the HTML content, you can extract from it directly:

```javascript
const graby = new NodeGraby();
const result = await graby.extractFromHtml(htmlContent, url);
```

Note: The URL is still required to resolve relative links in the HTML.

## Features Comparison with PHP Graby

### ✅ Implemented
- Basic content extraction using site configs
- Readability algorithm as fallback
- HTML cleanup and post-processing
- HTTP client with proper handling of redirects
- Support for metadata extraction (OpenGraph, JSON-LD)
- Lazy image loading detection and fixing
- XSS protection
- Multipage article support
- Site-specific HTTP headers
- `wrap_in` functionality to enclose content in specific tags
- Unlike PHP Graby, this implementation uses the `xpath-to-selector` library to convert XPath expressions to CSS selectors instead of providing full XPath support. This works in most cases where simple XPath expressions can be converted to CSS.

### 🚧 Coming Soon
- PDF and non-HTML content processing
- Advanced content type exclusion handling
- URL rewriting rules

### Not planned
- Advanced logging system

## Platform Support
- ✅ Node.js
- ✅ NativeScript
- 🔍 Browsers (probably)
- 🔍 React Native (probably)

## Credits
- Based on [Graby](https://github.com/j0k3r/graby) by j0k3r
- Uses [Mozilla Readability](https://github.com/mozilla/readability)
- Uses site configurations from [FiveFilters ftr-site-config](https://github.com/fivefilters/ftr-site-config)
- Uses [Graby-TS Site Config](https://github.com/NextReader-app/graby-ts-site-config)

## License

MIT