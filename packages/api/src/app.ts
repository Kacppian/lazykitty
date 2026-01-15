/**
 * Hono App
 * 
 * Main application - shared between local Express server and Cloudflare Workers
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { API_VERSION } from '@lazykitty/shared';
import { authMiddleware } from './middleware/auth.js';
import { upload } from './routes/upload.js';
import { builds } from './routes/builds.js';
import { manifest } from './routes/manifest.js';
import { assets } from './routes/assets.js';
import { webhook } from './routes/webhook.js';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Health check (no auth)
app.get('/', (c) => {
  return c.json({
    name: 'LazyKitty API',
    version: '0.0.1',
    apiVersion: API_VERSION,
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Public routes (no auth required)
// Manifest endpoint - accessed by Expo Go app
app.route(`/${API_VERSION}/manifest`, manifest);

// Assets endpoint - accessed by Expo Go app
app.route(`/${API_VERSION}/assets`, assets);

// Webhook endpoint - called by builder (internal)
app.route(`/${API_VERSION}/webhook`, webhook);

// Protected routes (require API key)
app.use(`/${API_VERSION}/upload/*`, authMiddleware);
app.use(`/${API_VERSION}/builds/*`, authMiddleware);
app.use(`/${API_VERSION}/builds`, authMiddleware);

app.route(`/${API_VERSION}/upload`, upload);
app.route(`/${API_VERSION}/builds`, builds);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export { app };
