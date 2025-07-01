// Config Manager Module
// Handles loading, saving, and managing user configuration
import fs from 'fs';
import path from 'path';
import { appConfig, defaultConfig } from '../config/app.config.js';
import type { UserConfig } from '../types/config.js';
import type { SteamGame } from '../types/steam.js';

// Configuration file path
const CONFIG_FILE = appConfig.paths.configFile;

// Creates a configuration manager for handling user settings
export function createConfigManager() {
  // Current configuration
  let config: UserConfig = { ...defaultConfig };

  // Helper functions for file operations

  // Ensure a directory exists
  const ensureDir = (dir: string): void => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  };

  // Read JSON file safely
  const readJson = <T>(filePath: string, defaultVal: T | null = null): T | null => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content) as T;
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
    return defaultVal;
  };

  // Write JSON file safely
  const writeJson = (filePath: string, data: unknown): boolean => {
    try {
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
      return false;
    }
  };

  // Return the public API
  return {
    // Get current configuration
    get(): Readonly<UserConfig> {
      return { ...config };
    },

    // Load configuration from file
    async load(): Promise<boolean> {
      const loadedConfig = readJson<UserConfig>(CONFIG_FILE, null);
      if (loadedConfig) {
        config = loadedConfig;
        console.log('Configuration loaded successfully.');
        return true;
      } else {
        console.log('No configuration file found. Creating default configuration...');
        await this.save();
        console.log('Default configuration created. Please edit user-config.json with your Steam account details.');
        return false;
      }
    },

    // Save configuration to file
    async save(): Promise<boolean> {
      return writeJson(CONFIG_FILE, config);
    },

    // Update configuration
    async update(newConfig: Partial<UserConfig>): Promise<boolean> {
      config = { ...config, ...newConfig };
      return this.save();
    },

    // Add a game to the configuration
    async addGame(appId: number, name: string): Promise<boolean> {
      // Check if game already exists
      const existingIndex = config.games.findIndex((game) => game.appId === appId);
      if (existingIndex !== -1) {
        console.log(`Game with AppID ${appId} already exists.`);
        return false;
      }

      config.games.push({
        appId,
        name: name || `Game ${appId}`,
      });
      return this.save();
    },

    // Remove a game from the configuration
    async removeGame(index: number): Promise<SteamGame | false> {
      if (index < 0 || index >= config.games.length) return false;
      const removed = config.games.splice(index, 1)[0];
      await this.save();
      return removed;
    },

    // Check if configuration is valid for farming
    isValidForFarming(): boolean {
      return !!(
        config.accountName && 
        config.accountName !== 'YOUR_ACCOUNT_NAME_HERE' &&
        config.games && 
        config.games.length > 0
      );
    },
  };
}

export type ConfigManager = ReturnType<typeof createConfigManager>;