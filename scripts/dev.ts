#!/usr/bin/env npx tsx

/**
 * Development Script
 * 
 * Starts the local development environment:
 * 1. Builds all packages
 * 2. Starts the API server
 * 3. Optionally starts ngrok tunnel
 * 
 * Usage:
 *   pnpm dev              - Start API server
 *   pnpm dev --tunnel     - Start with ngrok tunnel
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

interface ProcessInfo {
  name: string;
  process: ChildProcess;
}

const processes: ProcessInfo[] = [];

function startProcess(name: string, command: string, args: string[], cwd: string = ROOT_DIR): ChildProcess {
  console.log(`[${name}] Starting: ${command} ${args.join(' ')}`);
  
  const proc = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  processes.push({ name, process: proc });

  proc.on('error', (error) => {
    console.error(`[${name}] Error:`, error.message);
  });

  proc.on('close', (code) => {
    console.log(`[${name}] Exited with code ${code}`);
  });

  return proc;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const withTunnel = args.includes('--tunnel');

  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   🐱 LazyKitty Development Environment         │
│                                                 │
└─────────────────────────────────────────────────┘
`);

  // Ensure storage directory exists
  await mkdir(join(ROOT_DIR, 'storage'), { recursive: true });

  // Build packages first
  console.log('[Build] Building packages...');
  
  await new Promise<void>((resolve, reject) => {
    const build = spawn('pnpm', ['build'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
    });

    build.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });

  console.log('[Build] Build complete!\n');

  // Start API server
  startProcess('API', 'pnpm', ['--filter', '@lazykitty/api', 'dev']);

  // Wait a bit for API to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start ngrok if requested
  if (withTunnel) {
    if (!process.env['NGROK_AUTHTOKEN']) {
      console.warn('[ngrok] Warning: NGROK_AUTHTOKEN not set. Tunnel may not work.');
    }
    startProcess('ngrok', 'npx', ['ngrok', 'http', '3000']);
  }

  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   Development server is running!               │
│                                                 │
│   API:     http://localhost:3000               │
│   Health:  http://localhost:3000/health        │
│                                                 │
│   Test API Key: lk_test_dev_key_12345          │
│                                                 │
│   Press Ctrl+C to stop                         │
│                                                 │
└─────────────────────────────────────────────────┘
`);

  if (withTunnel) {
    console.log(`
   ngrok dashboard: http://localhost:4040
   (Check dashboard for public URL)
`);
  }
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n[Dev] Shutting down...');
  
  for (const { name, process } of processes) {
    console.log(`[Dev] Stopping ${name}...`);
    process.kill('SIGTERM');
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const { process } of processes) {
    process.kill('SIGTERM');
  }
  process.exit(0);
});

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
