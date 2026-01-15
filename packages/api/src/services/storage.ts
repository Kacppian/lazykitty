/**
 * Storage Service
 * 
 * Abstract interface for storing files (tarballs, bundles, assets)
 * Local implementation uses filesystem, prod uses Cloudflare R2
 */

import { mkdir, writeFile, readFile, unlink, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { STORAGE_PATHS } from '@lazykitty/shared';

export interface StorageService {
  uploadTarball(buildId: string, data: Buffer): Promise<string>;
  getTarball(buildId: string): Promise<Buffer>;
  deleteTarball(buildId: string): Promise<void>;
  
  uploadBundle(buildId: string, platform: string, data: Buffer): Promise<string>;
  getBundle(buildId: string, platform: string): Promise<Buffer>;
  
  uploadAsset(buildId: string, assetKey: string, data: Buffer): Promise<string>;
  getAsset(buildId: string, assetKey: string): Promise<Buffer>;
  
  getPresignedUrl(path: string): Promise<string>;
  
  fileExists(path: string): Promise<boolean>;
}

/**
 * Local filesystem storage for development
 */
export class LocalStorageService implements StorageService {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string, baseUrl: string) {
    this.basePath = basePath;
    this.baseUrl = baseUrl;
  }

  private getFullPath(relativePath: string): string {
    return join(this.basePath, relativePath);
  }

  private async ensureDir(filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
  }

  async uploadTarball(buildId: string, data: Buffer): Promise<string> {
    const relativePath = STORAGE_PATHS.TARBALL(buildId);
    const fullPath = this.getFullPath(relativePath);
    await this.ensureDir(fullPath);
    await writeFile(fullPath, data);
    return `${this.baseUrl}/storage/${relativePath}`;
  }

  async getTarball(buildId: string): Promise<Buffer> {
    const relativePath = STORAGE_PATHS.TARBALL(buildId);
    const fullPath = this.getFullPath(relativePath);
    return readFile(fullPath);
  }

  async deleteTarball(buildId: string): Promise<void> {
    const relativePath = STORAGE_PATHS.TARBALL(buildId);
    const fullPath = this.getFullPath(relativePath);
    try {
      await unlink(fullPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async uploadBundle(buildId: string, platform: string, data: Buffer): Promise<string> {
    const relativePath = STORAGE_PATHS.BUNDLE(buildId, platform);
    const fullPath = this.getFullPath(relativePath);
    await this.ensureDir(fullPath);
    await writeFile(fullPath, data);
    return `${this.baseUrl}/storage/${relativePath}`;
  }

  async getBundle(buildId: string, platformWithExt: string): Promise<Buffer> {
    // platformWithExt can be "ios", "ios.js", "ios.hbc", "android", etc.
    // Try the exact path first, then with extensions
    const bundlesDir = join(this.basePath, 'bundles', buildId);
    
    // If it already has an extension, try it directly
    if (platformWithExt.includes('.')) {
      const fullPath = join(bundlesDir, platformWithExt);
      return readFile(fullPath);
    }
    
    // Try .js first (plain JavaScript for Expo Go), then .hbc (Hermes bytecode)
    try {
      return await readFile(join(bundlesDir, `${platformWithExt}.js`));
    } catch {
      return await readFile(join(bundlesDir, `${platformWithExt}.hbc`));
    }
  }

  async uploadAsset(buildId: string, assetKey: string, data: Buffer): Promise<string> {
    const relativePath = STORAGE_PATHS.ASSET(buildId, assetKey);
    const fullPath = this.getFullPath(relativePath);
    await this.ensureDir(fullPath);
    await writeFile(fullPath, data);
    return `${this.baseUrl}/storage/${relativePath}`;
  }

  async getAsset(buildId: string, assetKey: string): Promise<Buffer> {
    // Assets are stored in builds/{buildId}/ directory (full export output)
    const buildsPath = join(this.basePath, 'builds', buildId, assetKey);
    
    try {
      return await readFile(buildsPath);
    } catch {
      // Fallback to old assets path
      const relativePath = STORAGE_PATHS.ASSET(buildId, assetKey);
      const fullPath = this.getFullPath(relativePath);
      return readFile(fullPath);
    }
  }

  async getPresignedUrl(path: string): Promise<string> {
    // For local dev, just return the direct URL
    return `${this.baseUrl}/storage/${path}`;
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await access(this.getFullPath(path));
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance - initialized in server.ts
let storageInstance: StorageService | null = null;

export function initStorage(basePath: string, baseUrl: string): StorageService {
  storageInstance = new LocalStorageService(basePath, baseUrl);
  return storageInstance;
}

export function getStorage(): StorageService {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initStorage() first.');
  }
  return storageInstance;
}
