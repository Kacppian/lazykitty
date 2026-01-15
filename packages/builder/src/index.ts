/**
 * LazyKitty Builder
 * 
 * Main entry point for build process
 */

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { WebhookPayload, ExpoClientConfig } from '@lazykitty/shared';
import { extractTarball } from './download.js';
import { installDependencies, runExpoExport, collectAssets, generateManifest } from './build.js';
import { uploadToStorage, renameBundles, callWebhook } from './upload.js';

// Environment variables
const BUILD_ID = process.env['BUILD_ID'];
const TARBALL_PATH = process.env['TARBALL_PATH'];
const WEBHOOK_URL = process.env['WEBHOOK_URL'];
const STORAGE_PATH = process.env['STORAGE_PATH'];
const PLATFORM = process.env['PLATFORM'] ?? 'all';
const RUNTIME_VERSION = process.env['RUNTIME_VERSION'] ?? 'exposdk:52.0.0';

async function updateStatus(status: string): Promise<void> {
  if (!WEBHOOK_URL || !BUILD_ID) return;
  
  try {
    // Simple status update - not full webhook
    console.log(`[Builder] Status: ${status}`);
  } catch {
    // Ignore errors in status updates
  }
}

/**
 * Main build function
 */
export async function runBuild(): Promise<void> {
  if (!BUILD_ID) {
    throw new Error('BUILD_ID environment variable is required');
  }
  if (!TARBALL_PATH) {
    throw new Error('TARBALL_PATH environment variable is required');
  }
  if (!WEBHOOK_URL) {
    throw new Error('WEBHOOK_URL environment variable is required');
  }
  if (!STORAGE_PATH) {
    throw new Error('STORAGE_PATH environment variable is required');
  }

  const workDir = '/tmp/lazykitty-build';
  const projectDir = join(workDir, 'project');
  
  console.log(`[Builder] Starting build ${BUILD_ID}`);
  console.log(`[Builder] Tarball: ${TARBALL_PATH}`);
  console.log(`[Builder] Platform: ${PLATFORM}`);
  console.log(`[Builder] Runtime: ${RUNTIME_VERSION}`);

  try {
    // 1. Extract tarball
    await updateStatus('downloading');
    console.log('[Builder] Extracting tarball...');
    await extractTarball(TARBALL_PATH, projectDir);
    console.log('[Builder] Tarball extracted');

    // 2. Load expo config
    let expoConfig: ExpoClientConfig;
    try {
      const appJsonPath = join(projectDir, 'app.json');
      const appJsonContent = await readFile(appJsonPath, 'utf-8');
      const appJson = JSON.parse(appJsonContent) as { expo?: ExpoClientConfig };
      expoConfig = appJson.expo ?? appJson as ExpoClientConfig;
    } catch (error) {
      throw new Error('Failed to read app.json');
    }

    // 3. Install dependencies
    await installDependencies(projectDir, updateStatus);
    console.log('[Builder] Dependencies installed');

    // 4. Run expo export
    const outputDir = await runExpoExport(projectDir, PLATFORM, updateStatus);
    console.log('[Builder] Expo export complete');

    // 5. Collect assets
    await updateStatus('uploading');
    const { assets, bundles } = await collectAssets(outputDir, BUILD_ID);
    console.log(`[Builder] Collected ${assets.length} assets`);

    // 6. Upload to storage
    await uploadToStorage(outputDir, STORAGE_PATH, BUILD_ID, bundles);
    console.log('[Builder] Assets uploaded');

    // 7. Generate manifest
    const manifest = generateManifest(
      BUILD_ID,
      RUNTIME_VERSION,
      expoConfig,
      assets,
      bundles,
      PLATFORM === 'all' ? 'ios' : PLATFORM
    );

    // 8. Call webhook with success
    const payload: WebhookPayload = {
      buildId: BUILD_ID,
      status: 'success',
      manifest,
      assets,
    };
    
    await callWebhook(WEBHOOK_URL, payload);
    console.log('[Builder] Build complete!');

  } catch (error) {
    console.error('[Builder] Build failed:', error);
    
    // Call webhook with failure
    const payload: WebhookPayload = {
      buildId: BUILD_ID,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    await callWebhook(WEBHOOK_URL, payload);
    throw error;
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
  runBuild().catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}
