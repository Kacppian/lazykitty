#!/usr/bin/env node

/**
 * LazyKitty CLI
 * 
 * Build infrastructure for Expo apps
 */

import { Command } from 'commander';
import { loginCommand, logoutCommand, whoamiCommand } from './commands/login.js';
import { initCommand } from './commands/init.js';
import { deployCommand } from './commands/deploy.js';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';

const program = new Command();

program
  .name('lazykitty')
  .description('Build infrastructure for Expo apps')
  .version('0.0.1');

// Auth commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);

// Project commands
program.addCommand(initCommand);
program.addCommand(deployCommand);
program.addCommand(statusCommand);
program.addCommand(listCommand);

// Parse arguments
program.parse();
