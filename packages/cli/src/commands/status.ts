/**
 * Status Command
 * 
 * Check build status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getUserConfig } from '../lib/config.js';
import { ApiClient } from '../lib/api.js';
import { 
  displayError, 
  formatStatus, 
  formatDate,
  formatDuration,
  displayQRCode,
} from '../lib/ui.js';

export const statusCommand = new Command('status')
  .description('Check build status')
  .argument('<buildId>', 'Build ID to check')
  .action(async (buildId: string) => {
    const userConfig = await getUserConfig();
    if (!userConfig?.apiKey) {
      displayError('Not logged in. Run `lazykitty login --api-key <key>` first.');
      process.exit(1);
    }

    const client = new ApiClient(userConfig.apiUrl, userConfig.apiKey);

    try {
      const response = await client.getBuild(buildId);
      const { build } = response;

      console.log();
      console.log(chalk.bold('Build Status'));
      console.log();
      console.log(`  ${chalk.gray('Build ID:')}     ${build.id}`);
      console.log(`  ${chalk.gray('Project:')}      ${build.projectSlug}`);
      console.log(`  ${chalk.gray('Status:')}       ${formatStatus(build.status)}`);
      console.log(`  ${chalk.gray('Platform:')}     ${build.platform}`);
      console.log(`  ${chalk.gray('Runtime:')}      ${build.runtimeVersion}`);
      console.log(`  ${chalk.gray('Created:')}      ${formatDate(build.createdAt)}`);
      
      if (build.completedAt) {
        console.log(`  ${chalk.gray('Completed:')}    ${formatDate(build.completedAt)}`);
        console.log(`  ${chalk.gray('Duration:')}     ${formatDuration(build.createdAt, build.completedAt)}`);
      }

      if (build.error) {
        console.log();
        console.log(chalk.red('Error:'), build.error);
      }

      if (build.status === 'success' && response.expoGoUrl) {
        displayQRCode(response.expoGoUrl);
      }

      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });
