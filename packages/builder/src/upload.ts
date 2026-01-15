/**
 * Upload build output to storage
 */

import { readFile, readdir, stat, mkdir, copyFile } from 'node:fs/promises';
import { join, relative, extname, basename, dirname } from 'node:path';
import type { WebhookPayload, AssetMetadata, ExpoManifest } from '@lazykitty/shared';

/**
 * Copy entire directory recursively
 */
async function copyDir(srcDir: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  
  const entries = await readdir(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Copy files from export output to storage directory
 * Handles new Expo SDK 53+ structure with _expo/static/js/
 */
export async function uploadToStorage(
  outputDir: string,
  storagePath: string,
  buildId: string,
  bundles: { ios?: string; android?: string }
): Promise<void> {
  // Copy the entire dist output to storage/builds/{buildId}/
  const buildDest = join(storagePath, 'builds', buildId);
  await copyDir(outputDir, buildDest);
  console.log(`[Upload] Copied entire dist to ${buildDest}`);

  // Create simplified bundle references in storage/bundles/{buildId}/
  const bundlesDest = join(storagePath, 'bundles', buildId);
  await mkdir(bundlesDest, { recursive: true });

  // Copy iOS bundle with simplified name
  if (bundles.ios) {
    const iosSrc = join(outputDir, bundles.ios);
    const ext = extname(bundles.ios);
    const iosDest = join(bundlesDest, `ios${ext}`);
    try {
      await copyFile(iosSrc, iosDest);
      console.log(`[Upload] Created ios${ext} from ${bundles.ios}`);
    } catch (error) {
      console.error(`[Upload] Failed to copy iOS bundle:`, error);
    }
  }

  // Copy Android bundle with simplified name
  if (bundles.android) {
    const androidSrc = join(outputDir, bundles.android);
    const ext = extname(bundles.android);
    const androidDest = join(bundlesDest, `android${ext}`);
    try {
      await copyFile(androidSrc, androidDest);
      console.log(`[Upload] Created android${ext} from ${bundles.android}`);
    } catch (error) {
      console.error(`[Upload] Failed to copy Android bundle:`, error);
    }
  }

  // Copy metadata.json to storage/metadata/{buildId}/
  const metadataSrc = join(outputDir, 'metadata.json');
  const metadataDest = join(storagePath, 'metadata', buildId, 'metadata.json');
  try {
    await mkdir(dirname(metadataDest), { recursive: true });
    await copyFile(metadataSrc, metadataDest);
    console.log(`[Upload] Copied metadata.json`);
  } catch (error) {
    console.log('[Upload] No metadata.json found');
  }
}

/**
 * Legacy function - kept for compatibility but no longer needed
 * Bundles are now copied with correct names in uploadToStorage
 */
export async function renameBundles(
  storagePath: string,
  buildId: string
): Promise<void> {
  // No-op - bundles are already named correctly in uploadToStorage
  console.log('[Upload] renameBundles called (no-op)');
}

/**
 * Call webhook with build result
 */
export async function callWebhook(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<void> {
  console.log(`[Upload] Calling webhook: ${webhookUrl}`);
  console.log(`[Upload] Payload status: ${payload.status}`);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webhook failed: ${response.status} ${text}`);
  }

  console.log('[Upload] Webhook called successfully');
}
