// App Configuration
import path from 'path';
import { fileURLToPath } from 'url';
import type { AppConfiguration, UserConfig } from '../types/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

export const appConfig: AppConfiguration = {
  appName: 'Steam Playtime Farmer',
  version: '0.6.0',
  paths: {
    configFile: path.join(rootDir, 'user-config.json'),
    sessionFile: path.join(rootDir, 'steam-session.dat'),
  },
  steam: {
    reconnect: {
      maxAttempts: 10,
      initialDelay: 3000,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
    },
    client: {
      autoRelogin: false,
    },
  },
};

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
  password: 'YOUR_PASSWORD_HERE',
  customStatus: ''
};

export default { appConfig, defaultConfig };