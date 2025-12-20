// Configuration-related type definitions
import type { SteamGame } from './steam.js';

export interface UserConfig {
  accountName: string;
  sharedSecret: string;
  games: SteamGame[];
  password: string;
  customStatus?: string;
  useCustomStatusOnly?: boolean;
}

export interface AppPaths {
  configFile: string;
  sessionFile: string;
}

export interface ReconnectConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface SteamClientConfig {
  autoRelogin: boolean;
}

export interface AppConfiguration {
  appName: string;
  version: string;
  paths: AppPaths;
  steam: {
    reconnect: ReconnectConfig;
    client: SteamClientConfig;
  };
}