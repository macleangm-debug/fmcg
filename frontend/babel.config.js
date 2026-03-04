module.exports = function (api) {
  api.cache(true);
  
  const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web' || 
                process.env.EXPO_EXPORT_PLATFORM === 'web' ||
                process.argv.includes('--platform') && process.argv.includes('web');
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin must be listed last
      // Only include for native builds, skip for web export
      ...(!isWeb ? ['react-native-reanimated/plugin'] : []),
    ],
  };
};
