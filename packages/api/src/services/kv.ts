/**
 * KV Service
 * 
 * Abstract interface for key-value storage (builds, API keys)
 * Local implementation uses JSON file, prod uses Cloudflare KV
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Build } from '@lazykitty/shared';

export interface KVService {
  // Builds
  getBuild(buildId: string): Promise<Build | null>;
  setBuild(build: Build): Promise<void>;
  listBuilds(projectSlug?: string): Promise<Build[]>;
  
  // API Keys
  validateApiKey(apiKey: string): Promise<boolean>;
  
  // Build lock (single build at a time)
  acquireBuildLock(): Promise<boolean>;
  releaseBuildLock(): Promise<void>;
  isBuildLocked(): Promise<boolean>;
}

interface LocalKVData {
  builds: Record<string, Build>;
  apiKeys: string[];
  buildLock: boolean;
}

/**
 * Local JSON file storage for development
 */
export class LocalKVService implements KVService {
  private filePath: string;
  private data: LocalKVData | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async load(): Promise<LocalKVData> {
    // Always read from disk (no caching in local dev for simplicity)
    try {
      const content = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content) as LocalKVData;
    } catch {
      // File doesn't exist, create default
      this.data = {
        builds: {},
        apiKeys: ['lk_test_dev_key_12345'], // Default test key
        buildLock: false,
      };
      await this.save();
    }

    return this.data;
  }

  private async save(): Promise<void> {
    if (!this.data) return;
    
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async getBuild(buildId: string): Promise<Build | null> {
    const data = await this.load();
    return data.builds[buildId] ?? null;
  }

  async setBuild(build: Build): Promise<void> {
    const data = await this.load();
    data.builds[build.id] = build;
    await this.save();
  }

  async listBuilds(projectSlug?: string): Promise<Build[]> {
    const data = await this.load();
    let builds = Object.values(data.builds);
    
    if (projectSlug) {
      builds = builds.filter(b => b.projectSlug === projectSlug);
    }
    
    // Sort by createdAt descending
    builds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return builds;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    const data = await this.load();
    return data.apiKeys.includes(apiKey);
  }

  async acquireBuildLock(): Promise<boolean> {
    const data = await this.load();
    
    if (data.buildLock) {
      return false; // Already locked
    }
    
    data.buildLock = true;
    await this.save();
    return true;
  }

  async releaseBuildLock(): Promise<void> {
    const data = await this.load();
    data.buildLock = false;
    await this.save();
  }

  async isBuildLocked(): Promise<boolean> {
    const data = await this.load();
    return data.buildLock;
  }
}

// Singleton instance
let kvInstance: KVService | null = null;

export function initKV(filePath: string): KVService {
  kvInstance = new LocalKVService(filePath);
  return kvInstance;
}

export function getKV(): KVService {
  if (!kvInstance) {
    throw new Error('KV not initialized. Call initKV() first.');
  }
  return kvInstance;
}
