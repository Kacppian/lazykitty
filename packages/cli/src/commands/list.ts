/**
 * List Command
 * 
 * List recent builds
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getUserConfig, getProjectConfig } from '../lib/config.js';
import { ApiClient } from '../lib/api.js';
import { 
  displayError, 
  formatStatus, 
  formatDate,
  formatDuration,
} from '../lib/ui.js';

export const listCommand = new Command('list')
  .description('List recent builds')
  .alias('ls')
  .option('--all', 'List all builds (not just current project)', false)
  .option('--limit <n>', 'Maximum number of builds to show', '10')
  .action(async (options: { all: boolean; limit: string }) => {
    const userConfig = await getUserConfig();
    if (!userConfig?.apiKey) {
      displayError('Not logged in. Run `lazykitty login --api-key <key>` first.');
      process.exit(1);
    }

    const client = new ApiClient(userConfig.apiUrl, userConfig.apiKey);

    // Get project slug if not showing all
    let projectSlug: string | undefined;
    if (!options.all) {
      const projectConfig = await getProjectConfig();
      projectSlug = projectConfig?.projectSlug;
    }

    try {
      const response = await client.listBuilds(projectSlug);
      const limit = parseInt(options.limit, 10);
      const builds = response.builds.slice(0, limit);

      if (builds.length === 0) {
        console.log(chalk.yellow('No builds found.'));
        if (projectSlug) {
          console.log(`Project: ${projectSlug}`);
          console.log();
          console.log(`Run ${chalk.cyan('lazykitty list --all')} to see all builds.`);
        }
        return;
      }

      console.log();
      if (projectSlug) {
        console.log(chalk.bold(`Recent builds for ${projectSlug}`));
      } else {
        console.log(chalk.bold('Recent builds'));
      }
      console.log();

      // Table header
      console.log(
        chalk.gray(
          '  ' +
          'BUILD ID'.padEnd(20) +
          'PROJECT'.padEnd(20) +
          'STATUS'.padEnd(12) +
          'PLATFORM'.padEnd(10) +
          'CREATED'
        )
      );
      console.log(chalk.gray('  ' + '-'.repeat(80)));

      for (const build of builds) {
        const status = formatStatus(build.status);
        const statusLen = build.status.length; // Use raw status for padding calc
        
        console.log(
          '  ' +
          build.id.padEnd(20) +
          build.projectSlug.slice(0, 18).padEnd(20) +
          status + ' '.repeat(Math.max(0, 12 - statusLen)) +
          build.platform.padEnd(10) +
          formatDate(build.createdAt)
        );
      }

      console.log();
      console.log(chalk.gray(`Showing ${builds.length} of ${response.builds.length} builds`));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });
