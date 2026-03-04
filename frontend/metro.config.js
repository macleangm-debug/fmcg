// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Fix for "Cannot use import.meta outside a module" error
// This disables package exports resolution which can cause ESM/CJS conflicts
config.resolver.unstable_enablePackageExports = false;

// Stub react-native-worklets for web builds to avoid plugin errors
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.includes('react-native-worklets')) {
    return {
      filePath: require.resolve('./worklets-stub.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Add font file extensions for web
config.resolver.assetExts = [...config.resolver.assetExts, 'ttf', 'otf', 'woff', 'woff2'];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
