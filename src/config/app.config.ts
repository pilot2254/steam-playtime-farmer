// Steam Playtime Farmer Configuration
// This file contains all application-wide configuration settings
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
  version: '0.6.0',
  
  // File paths for various application data
  paths: {
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
      autoRelogin: false,
    },
  },
};

// Default user configuration template (will be saved to configFileName)
export const defaultConfig: UserConfig = {
  accountName: 'YOUR_ACCOUNT_NAME_HERE',
  sharedSecret: 'THIS_IS_OPTIONAL',
  games: [
    {
      appId: 221410,
      name: 'Steam for Linux'
    },
    {
      appId: 730,
      name: 'CS2'
    }
  ],
  password: 'YOUR_PASSWORD_HERE'
};

export default { appConfig, defaultConfig };