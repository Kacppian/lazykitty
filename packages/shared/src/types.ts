/**
 * LazyKitty Shared Types
 * 
 * Types used across CLI, API, and Builder packages
 */

// ============================================================================
// Build Types
// ============================================================================

export type BuildStatus =
  | 'pending'      // Build created, waiting to start
  | 'downloading'  // Downloading source tarball
  | 'installing'   // Running npm install
  | 'building'     // Running expo export
  | 'uploading'    // Uploading bundles to storage
  | 'success'      // Build completed successfully
  | 'failed';      // Build failed

export type Platform = 'ios' | 'android' | 'all';

export interface Build {
  id: string;
  projectSlug: string;
  status: BuildStatus;
  platform: Platform;
  runtimeVersion: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  // Expo config from the source project
  expoConfig: ExpoClientConfig;
  // Generated manifest after successful build
  manifest?: ExpoManifest;
  // Asset metadata for serving
  assets?: AssetMetadata[];
}

export interface AssetMetadata {
  key: string;
  hash: string;
  contentType: string;
  fileExtension?: string;
  path: string;  // Path in storage
}

// ============================================================================
// Expo Updates Protocol v1 Types
// ============================================================================

/**
 * Expo Updates v1 Manifest
 * @see https://docs.expo.dev/technical-specs/expo-updates-1/
 */
export interface ExpoManifest {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: ExpoAsset;
  assets: ExpoAsset[];
  metadata: Record<string, string>;
  extra: {
    scopeKey: string;  // Required by Expo Go - format: @owner/slug
    expoClient?: ExpoClientConfig;
    [key: string]: unknown;
  };
}

export interface ExpoAsset {
  key: string;
  hash: string;  // Base64URL-encoded SHA-256
  contentType: string;
  fileExtension?: string;
  url: string;
}

export interface ExpoClientConfig {
  name: string;
  slug: string;
  version?: string;
  sdkVersion?: string;
  platforms?: string[];
  [key: string]: unknown;
}

// ============================================================================
// API Types
// ============================================================================

export interface UploadRequest {
  projectSlug: string;
  platform: Platform;
  runtimeVersion: string;
  expoConfig: ExpoClientConfig;
}

export interface UploadResponse {
  buildId: string;
  status: BuildStatus;
}

export interface BuildStatusResponse {
  build: Build;
  manifestUrl?: string;
  expoGoUrl?: string;
}

export interface BuildListResponse {
  builds: Build[];
}

export interface WebhookPayload {
  buildId: string;
  status: 'success' | 'failed';
  error?: string;
  manifest?: ExpoManifest;
  assets?: AssetMetadata[];
}

// ============================================================================
// Config Types
// ============================================================================

/**
 * Project config file: lazykitty.json
 */
export interface ProjectConfig {
  projectSlug: string;
  runtimeVersion?: string;
}

/**
 * User config file: ~/.lazykitty/config.json
 */
export interface UserConfig {
  apiKey: string;
  apiUrl: string;
}

// ============================================================================
// Builder Types
// ============================================================================

export interface BuilderConfig {
  buildId: string;
  tarballUrl: string;
  webhookUrl: string;
  storageBaseUrl: string;
  platform: Platform;
}

export interface ExpoExportOutput {
  bundles: {
    ios?: string;
    android?: string;
  };
  assets: Array<{
    path: string;
    ext: string;
    hash: string;
  }>;
}
