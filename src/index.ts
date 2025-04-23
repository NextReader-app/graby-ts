// Universal entry point that re-exports from the platform-specific entry points
// This is primarily for backwards compatibility

// When imported from the main entry point, Node.js version is used by default
export * from './index.node.js';