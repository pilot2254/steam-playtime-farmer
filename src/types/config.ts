/**
 * Configuration-related type definitions
 */
import type { SteamGame } from './steam.js';

export interface UserConfig {
  accountName: string;
  sharedSecret: string;
  games: SteamGame[];
  rememberPassword: boolean;
  password: string;
}

export interface PresetConfig extends UserConfig {
  readonly id: string;
  readonly name: string;
}

export interface AppPaths {
  readonly presetsDir: string;
  readonly configFile: string;
  readonly sessionFile: string;
}

export interface ReconnectConfig {
  readonly maxAttempts: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

export interface SteamClientConfig {
  readonly promptSteamGuardCode: boolean;
  readonly autoRelogin: boolean;
}

export interface AppConfiguration {
  readonly appName: string;
  readonly version: string;
  readonly paths: AppPaths;
  readonly steam: {
    readonly reconnect: ReconnectConfig;
    readonly client: SteamClientConfig;
  };
}