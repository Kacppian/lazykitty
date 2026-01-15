/**
 * Expo Manifest Generation
 * 
 * Generates Expo Updates Protocol v1 manifests
 */

import { createHash } from 'node:crypto';
import type { Build, ExpoManifest, ExpoAsset } from '@lazykitty/shared';
import { MIME_TYPES } from '@lazykitty/shared';

export interface ManifestOptions {
  baseUrl: string;
  platform: 'ios' | 'android';
}

/**
 * Generate a deterministic UUID v4 from a string
 * This ensures the same build ID always produces the same UUID
 */
export function generateUUID(input: string): string {
  const hash = createHash('sha256').update(input).digest();
  
  // Use first 16 bytes of hash to create UUID v4 format
  const bytes = new Uint8Array(hash.subarray(0, 16));
  
  // Set version (4) and variant (8, 9, a, or b) bits per RFC 4122
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant 10xx
  
  // Format as UUID string
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generate an Expo Updates v1 manifest for a build
 */
export function generateManifest(build: Build, options: ManifestOptions): ExpoManifest {
  const { baseUrl, platform } = options;
  
  // If we already have a stored manifest, update URLs and return
  if (build.manifest) {
    return updateManifestUrls(build.manifest, baseUrl, build.id);
  }

  // Generate a new manifest from build metadata
  const assetsBaseUrl = `${baseUrl}/v1/assets/${build.id}`;
  
  // Launch asset (JS bundle) - note: no fileExtension for launch asset
  const launchAsset: ExpoAsset = {
    key: 'bundle',
    hash: '', // Will be filled by builder
    contentType: MIME_TYPES.JAVASCRIPT,
    url: `${assetsBaseUrl}/bundles/${platform}.js`,
  };

  // Other assets (images, fonts, etc.)
  const assets: ExpoAsset[] = (build.assets ?? [])
    .filter(a => a.key !== 'bundle')
    .map(asset => ({
      key: asset.key,
      hash: asset.hash,
      contentType: asset.contentType,
      fileExtension: asset.fileExtension,
      url: `${assetsBaseUrl}/${asset.path}`,
    }));

  // Generate scopeKey from expoConfig (required by Expo Go)
  // Format: @owner/slug or just the slug if no owner
  const slug = build.expoConfig?.slug ?? 'app';
  const owner = build.expoConfig?.owner;
  const scopeKey = owner ? `@${owner}/${slug}` : `@anonymous/${slug}`;

  return {
    id: generateUUID(build.id), // Use UUID instead of build ID
    createdAt: build.createdAt,
    runtimeVersion: build.runtimeVersion,
    launchAsset,
    assets,
    metadata: {},
    extra: {
      scopeKey, // Required by Expo Go - must be inside extra
      expoClient: build.expoConfig,
    },
  };
}

/**
 * Update URLs in an existing manifest
 */
function updateManifestUrls(manifest: ExpoManifest, baseUrl: string, buildId: string): ExpoManifest {
  const assetsBaseUrl = `${baseUrl}/v1/assets/${buildId}`;
  
  // Ensure the manifest has a proper UUID
  const id = manifest.id.includes('-') ? manifest.id : generateUUID(manifest.id);
  
  // Ensure scopeKey is present (for manifests created before scopeKey was added)
  const scopeKey = manifest.extra?.scopeKey || 
    (manifest.extra?.expoClient?.slug 
      ? `@anonymous/${manifest.extra.expoClient.slug}` 
      : '@anonymous/app');
  
  return {
    ...manifest,
    id,
    extra: {
      ...manifest.extra,
      scopeKey,
    },
    launchAsset: {
      ...manifest.launchAsset,
      url: manifest.launchAsset.url.includes('://')
        ? manifest.launchAsset.url
        : `${assetsBaseUrl}/${manifest.launchAsset.url}`,
    },
    assets: manifest.assets.map(asset => ({
      ...asset,
      url: asset.url.includes('://') ? asset.url : `${assetsBaseUrl}/${asset.url}`,
    })),
  };
}

/**
 * Generate Expo Go deep link URL
 */
export function generateExpoGoUrl(manifestUrl: string): string {
  // exp:// URL format for Expo Go
  // The manifest URL should be accessible from the phone
  const url = new URL(manifestUrl);
  return `exp://${url.host}/--${url.pathname}`;
}
