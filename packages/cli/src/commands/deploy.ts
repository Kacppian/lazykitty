/**
 * Deploy Command
 * 
 * Create tarball, upload, and deploy
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { BuildStatus } from '@lazykitty/shared';
import { 
  getProjectConfig, 
  getExpoConfig, 
  getUserConfig,
  getRuntimeVersion,
} from '../lib/config.js';
import { ApiClient } from '../lib/api.js';
import { createTarball, formatBytes } from '../lib/tarball.js';
import { 
  createSpinner, 
  displayError, 
  displayBuildSuccess,
  formatStatus,
  formatDuration,
} from '../lib/ui.js';

const POLL_INTERVAL_MS = 2000; // 2 seconds

export const deployCommand = new Command('deploy')
  .description('Deploy your Expo app')
  .option('--platform <platform>', 'Target platform (ios, android, all)', 'all')
  .action(async (options: { platform: 'ios' | 'android' | 'all' }) => {
    const cwd = process.cwd();

    // Load configs
    const userConfig = await getUserConfig();
    if (!userConfig?.apiKey) {
      displayError('Not logged in. Run `lazykitty login --api-key <key>` first.');
      process.exit(1);
    }

    const projectConfig = await getProjectConfig(cwd);
    if (!projectConfig) {
      displayError('No lazykitty.json found. Run `lazykitty init` first.');
      process.exit(1);
    }

    const expoConfig = await getExpoConfig(cwd);
    if (!expoConfig) {
      displayError('No app.json found. Are you in an Expo project?');
      process.exit(1);
    }

    // Create API client
    const client = new ApiClient(userConfig.apiUrl, userConfig.apiKey);

    // Create tarball
    const tarballSpinner = createSpinner('Creating tarball...');
    tarballSpinner.start();

    let tarballBuffer: Buffer;
    let fileCount: number;
    let tarballSize: number;

    try {
      const result = await createTarball(cwd);
      tarballBuffer = result.buffer;
      fileCount = result.fileCount;
      tarballSize = result.buffer.length;
      tarballSpinner.succeed(`Tarball created (${formatBytes(tarballSize)}, ${fileCount} files)`);
    } catch (error) {
      tarballSpinner.fail('Failed to create tarball');
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }

    // Upload and start build
    const uploadSpinner = createSpinner('Uploading...');
    uploadSpinner.start();

    let buildId: string;

    try {
      const response = await client.upload(tarballBuffer, {
        projectSlug: projectConfig.projectSlug,
        platform: options.platform,
        runtimeVersion: projectConfig.runtimeVersion ?? getRuntimeVersion(expoConfig),
        expoConfig: {
          name: expoConfig.name,
          slug: expoConfig.slug,
          version: expoConfig.version,
          sdkVersion: expoConfig.sdkVersion,
        },
      });

      buildId = response.buildId;
      uploadSpinner.succeed(`Build started: ${chalk.cyan(buildId)}`);
    } catch (error) {
      uploadSpinner.fail('Upload failed');
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }

    // Poll for build status
    const buildSpinner = createSpinner('Building...');
    buildSpinner.start();

    const startTime = Date.now();
    let lastStatus: BuildStatus = 'pending';

    while (true) {
      try {
        const response = await client.getBuild(buildId);
        const { build } = response;

        if (build.status !== lastStatus) {
          lastStatus = build.status;
          const duration = formatDuration(build.createdAt);
          buildSpinner.text = `Building... [${formatStatus(build.status)}] (${duration})`;
        }

        if (build.status === 'success') {
          buildSpinner.succeed(`Build complete! (${formatDuration(build.createdAt, build.completedAt)})`);
          
          if (response.manifestUrl && response.expoGoUrl) {
            displayBuildSuccess(build, response.manifestUrl, response.expoGoUrl);
          }
          break;
        }

        if (build.status === 'failed') {
          buildSpinner.fail('Build failed');
          displayError(build.error ?? 'Unknown error');
          process.exit(1);
        }

        // Check timeout (15 minutes)
        if (Date.now() - startTime > 15 * 60 * 1000) {
          buildSpinner.fail('Build timed out');
          displayError('Build took too long. Check server logs.');
          process.exit(1);
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      } catch (error) {
        buildSpinner.fail('Failed to check build status');
        displayError(error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    }
  });
