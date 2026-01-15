/**
 * LazyKitty Shared Constants
 */

// API
export const API_VERSION = 'v1';
export const DEFAULT_API_URL = 'https://api.lazykitty.dev';
export const LOCAL_API_URL = 'http://localhost:3000';

// Expo Updates Protocol
export const EXPO_PROTOCOL_VERSION = '1';
export const EXPO_SFV_VERSION = '0';

// Build settings
export const BUILD_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_TARBALL_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

// Files/directories to exclude from tarball
export const TARBALL_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.expo',
  '.expo-shared',
  'ios',
  'android',
  'dist',
  'build',
  '.turbo',
  '*.log',
  '*.tgz',
  '*.tar.gz',
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.*.local',
];

// Default runtime version (Expo SDK 52)
export const DEFAULT_RUNTIME_VERSION = 'exposdk:52.0.0';

// Config file names
export const PROJECT_CONFIG_FILE = 'lazykitty.json';
export const USER_CONFIG_DIR = '.lazykitty';
export const USER_CONFIG_FILE = 'config.json';

// API routes
export const ROUTES = {
  UPLOAD: `/${API_VERSION}/upload`,
  BUILDS: `/${API_VERSION}/builds`,
  BUILD: (id: string) => `/${API_VERSION}/builds/${id}`,
  MANIFEST: (id: string) => `/${API_VERSION}/manifest/${id}`,
  ASSETS: (buildId: string, assetPath: string) => `/${API_VERSION}/assets/${buildId}/${assetPath}`,
  WEBHOOK: `/${API_VERSION}/webhook/build-complete`,
} as const;

// Storage paths
export const STORAGE_PATHS = {
  TARBALL: (buildId: string) => `tarballs/${buildId}.tar.gz`,
  BUNDLE: (buildId: string, platform: string) => `bundles/${buildId}/${platform}.js`,
  ASSET: (buildId: string, assetKey: string) => `assets/${buildId}/${assetKey}`,
  METADATA: (buildId: string) => `metadata/${buildId}.json`,
} as const;

// MIME types
export const MIME_TYPES = {
  JAVASCRIPT: 'application/javascript',
  JSON: 'application/json',
  EXPO_JSON: 'application/expo+json',
  OCTET_STREAM: 'application/octet-stream',
  GZIP: 'application/gzip',
} as const;

// HTTP headers for Expo Updates Protocol
export const EXPO_HEADERS = {
  PROTOCOL_VERSION: 'expo-protocol-version',
  SFV_VERSION: 'expo-sfv-version',
  PLATFORM: 'expo-platform',
  RUNTIME_VERSION: 'expo-runtime-version',
  MANIFEST_FILTERS: 'expo-manifest-filters',
  SERVER_DEFINED_HEADERS: 'expo-server-defined-headers',
  EXPECT_SIGNATURE: 'expo-expect-signature',
  SIGNATURE: 'expo-signature',
} as const;
