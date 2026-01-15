/**
 * Builder Service
 * 
 * Abstract interface for triggering builds
 * Local implementation spawns a Node subprocess, prod uses Fly.io Machines
 */

import { spawn, fork } from 'node:child_process';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Build } from '@lazykitty/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { BUILD_TIMEOUT_MS } from '@lazykitty/shared';
import { getKV } from './kv.js';

export interface BuilderService {
  triggerBuild(build: Build, tarballUrl: string, webhookUrl: string): Promise<void>;
}

/**
 * Local Docker builder for development
 */
export class LocalDockerBuilder implements BuilderService {
  private builderImageName: string;
  private storageBasePath: string;

  constructor(builderImageName: string = 'lazykitty-builder', storageBasePath: string = './storage') {
    this.builderImageName = builderImageName;
    this.storageBasePath = storageBasePath;
  }

  async triggerBuild(build: Build, tarballUrl: string, webhookUrl: string): Promise<void> {
    const kv = getKV();
    
    // Update build status
    build.status = 'pending';
    build.updatedAt = new Date().toISOString();
    await kv.setBuild(build);

    // Get absolute path to storage
    const absoluteStoragePath = isAbsolute(this.storageBasePath)
      ? this.storageBasePath
      : join(process.cwd(), this.storageBasePath);

    // Spawn docker container
    const args = [
      'run',
      '--rm',
      // Mount storage for direct file access (simpler than HTTP for local dev)
      '-v', `${absoluteStoragePath}:/app/storage`,
      // Environment variables
      '-e', `BUILD_ID=${build.id}`,
      '-e', `TARBALL_PATH=/app/storage/tarballs/${build.id}.tar.gz`,
      '-e', `WEBHOOK_URL=${webhookUrl}`,
      '-e', `STORAGE_PATH=/app/storage`,
      '-e', `PLATFORM=${build.platform}`,
      '-e', `RUNTIME_VERSION=${build.runtimeVersion}`,
      // Network to access webhook
      '--network', 'host',
      this.builderImageName,
    ];

    console.log(`[Builder] Starting docker build for ${build.id}`);
    console.log(`[Builder] Command: docker ${args.join(' ')}`);

    const dockerProcess = spawn('docker', args, {
      stdio: 'inherit',
    });

    // Set timeout
    const timeout = setTimeout(() => {
      console.log(`[Builder] Build ${build.id} timed out after ${BUILD_TIMEOUT_MS}ms`);
      dockerProcess.kill('SIGTERM');
    }, BUILD_TIMEOUT_MS);

    dockerProcess.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`[Builder] Docker process exited with code ${code}`);
    });

    dockerProcess.on('error', async (error) => {
      clearTimeout(timeout);
      console.error(`[Builder] Docker process error:`, error);
      
      // Update build status to failed
      build.status = 'failed';
      build.error = `Docker error: ${error.message}`;
      build.updatedAt = new Date().toISOString();
      await kv.setBuild(build);
      await kv.releaseBuildLock();
    });
  }
}

/**
 * In-process builder for development without Docker
 * Spawns the builder as a separate Node.js process
 */
export class LocalProcessBuilder implements BuilderService {
  private storageBasePath: string;

  constructor(storageBasePath: string = './storage') {
    this.storageBasePath = storageBasePath;
  }

  async triggerBuild(build: Build, tarballUrl: string, webhookUrl: string): Promise<void> {
    const kv = getKV();
    
    // Update build status
    build.status = 'pending';
    build.updatedAt = new Date().toISOString();
    await kv.setBuild(build);

    // Get monorepo root from __dirname (we're in packages/api/dist/services/)
    const monorepoRoot = join(__dirname, '..', '..', '..', '..');
    // Handle both absolute and relative storage paths
    const absoluteStoragePath = isAbsolute(this.storageBasePath) 
      ? this.storageBasePath 
      : join(monorepoRoot, this.storageBasePath);
    
    // Find the builder script relative to monorepo root
    const builderScript = join(monorepoRoot, 'packages', 'builder', 'dist', 'index.js');

    console.log(`[Builder] Starting subprocess build for ${build.id}`);
    console.log(`[Builder] Monorepo root: ${monorepoRoot}`);
    console.log(`[Builder] Script: ${builderScript}`);

    // Spawn as subprocess with environment variables
    const builderProcess = spawn('node', [builderScript], {
      stdio: 'inherit',
      env: {
        ...process.env,
        BUILD_ID: build.id,
        TARBALL_PATH: join(absoluteStoragePath, 'tarballs', `${build.id}.tar.gz`),
        WEBHOOK_URL: webhookUrl,
        STORAGE_PATH: absoluteStoragePath,
        PLATFORM: build.platform,
        RUNTIME_VERSION: build.runtimeVersion,
      },
    });

    // Set timeout
    const timeout = setTimeout(async () => {
      console.log(`[Builder] Build ${build.id} timed out after ${BUILD_TIMEOUT_MS}ms`);
      builderProcess.kill('SIGTERM');
      
      build.status = 'failed';
      build.error = 'Build timed out';
      build.updatedAt = new Date().toISOString();
      await kv.setBuild(build);
      await kv.releaseBuildLock();
    }, BUILD_TIMEOUT_MS);

    builderProcess.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`[Builder] Process exited with code ${code}`);
    });

    builderProcess.on('error', async (error) => {
      clearTimeout(timeout);
      console.error(`[Builder] Process error:`, error);
      
      build.status = 'failed';
      build.error = `Process error: ${error.message}`;
      build.updatedAt = new Date().toISOString();
      await kv.setBuild(build);
      await kv.releaseBuildLock();
    });
  }
}

// Singleton instance
let builderInstance: BuilderService | null = null;

export function initBuilder(type: 'docker' | 'process' = 'process', storageBasePath: string = './storage'): BuilderService {
  if (type === 'docker') {
    builderInstance = new LocalDockerBuilder('lazykitty-builder', storageBasePath);
  } else {
    builderInstance = new LocalProcessBuilder(storageBasePath);
  }
  return builderInstance;
}

export function getBuilder(): BuilderService {
  if (!builderInstance) {
    throw new Error('Builder not initialized. Call initBuilder() first.');
  }
  return builderInstance;
}
