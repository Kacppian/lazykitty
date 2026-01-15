/**
 * Config Management
 * 
 * Handles user config (~/.lazykitty/config.json) and project config (lazykitty.json)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import type { UserConfig, ProjectConfig, ExpoClientConfig } from '@lazykitty/shared';
import { 
  USER_CONFIG_DIR, 
  USER_CONFIG_FILE, 
  PROJECT_CONFIG_FILE,
  LOCAL_API_URL,
} from '@lazykitty/shared';

// ============================================================================
// User Config (~/.lazykitty/config.json)
// ============================================================================

function getUserConfigPath(): string {
  return join(homedir(), USER_CONFIG_DIR, USER_CONFIG_FILE);
}

export async function getUserConfig(): Promise<UserConfig | null> {
  try {
    const content = await readFile(getUserConfigPath(), 'utf-8');
    return JSON.parse(content) as UserConfig;
  } catch {
    return null;
  }
}

export async function saveUserConfig(config: UserConfig): Promise<void> {
  const configPath = getUserConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function getApiKey(): Promise<string | null> {
  const config = await getUserConfig();
  return config?.apiKey ?? null;
}

export async function getApiUrl(): Promise<string> {
  const config = await getUserConfig();
  return config?.apiUrl ?? LOCAL_API_URL;
}

// ============================================================================
// Project Config (lazykitty.json)
// ============================================================================

function getProjectConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, PROJECT_CONFIG_FILE);
}

export async function getProjectConfig(cwd: string = process.cwd()): Promise<ProjectConfig | null> {
  try {
    const content = await readFile(getProjectConfigPath(cwd), 'utf-8');
    return JSON.parse(content) as ProjectConfig;
  } catch {
    return null;
  }
}

export async function saveProjectConfig(config: ProjectConfig, cwd: string = process.cwd()): Promise<void> {
  await writeFile(getProjectConfigPath(cwd), JSON.stringify(config, null, 2));
}

// ============================================================================
// Expo Config (app.json / app.config.js)
// ============================================================================

export async function getExpoConfig(cwd: string = process.cwd()): Promise<ExpoClientConfig | null> {
  // Try app.json first
  try {
    const appJsonPath = join(cwd, 'app.json');
    const content = await readFile(appJsonPath, 'utf-8');
    const appJson = JSON.parse(content) as { expo?: ExpoClientConfig };
    
    if (appJson.expo) {
      return appJson.expo;
    }
    
    // If no expo key, treat the whole file as the config
    return appJson as ExpoClientConfig;
  } catch {
    // app.json doesn't exist or is invalid
  }

  // Try app.config.json
  try {
    const appConfigPath = join(cwd, 'app.config.json');
    const content = await readFile(appConfigPath, 'utf-8');
    return JSON.parse(content) as ExpoClientConfig;
  } catch {
    // app.config.json doesn't exist
  }

  // Note: We don't support app.config.js/ts as that would require running JS
  // For now, we only support JSON configs

  return null;
}

export function getRuntimeVersion(expoConfig: ExpoClientConfig): string {
  // Check for explicit runtimeVersion
  if (expoConfig.runtimeVersion) {
    if (typeof expoConfig.runtimeVersion === 'string') {
      return expoConfig.runtimeVersion;
    }
    // Handle policy-based runtime version (simplified)
  }

  // Fall back to SDK version
  if (expoConfig.sdkVersion) {
    return `exposdk:${expoConfig.sdkVersion}`;
  }

  // Default
  return 'exposdk:52.0.0';
}
