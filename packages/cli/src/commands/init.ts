/**
 * Init Command
 * 
 * Initialize lazykitty.json in project directory
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { 
  getProjectConfig, 
  saveProjectConfig, 
  getExpoConfig,
  getRuntimeVersion,
} from '../lib/config.js';
import { displayError, displayWarning } from '../lib/ui.js';
import { PROJECT_CONFIG_FILE } from '@lazykitty/shared';

export const initCommand = new Command('init')
  .description('Initialize LazyKitty in the current project')
  .option('--slug <slug>', 'Project slug (defaults to Expo slug)')
  .option('--force', 'Overwrite existing config', false)
  .action(async (options: { slug?: string; force: boolean }) => {
    const cwd = process.cwd();

    // Check for existing config
    const existingConfig = await getProjectConfig(cwd);
    if (existingConfig && !options.force) {
      displayWarning(`${PROJECT_CONFIG_FILE} already exists. Use --force to overwrite.`);
      console.log();
      console.log('Current config:');
      console.log(`  ${chalk.gray('Project Slug:')}  ${existingConfig.projectSlug}`);
      if (existingConfig.runtimeVersion) {
        console.log(`  ${chalk.gray('Runtime:')}       ${existingConfig.runtimeVersion}`);
      }
      return;
    }

    // Load Expo config
    const expoConfig = await getExpoConfig(cwd);
    
    if (!expoConfig) {
      displayError('Could not find app.json or app.config.json');
      console.log();
      console.log('Make sure you are in an Expo project directory.');
      process.exit(1);
    }

    if (!expoConfig.slug) {
      displayError('Missing "slug" in app.json');
      console.log();
      console.log('Add a "slug" field to your app.json:');
      console.log(chalk.gray('  "slug": "my-app"'));
      process.exit(1);
    }

    // Determine project slug
    const projectSlug = options.slug ?? expoConfig.slug;
    const runtimeVersion = getRuntimeVersion(expoConfig);

    // Save config
    await saveProjectConfig({
      projectSlug,
      runtimeVersion,
    }, cwd);

    console.log(chalk.green(`Created ${PROJECT_CONFIG_FILE}`));
    console.log();
    console.log(`  ${chalk.gray('Project Slug:')}  ${projectSlug}`);
    console.log(`  ${chalk.gray('Runtime:')}       ${runtimeVersion}`);
    console.log();
    console.log(`Next steps:`);
    console.log(`  1. Run ${chalk.cyan('lazykitty login --api-key <key>')} to authenticate`);
    console.log(`  2. Run ${chalk.cyan('lazykitty deploy')} to deploy your app`);
  });
