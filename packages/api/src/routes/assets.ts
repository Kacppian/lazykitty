/**
 * Assets Route
 * 
 * GET /v1/assets/:buildId/* - Serve build assets (bundles, images, etc.)
 */

import { Hono } from 'hono';
import { lookup } from 'mime-types';
import { getKV } from '../services/kv.js';
import { getStorage } from '../services/storage.js';

const assets = new Hono();

// Serve bundle files - handles both .js and .hbc extensions
assets.get('/:buildId/bundles/:filename', async (c) => {
  const buildId = c.req.param('buildId');
  const filename = c.req.param('filename');
  
  if (!filename) {
    return c.json({ error: 'Filename required' }, 400);
  }

  // Extract platform from filename (ios.js, ios.hbc, android.js, android.hbc)
  const platform = filename.replace(/\.(js|hbc)$/, '');
  
  const kv = getKV();
  const storage = getStorage();

  // Verify build exists
  const build = await kv.getBuild(buildId);
  if (!build) {
    return c.json({ error: 'Build not found' }, 404);
  }

  try {
    // Try .js first (plain JavaScript for Expo Go), then .hbc (Hermes bytecode)
    let bundle: Buffer;
    let contentType = 'application/javascript';
    
    try {
      bundle = await storage.getBundle(buildId, `${platform}.js`);
    } catch {
      bundle = await storage.getBundle(buildId, `${platform}.hbc`);
    }
    
    return new Response(bundle, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(`Failed to get bundle ${buildId}/${platform}:`, error);
    return c.json({ error: 'Bundle not found' }, 404);
  }
});

// Serve other assets from the builds directory
assets.get('/:buildId/*', async (c) => {
  const buildId = c.req.param('buildId');
  const assetPath = c.req.path.replace(`/v1/assets/${buildId}/`, '');
  
  const kv = getKV();
  const storage = getStorage();

  // Verify build exists
  const build = await kv.getBuild(buildId);
  if (!build) {
    return c.json({ error: 'Build not found' }, 404);
  }

  try {
    const asset = await storage.getAsset(buildId, assetPath);
    
    // Determine content type from path
    let contentType = lookup(assetPath) || 'application/octet-stream';
    
    // .hbc files should be served as javascript
    if (assetPath.endsWith('.hbc')) {
      contentType = 'application/javascript';
    }
    
    return new Response(asset, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(`Failed to get asset ${buildId}/${assetPath}:`, error);
    return c.json({ error: 'Asset not found' }, 404);
  }
});

export { assets };
