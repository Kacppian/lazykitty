/**
 * Login Command
 * 
 * Save API key and API URL to user config
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { saveUserConfig, getUserConfig } from '../lib/config.js';
import { ApiClient } from '../lib/api.js';
import { createSpinner, displayError } from '../lib/ui.js';
import { LOCAL_API_URL } from '@lazykitty/shared';

export const loginCommand = new Command('login')
  .description('Save API key for authentication')
  .requiredOption('--api-key <key>', 'API key for authentication')
  .option('--api-url <url>', 'API URL (defaults to local dev server)', LOCAL_API_URL)
  .action(async (options: { apiKey: string; apiUrl: string }) => {
    const { apiKey, apiUrl } = options;

    const spinner = createSpinner('Validating API key...');
    spinner.start();

    try {
      // Test the API key
      const client = new ApiClient(apiUrl, apiKey);
      const isHealthy = await client.health();

      if (!isHealthy) {
        spinner.fail('Cannot connect to API server');
        displayError(`Unable to reach ${apiUrl}. Is the server running?`);
        process.exit(1);
      }

      // Try to make an authenticated request
      try {
        await client.listBuilds();
      } catch (error) {
        spinner.fail('Invalid API key');
        displayError('The provided API key is not valid.');
        process.exit(1);
      }

      // Save config
      await saveUserConfig({
        apiKey,
        apiUrl,
      });

      spinner.succeed('Logged in successfully');
      console.log();
      console.log(`  ${chalk.gray('API URL:')}  ${apiUrl}`);
      console.log(`  ${chalk.gray('API Key:')}  ${apiKey.slice(0, 10)}...`);
      console.log();
    } catch (error) {
      spinner.fail('Login failed');
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

export const logoutCommand = new Command('logout')
  .description('Remove saved API key')
  .action(async () => {
    const config = await getUserConfig();
    
    if (!config) {
      console.log(chalk.yellow('Not logged in.'));
      return;
    }

    await saveUserConfig({
      apiKey: '',
      apiUrl: config.apiUrl,
    });

    console.log(chalk.green('Logged out successfully.'));
  });

export const whoamiCommand = new Command('whoami')
  .description('Show current authentication status')
  .action(async () => {
    const config = await getUserConfig();
    
    if (!config || !config.apiKey) {
      console.log(chalk.yellow('Not logged in.'));
      console.log();
      console.log(`Run ${chalk.cyan('lazykitty login --api-key <key>')} to authenticate.`);
      return;
    }

    console.log(`  ${chalk.gray('API URL:')}  ${config.apiUrl}`);
    console.log(`  ${chalk.gray('API Key:')}  ${config.apiKey.slice(0, 10)}...`);
  });
