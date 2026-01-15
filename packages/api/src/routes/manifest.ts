/**
 * Manifest Route
 * 
 * GET /v1/manifest/:id - Expo Updates Protocol v1 manifest
 * Returns multipart/mixed response per Expo Updates spec
 */

import { Hono } from 'hono';
import { 
  EXPO_PROTOCOL_VERSION, 
  EXPO_SFV_VERSION, 
  EXPO_HEADERS,
} from '@lazykitty/shared';
import { getKV } from '../services/kv.js';
import { generateManifest, generateUUID } from '../lib/manifest.js';

const manifest = new Hono();

/**
 * Generate a multipart/mixed response body
 */
function createMultipartResponse(
  manifestJson: object,
  boundary: string
): string {
  const parts: string[] = [];
  
  // Manifest part
  parts.push(`--${boundary}`);
  parts.push('Content-Disposition: form-data; name="manifest"');
  parts.push('Content-Type: application/json');
  parts.push('');
  parts.push(JSON.stringify(manifestJson));
  
  // Extensions part (empty for now, but required)
  parts.push(`--${boundary}`);
  parts.push('Content-Disposition: form-data; name="extensions"');
  parts.push('Content-Type: application/json');
  parts.push('');
  parts.push(JSON.stringify({ assetRequestHeaders: {} }));
  
  // End boundary (must have trailing CRLF)
  parts.push(`--${boundary}--`);
  parts.push(''); // This adds trailing \r\n after the close boundary
  
  return parts.join('\r\n');
}

manifest.get('/:id', async (c) => {
  const kv = getKV();
  const buildId = c.req.param('id');
  
  // Get Expo headers
  const platform = c.req.header(EXPO_HEADERS.PLATFORM);
  const runtimeVersion = c.req.header(EXPO_HEADERS.RUNTIME_VERSION);
  const protocolVersion = c.req.header(EXPO_HEADERS.PROTOCOL_VERSION);
  const accept = c.req.header('accept') ?? '';

  // Validate Expo protocol version
  if (protocolVersion && protocolVersion !== EXPO_PROTOCOL_VERSION) {
    return c.json({ error: `Unsupported protocol version: ${protocolVersion}` }, 400);
  }

  // Get build
  const build = await kv.getBuild(buildId);
  
  if (!build) {
    return c.json({ error: 'Build not found' }, 404);
  }

  // Check if build is ready
  if (build.status !== 'success') {
    return c.json({ 
      error: 'Build not ready',
      status: build.status,
    }, 404);
  }

  // Validate platform
  const targetPlatform = platform === 'ios' || platform === 'android' 
    ? platform 
    : 'ios'; // Default to iOS

  // Validate runtime version (optional - warn but don't reject)
  if (runtimeVersion && runtimeVersion !== build.runtimeVersion) {
    console.warn(`Runtime version mismatch: requested ${runtimeVersion}, build has ${build.runtimeVersion}`);
  }

  // Get base URL from request - use x-forwarded headers if behind proxy (ngrok)
  const forwardedProto = c.req.header('x-forwarded-proto');
  const forwardedHost = c.req.header('x-forwarded-host') ?? c.req.header('host');
  const url = new URL(c.req.url);
  const protocol = forwardedProto ? `${forwardedProto}:` : url.protocol;
  const host = forwardedHost ?? url.host;
  const baseUrl = `${protocol}//${host}`;

  // Generate manifest with proper UUID
  const expoManifest = generateManifest(build, {
    baseUrl,
    platform: targetPlatform,
  });

  // Generate a stable UUID for this manifest based on build ID
  const manifestId = generateUUID(build.id);

  // Update manifest with UUID
  const manifestWithUUID = {
    ...expoManifest,
    id: manifestId,
  };

  // Set common Expo protocol headers
  c.header(EXPO_HEADERS.PROTOCOL_VERSION, EXPO_PROTOCOL_VERSION);
  c.header(EXPO_HEADERS.SFV_VERSION, EXPO_SFV_VERSION);
  c.header(EXPO_HEADERS.MANIFEST_FILTERS, '');
  c.header(EXPO_HEADERS.SERVER_DEFINED_HEADERS, '');
  c.header('expo-update-id', manifestId);
  c.header('Cache-Control', 'private, max-age=0');

  // Check if client accepts multipart/mixed (preferred for SDK 54+)
  if (accept.includes('multipart/mixed')) {
    const boundary = `----ExpoManifestBoundary-${generateUUID(build.id + Date.now()).slice(0, 22)}`;
    const body = createMultipartResponse(manifestWithUUID, boundary);
    
    c.header('Content-Type', `multipart/mixed; boundary=${boundary}`);
    return c.body(body);
  }

  // Fallback to JSON response for older clients
  c.header('Content-Type', 'application/expo+json');
  return c.json(manifestWithUUID);
});

export { manifest };
