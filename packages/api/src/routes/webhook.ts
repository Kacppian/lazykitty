/**
 * Webhook Route
 * 
 * POST /v1/webhook/build-complete - Called by builder when build finishes
 */

import { Hono } from 'hono';
import type { WebhookPayload } from '@lazykitty/shared';
import { getKV } from '../services/kv.js';

const webhook = new Hono();

webhook.post('/build-complete', async (c) => {
  const kv = getKV();
  
  let payload: WebhookPayload;
  try {
    payload = await c.req.json() as WebhookPayload;
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { buildId, status, error, manifest, assets } = payload;

  if (!buildId) {
    return c.json({ error: 'Missing buildId' }, 400);
  }

  // Get existing build
  const build = await kv.getBuild(buildId);
  if (!build) {
    return c.json({ error: 'Build not found' }, 404);
  }

  // Update build
  build.status = status;
  build.updatedAt = new Date().toISOString();
  
  if (status === 'success') {
    build.completedAt = new Date().toISOString();
    build.manifest = manifest;
    build.assets = assets;
  } else if (status === 'failed') {
    build.completedAt = new Date().toISOString();
    build.error = error ?? 'Unknown error';
  }

  await kv.setBuild(build);

  // Release build lock
  await kv.releaseBuildLock();

  console.log(`[Webhook] Build ${buildId} ${status}`);

  return c.json({ success: true });
});

export { webhook };
