/**
 * UI Utilities
 * 
 * Spinners, QR codes, and formatting
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import qrcode from 'qrcode-terminal';
import type { Build, BuildStatus } from '@lazykitty/shared';

/**
 * Create a spinner
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

/**
 * Format build status with color
 */
export function formatStatus(status: BuildStatus): string {
  switch (status) {
    case 'pending':
      return chalk.yellow('pending');
    case 'downloading':
      return chalk.blue('downloading');
    case 'installing':
      return chalk.blue('installing');
    case 'building':
      return chalk.blue('building');
    case 'uploading':
      return chalk.blue('uploading');
    case 'success':
      return chalk.green('success');
    case 'failed':
      return chalk.red('failed');
    default:
      return status;
  }
}

/**
 * Get status emoji
 */
export function getStatusEmoji(status: BuildStatus): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'downloading':
    case 'installing':
    case 'building':
    case 'uploading':
      return '🔄';
    case 'success':
      return '✅';
    case 'failed':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Display QR code for Expo Go URL
 */
export function displayQRCode(url: string): void {
  console.log();
  console.log(chalk.bold('Open in Expo Go:'));
  console.log(chalk.cyan(url));
  console.log();
  qrcode.generate(url, { small: true });
}

/**
 * Display success message with build info
 */
export function displayBuildSuccess(build: Build, manifestUrl: string, expoGoUrl: string): void {
  console.log();
  console.log(chalk.green.bold('Build complete!'));
  console.log();
  console.log(`  ${chalk.gray('Build ID:')}    ${build.id}`);
  console.log(`  ${chalk.gray('Project:')}     ${build.projectSlug}`);
  console.log(`  ${chalk.gray('Platform:')}    ${build.platform}`);
  console.log(`  ${chalk.gray('Runtime:')}     ${build.runtimeVersion}`);
  console.log();
  console.log(`  ${chalk.gray('Manifest:')}    ${chalk.cyan(manifestUrl)}`);
  console.log();
  
  displayQRCode(expoGoUrl);
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.error(chalk.red.bold('Error:'), message);
}

/**
 * Display warning message
 */
export function displayWarning(message: string): void {
  console.warn(chalk.yellow.bold('Warning:'), message);
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(chalk.blue('Info:'), message);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Format duration in seconds
 */
export function formatDuration(startDate: string, endDate?: string): string {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
