/**
 * Build Process
 * 
 * Runs npm install and expo export
 */

import { spawn } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';
import type { AssetMetadata, ExpoManifest, ExpoAsset, ExpoClientConfig } from '@lazykitty/shared';
import { MIME_TYPES } from '@lazykitty/shared';

/**
 * Expo export metadata.json structure
 */
interface ExpoMetadata {
  version: number;
  bundler: string;
  fileMetadata: {
    ios?: {
      bundle: string;
      assets: string[];
    };
    android?: {
      bundle: string;
      assets: string[];
    };
  };
}

/**
 * Run a shell command and return stdout
 */
async function runCommand(
  command: string, 
  args: string[], 
  cwd: string,
  onStatus?: (status: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Install dependencies
 */
export async function installDependencies(
  projectDir: string,
  onStatus?: (status: string) => void
): Promise<void> {
  onStatus?.('installing');
  console.log('[Builder] Installing dependencies...');
  
  // Check if package-lock.json exists (use npm) or yarn.lock (use yarn)
  let command = 'npm';
  let args = ['install', '--legacy-peer-deps'];
  
  try {
    await stat(join(projectDir, 'yarn.lock'));
    command = 'yarn';
    args = ['install'];
  } catch {
    // Use npm
  }

  try {
    await stat(join(projectDir, 'pnpm-lock.yaml'));
    command = 'pnpm';
    args = ['install'];
  } catch {
    // Use npm or yarn
  }

  await runCommand(command, args, projectDir, onStatus);
}

/**
 * Run expo export
 */
export async function runExpoExport(
  projectDir: string,
  platform: string,
  onStatus?: (status: string) => void
): Promise<string> {
  onStatus?.('building');
  console.log(`[Builder] Running expo export for platform: ${platform}`);
  
  const outputDir = join(projectDir, 'dist');
  
  const args = [
    'expo', 'export',
    '--platform', platform === 'all' ? 'all' : platform,
    '--output-dir', outputDir,
    '--no-bytecode', // Use plain JS for Expo Go compatibility
  ];

  await runCommand('npx', args, projectDir, onStatus);
  
  return outputDir;
}

/**
 * Compute Base64URL-encoded SHA-256 hash of a file
 */
async function computeFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  const hash = createHash('sha256').update(content).digest('base64url');
  return hash;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.js': 'application/javascript',
    '.hbc': 'application/javascript', // Hermes bytecode
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
  };
  
  return mimeTypes[ext.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Parse expo export output using metadata.json
 */
export async function collectAssets(
  outputDir: string,
  buildId: string
): Promise<{ assets: AssetMetadata[]; bundles: { ios?: string; android?: string }; metadata: ExpoMetadata }> {
  const assets: AssetMetadata[] = [];
  const bundles: { ios?: string; android?: string } = {};

  // Read metadata.json from expo export
  const metadataPath = join(outputDir, 'metadata.json');
  let metadata: ExpoMetadata;
  
  try {
    const metadataContent = await readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(metadataContent) as ExpoMetadata;
    console.log('[Builder] Loaded metadata.json:', JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('[Builder] Failed to read metadata.json, falling back to directory scan');
    // Fallback to old behavior
    metadata = { version: 0, bundler: 'metro', fileMetadata: {} };
  }

  // Extract bundle paths from metadata
  if (metadata.fileMetadata.ios?.bundle) {
    bundles.ios = metadata.fileMetadata.ios.bundle;
  }
  if (metadata.fileMetadata.android?.bundle) {
    bundles.android = metadata.fileMetadata.android.bundle;
  }

  // Walk directory and collect all assets
  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(outputDir, fullPath);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        const hash = await computeFileHash(fullPath);
        
        assets.push({
          key: relativePath,
          hash,
          contentType: getMimeType(ext),
          fileExtension: ext || undefined,
          path: relativePath,
        });
      }
    }
  }

  await walkDir(outputDir);

  return { assets, bundles, metadata };
}

/**
 * Generate Expo manifest from build output
 */
export function generateManifest(
  buildId: string,
  runtimeVersion: string,
  expoConfig: ExpoClientConfig,
  assets: AssetMetadata[],
  bundles: { ios?: string; android?: string },
  platform: string
): ExpoManifest {
  // Find the launch asset (bundle) - could be .js or .hbc
  const bundlePath = platform === 'ios' 
    ? bundles.ios 
    : (bundles.android ?? bundles.ios);
  
  if (!bundlePath) {
    throw new Error(`No bundle path found for platform ${platform}`);
  }

  const bundleAsset = assets.find(a => a.path === bundlePath);
  
  if (!bundleAsset) {
    throw new Error(`Bundle not found at path ${bundlePath} for platform ${platform}`);
  }

  // Determine content type based on file extension
  const bundleExt = extname(bundlePath);
  const bundleContentType = bundleExt === '.hbc' 
    ? 'application/javascript' // Hermes bytecode served as JS
    : MIME_TYPES.JAVASCRIPT;

  const launchAsset: ExpoAsset = {
    key: 'bundle',
    hash: bundleAsset.hash,
    contentType: bundleContentType,
    url: `bundles/${platform}${bundleExt}`, // Preserve original extension
  };

  // Other assets (excluding the bundle files and metadata.json)
  const bundlePaths = [bundles.ios, bundles.android].filter(Boolean);
  const otherAssets: ExpoAsset[] = assets
    .filter(a => !bundlePaths.includes(a.path) && a.path !== 'metadata.json')
    .map(asset => ({
      key: asset.key,
      hash: asset.hash,
      contentType: asset.contentType,
      fileExtension: asset.fileExtension,
      url: asset.path,
    }));

  // Generate scopeKey from expoConfig (required by Expo Go)
  const slug = expoConfig?.slug ?? 'app';
  const owner = (expoConfig as { owner?: string })?.owner;
  const scopeKey = owner ? `@${owner}/${slug}` : `@anonymous/${slug}`;

  return {
    id: buildId,
    createdAt: new Date().toISOString(),
    runtimeVersion,
    launchAsset,
    assets: otherAssets,
    metadata: {},
    extra: {
      scopeKey, // Required by Expo Go - must be inside extra
      expoClient: expoConfig,
    },
  };
}
