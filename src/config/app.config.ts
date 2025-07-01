/**
 * Steam Playtime Farmer Configuration
 * This file contains all application-wide configuration settings
 */
import path from 'path';
import { fileURLToPath } from 'url';
import type { AppConfiguration, UserConfig } from '../types/config.js';

// Get the directory name for proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

// Application configuration
export const appConfig: AppConfiguration = {
  // Application name displayed in the console
  appName: 'Steam Playtime Farmer',
  
  // Application version
  version: '0.3.0',
  
  // File paths for various application data
  paths: {
    presetsDir: path.join(rootDir, 'presets'),
    configFile: path.join(rootDir, 'user-config.json'),
    sessionFile: path.join(rootDir, 'steam-session.dat'),
  },
  
  // Steam client settings
  steam: {
    // Reconnection settings
    reconnect: {
      maxAttempts: 10,
      initialDelay: 3000,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
    },
    
    // Steam client options
    client: {
      promptSteamGuardCode: false,
      autoRelogin: false,
    },
  },
} as const;

// Default user configuration (will be saved to configFileName)
export const defaultConfig: UserConfig = {
  accountName: '',
  sharedSecret: '',
  games: [],
  rememberPassword: false,
  password: '',
};

export default { appConfig, defaultConfig };