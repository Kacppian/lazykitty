/**
 * Download and extract tarball
 */

import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createReadStream } from 'node:fs';
import * as tar from 'tar';

/**
 * Extract a tarball to a directory
 */
export async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  // Ensure destination directory exists and is empty
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  // Extract tarball
  await tar.extract({
    file: tarballPath,
    cwd: destDir,
  });
}

/**
 * Download a file from URL to local path
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const fileStream = createWriteStream(destPath);
  
  // Convert web stream to node stream
  const reader = response.body.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(value);
    }
  } finally {
    reader.releaseLock();
    fileStream.end();
  }

  // Wait for file to finish writing
  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}
