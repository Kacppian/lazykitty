/**
 * Builds Routes
 * 
 * GET /v1/builds - List builds
 * GET /v1/builds/:id - Get build status
 */

import { Hono } from 'hono';
import type { BuildStatusResponse, BuildListResponse } from '@lazykitty/shared';
import { ROUTES } from '@lazykitty/shared';
import { getKV } from '../services/kv.js';
import { generateExpoGoUrl } from '../lib/manifest.js';

const builds = new Hono();

// List builds
builds.get('/', async (c) => {
  const kv = getKV();
  const projectSlug = c.req.query('projectSlug');
  
  const buildList = await kv.listBuilds(projectSlug);
  
  const response: BuildListResponse = {
    builds: buildList,
  };

  return c.json(response);
});

// Get build by ID
builds.get('/:id', async (c) => {
  const kv = getKV();
  const buildId = c.req.param('id');
  
  const build = await kv.getBuild(buildId);
  
  if (!build) {
    return c.json({ error: 'Build not found' }, 404);
  }

  // Get base URL from request
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  const response: BuildStatusResponse = {
    build,
  };

  // Add URLs if build is successful
  if (build.status === 'success') {
    const manifestUrl = `${baseUrl}${ROUTES.MANIFEST(build.id)}`;
    response.manifestUrl = manifestUrl;
    response.expoGoUrl = generateExpoGoUrl(manifestUrl);
  }

  return c.json(response);
});

export { builds };
