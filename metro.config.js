const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Required for better-auth package exports resolution
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
