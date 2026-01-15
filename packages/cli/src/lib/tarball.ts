/**
 * Tarball Creation
 * 
 * Creates a tarball of the project for uploading
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';
import ignore from 'ignore';
const createIgnore = ignore.default ?? ignore;
import { TARBALL_IGNORE_PATTERNS } from '@lazykitty/shared';

export interface TarballResult {
  buffer: Buffer;
  fileCount: number;
  totalSize: number;
}

/**
 * Create a tarball of the project directory
 */
export async function createTarball(projectDir: string): Promise<TarballResult> {
  // Load ignore patterns
  const ig = createIgnore().add(TARBALL_IGNORE_PATTERNS);
  
  // Try to load .gitignore as well
  try {
    const gitignore = await readFile(join(projectDir, '.gitignore'), 'utf-8');
    ig.add(gitignore);
  } catch {
    // No .gitignore, that's fine
  }

  // Try to load .lazykittyignore
  try {
    const lazykittyignore = await readFile(join(projectDir, '.lazykittyignore'), 'utf-8');
    ig.add(lazykittyignore);
  } catch {
    // No .lazykittyignore, that's fine
  }

  // Collect files to include
  const files: string[] = [];
  let totalSize = 0;

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(projectDir, fullPath);
      
      // Check if ignored
      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        const stats = await stat(fullPath);
        files.push(relativePath);
        totalSize += stats.size;
      }
    }
  }

  await walkDir(projectDir);

  // Create tarball
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    tar.create(
      {
        gzip: true,
        cwd: projectDir,
        portable: true,
      },
      files
    )
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('end', () => resolve())
      .on('error', reject);
  });

  const buffer = Buffer.concat(chunks);

  return {
    buffer,
    fileCount: files.length,
    totalSize,
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
