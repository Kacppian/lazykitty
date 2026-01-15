/**
 * Upload Route
 * 
 * POST /v1/upload - Receive tarball and trigger build
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import type { Build, UploadRequest, UploadResponse } from '@lazykitty/shared';
import { ROUTES, MAX_TARBALL_SIZE_BYTES, DEFAULT_RUNTIME_VERSION } from '@lazykitty/shared';
import { getStorage } from '../services/storage.js';
import { getKV } from '../services/kv.js';
import { getBuilder } from '../services/builder.js';

const upload = new Hono();

upload.post('/', async (c) => {
  const kv = getKV();
  const storage = getStorage();
  const builder = getBuilder();

  // Check if a build is already in progress
  const isLocked = await kv.isBuildLocked();
  if (isLocked) {
    return c.json({ error: 'A build is already in progress. Please wait.' }, 429);
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  
  const tarball = formData.get('tarball');
  const metadataJson = formData.get('metadata');

  if (!tarball || !(tarball instanceof File)) {
    return c.json({ error: 'Missing tarball file' }, 400);
  }

  if (!metadataJson || typeof metadataJson !== 'string') {
    return c.json({ error: 'Missing metadata' }, 400);
  }

  // Parse metadata
  let metadata: UploadRequest;
  try {
    metadata = JSON.parse(metadataJson) as UploadRequest;
  } catch {
    return c.json({ error: 'Invalid metadata JSON' }, 400);
  }

  // Validate metadata
  if (!metadata.projectSlug) {
    return c.json({ error: 'Missing projectSlug in metadata' }, 400);
  }

  if (!metadata.expoConfig?.name || !metadata.expoConfig?.slug) {
    return c.json({ error: 'Missing expoConfig.name or expoConfig.slug in metadata' }, 400);
  }

  // Check tarball size
  if (tarball.size > MAX_TARBALL_SIZE_BYTES) {
    return c.json({ 
      error: `Tarball too large. Max size is ${MAX_TARBALL_SIZE_BYTES / 1024 / 1024}MB` 
    }, 400);
  }

  // Acquire build lock
  const lockAcquired = await kv.acquireBuildLock();
  if (!lockAcquired) {
    return c.json({ error: 'Failed to acquire build lock' }, 429);
  }

  try {
    // Generate build ID
    const buildId = `bld_${nanoid(12)}`;

    // Create build record
    const build: Build = {
      id: buildId,
      projectSlug: metadata.projectSlug,
      status: 'pending',
      platform: metadata.platform ?? 'all',
      runtimeVersion: metadata.runtimeVersion ?? DEFAULT_RUNTIME_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expoConfig: metadata.expoConfig,
    };

    // Save build record
    await kv.setBuild(build);

    // Upload tarball to storage
    const tarballBuffer = Buffer.from(await tarball.arrayBuffer());
    const tarballUrl = await storage.uploadTarball(buildId, tarballBuffer);

    // Get base URL from request
    const url = new URL(c.req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const webhookUrl = `${baseUrl}${ROUTES.WEBHOOK}`;

    // Trigger build
    await builder.triggerBuild(build, tarballUrl, webhookUrl);

    const response: UploadResponse = {
      buildId,
      status: build.status,
    };

    return c.json(response, 201);
  } catch (error) {
    // Release lock on error
    await kv.releaseBuildLock();
    
    console.error('Upload error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, 500);
  }
});

export { upload };
