// Config Manager Module
// Handles loading, saving, and managing user configuration and presets
import fs from 'fs';
import path from 'path';
import { appConfig, defaultConfig } from '../config/app.config.js';
import type { UserConfig, PresetConfig, SteamGame } from '../types/config.js';

// Configuration file paths
const CONFIG_FILE = appConfig.paths.configFile;
const PRESETS_DIR = appConfig.paths.presetsDir;

// Creates a configuration manager for handling user settings
export function createConfigManager() {
  // Current configuration
  let config: UserConfig = { ...defaultConfig };

  // Current preset ID
  let currentPreset: string | null = null;

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

    // Get current preset ID
    getCurrentPreset(): string | null {
      return currentPreset;
    },

    // Load configuration from file
    async load(): Promise<boolean> {
      const loadedConfig = readJson<UserConfig>(CONFIG_FILE, null);
      if (loadedConfig) {
        config = loadedConfig;
        console.log('Configuration loaded successfully.');
        return true;
      } else {
        console.log('No configuration file found. Using default settings.');
        await this.save();
        return false;
      }
    },

    // Save configuration to file
    async save(): Promise<boolean> {
      return writeJson(CONFIG_FILE, config);
    },

    // Save current configuration as a preset
    async saveAsPreset(id: string, name: string): Promise<boolean> {
      ensureDir(PRESETS_DIR);
      const presetPath = path.join(PRESETS_DIR, `${id}.json`);

      // Check if preset already exists
      if (fs.existsSync(presetPath)) {
        console.log(`Preset with ID "${id}" already exists.`);
        return false;
      }

      // Create preset object from current config
      const preset: PresetConfig = {
        id,
        name,
        accountName: config.accountName,
        sharedSecret: config.sharedSecret,
        games: [...config.games],
        rememberPassword: config.rememberPassword,
        password: config.rememberPassword ? config.password : '',
      };

      const success = writeJson(presetPath, preset);
      if (success) {
        console.log(`Preset "${name}" saved successfully.`);
        // Set as current preset
        currentPreset = id;
      }
      return success;
    },

    // Load a preset
    async loadPreset(id: string): Promise<boolean> {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`);
      const preset = readJson<PresetConfig>(presetPath, null);

      if (!preset) {
        console.log(`Preset with ID "${id}" not found.`);
        return false;
      }

      // Update configuration from preset
      config.accountName = preset.accountName || '';
      config.sharedSecret = preset.sharedSecret || '';
      config.games = preset.games || [];
      config.rememberPassword = preset.rememberPassword || false;
      // Only set password if rememberPassword is true and password exists
      config.password = preset.rememberPassword && preset.password ? preset.password : '';

      // Save to config file
      const saved = await this.save();
      if (saved) {
        // Set as current preset
        currentPreset = id;
        console.log(`Preset "${preset.name || id}" loaded successfully.`);
      }
      return saved;
    },

    // Delete a preset
    async deletePreset(id: string): Promise<boolean> {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`);

      if (!fs.existsSync(presetPath)) {
        console.log(`Preset with ID "${id}" not found.`);
        return false;
      }

      try {
        fs.unlinkSync(presetPath);
        console.log(`Preset "${id}" deleted successfully.`);

        // If this was the current preset, clear it
        if (currentPreset === id) currentPreset = null;
        return true;
      } catch (err) {
        console.error('Error deleting preset:', err);
        return false;
      }
    },

    // Get all available presets
    async getPresets(): Promise<PresetConfig[]> {
      ensureDir(PRESETS_DIR);
      try {
        const files = fs.readdirSync(PRESETS_DIR);
        const presets: PresetConfig[] = [];

        for (const file of files) {
          if (file.endsWith('.json')) {
            const presetId = file.replace('.json', '');
            const preset = readJson<PresetConfig>(path.join(PRESETS_DIR, file), null);
            if (preset) {
              // Ensure the ID is set correctly from the filename
              preset.id = presetId;

              // If name is missing, use the ID as the name
              if (!preset.name) {
                preset.name = presetId;
              }

              presets.push(preset);
            }
          }
        }
        return presets;
      } catch (err) {
        console.error('Error getting presets:', err);
        return [];
      }
    },

    // Fix existing presets by adding missing name field
    async fixPresets(): Promise<number> {
      ensureDir(PRESETS_DIR);
      try {
        const files = fs.readdirSync(PRESETS_DIR);
        let fixedCount = 0;

        for (const file of files) {
          if (file.endsWith('.json')) {
            const presetId = file.replace('.json', '');
            const presetPath = path.join(PRESETS_DIR, file);
            const preset = readJson<PresetConfig>(presetPath, null);

            if (preset && !preset.name) {
              preset.name = presetId;
              if (writeJson(presetPath, preset)) {
                fixedCount++;
              }
            }
          }
        }

        return fixedCount;
      } catch (err) {
        console.error('Error fixing presets:', err);
        return 0;
      }
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
  };
}

export type ConfigManager = ReturnType<typeof createConfigManager>;