/**
 * Local Development Server
 * 
 * Express-compatible server using Hono with @hono/node-server
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';
import { initStorage } from './services/storage.js';
import { initKV } from './services/kv.js';
import { initBuilder } from './services/builder.js';

// Get monorepo root (from packages/api/dist/ go up 3 levels)
const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..');

// Configuration from environment
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'] ?? 'localhost';
const STORAGE_PATH = process.env['STORAGE_PATH'] ?? join(MONOREPO_ROOT, 'storage');
const KV_PATH = process.env['KV_PATH'] ?? join(MONOREPO_ROOT, 'storage', 'kv.json');
const BUILDER_TYPE = (process.env['BUILDER_TYPE'] ?? 'process') as 'docker' | 'process';
const API_KEY = process.env['API_KEY'] ?? 'lk_test_dev_key_12345';

// Initialize services
const baseUrl = `http://${HOST}:${PORT}`;
initStorage(STORAGE_PATH, baseUrl);
initKV(KV_PATH);
initBuilder(BUILDER_TYPE, STORAGE_PATH);

// Serve static files from storage directory (for local development)
app.use('/storage/*', serveStatic({ root: './' }));

// Start server
const apiKeyDisplay = API_KEY === 'lk_test_dev_key_12345' 
  ? 'lk_test_dev_key_12345 (default)' 
  : `${API_KEY.slice(0, 8)}... (from env)`;

console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   🐱 LazyKitty API Server                       │
│                                                 │
│   Local:   http://${HOST}:${PORT.toString().padEnd(24)}│
│   Storage: ${STORAGE_PATH.slice(0, 36).padEnd(36)}│
│   Builder: ${BUILDER_TYPE.padEnd(36)}│
│   API Key: ${apiKeyDisplay.padEnd(36)}│
│                                                 │
└─────────────────────────────────────────────────┘
`);

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
});
