#!/usr/bin/env npx tsx

/**
 * Seed Script
 * 
 * Creates initial data for local development:
 * - Test API key
 * - Storage directories
 * 
 * Usage:
 *   pnpm seed
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const STORAGE_DIR = join(ROOT_DIR, 'storage');
const KV_PATH = join(STORAGE_DIR, 'kv.json');

interface KVData {
  builds: Record<string, unknown>;
  apiKeys: string[];
  buildLock: boolean;
}

async function main(): Promise<void> {
  console.log('🐱 LazyKitty - Seeding development data\n');

  // Create storage directories
  const dirs = [
    STORAGE_DIR,
    join(STORAGE_DIR, 'tarballs'),
    join(STORAGE_DIR, 'bundles'),
    join(STORAGE_DIR, 'assets'),
    join(STORAGE_DIR, 'metadata'),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
    console.log(`  ✓ Created ${dir.replace(ROOT_DIR, '.')}`);
  }

  // Create or update KV file
  let kvData: KVData;
  
  try {
    const content = await readFile(KV_PATH, 'utf-8');
    kvData = JSON.parse(content) as KVData;
    console.log(`  ✓ Loaded existing kv.json`);
  } catch {
    kvData = {
      builds: {},
      apiKeys: [],
      buildLock: false,
    };
    console.log(`  ✓ Created new kv.json`);
  }

  // Ensure test API key exists
  const testKey = 'lk_test_dev_key_12345';
  if (!kvData.apiKeys.includes(testKey)) {
    kvData.apiKeys.push(testKey);
    console.log(`  ✓ Added test API key`);
  }

  // Save KV file
  await writeFile(KV_PATH, JSON.stringify(kvData, null, 2));
  console.log(`  ✓ Saved kv.json`);

  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   Seed complete!                               │
│                                                 │
│   Test API Key: lk_test_dev_key_12345          │
│                                                 │
│   Run \`pnpm dev\` to start the server          │
│                                                 │
└─────────────────────────────────────────────────┘
`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
