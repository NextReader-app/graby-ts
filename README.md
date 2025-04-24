# Graby-TS

A JavaScript implementation of [Graby](https://github.com/j0k3r/graby), the content extraction library.

## Overview

Graby-TS extracts content from web pages using site-specific configurations
from [FiveFilters ftr-site-config](https://github.com/fivefilters/ftr-site-config) and the Mozilla Readability algorithm.
This library is designed to be platform-agnostic, working in Node.js, and NativeScript environments (.

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