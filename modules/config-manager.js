import fs from 'fs/promises';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultConfig, appConfig } from '../app.config.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', appConfig.configFileName);
const PRESETS_DIR = path.join(__dirname, '..', 'presets');

// Ensure presets directory exists
if (!existsSync(PRESETS_DIR)) {
  mkdirSync(PRESETS_DIR, { recursive: true });
}

export function createConfigManager() {
  // Config with defaults from app.config.js
  let config = { ...defaultConfig };
  // Current preset name (null if using default config)
  let currentPreset = null;
  
  return {
    // Get the current config
    get() {
      return config;
    },
    
    // Save config to file
    async save() {
      try {
        // Make sure we don't save the password if rememberPassword is false
        const configToSave = { ...config };
        if (!configToSave.rememberPassword) {
          configToSave.password = '';
        }
        
        await fs.writeFile(CONFIG_PATH, JSON.stringify(configToSave, null, 2));
        console.log('Configuration saved successfully.');
        return true;
      } catch (err) {
        console.error('Failed to save configuration:', err);
        return false;
      }
    },
    
    // Load config from file
    async load() {
      try {
        // Check if file exists first
        if (!existsSync(CONFIG_PATH)) {
          console.log('No configuration file found. Creating a new one.');
          return false;
        }
        
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const loadedConfig = JSON.parse(data);
        config = { ...config, ...loadedConfig };
        
        if (config.accountName) {
          console.log(`Loaded configuration for account: ${config.accountName}`);
          if (config.games.length > 0) {
            console.log(`Found ${config.games.length} configured games.`);
          }
        }
        
        return true;
      } catch (err) {
        console.error('Failed to load configuration:', err);
        return false;
      }
    },
    
    // Add a game to the config
    async addGame(appId, name) {
      if (!appId || isNaN(appId)) return false;
      
      // Check if game already exists
      const existingGame = config.games.find(game => game.appId === appId);
      if (existingGame) {
        console.log(`Game with AppID ${appId} already exists as "${existingGame.name}".`);
        return false;
      }
      
      config.games.push({ appId, name: name || `Game ${appId}` });
      await this.save();
      return true;
    },
    
    // Remove a game from the config
    async removeGame(index) {
      if (index < 0 || index >= config.games.length) return false;
      
      const removed = config.games.splice(index, 1)[0];
      await this.save();
      return removed;
    },
    
    // Update account settings
    async updateAccount(accountName, password, rememberPassword, sharedSecret) {
      config.accountName = accountName;
      config.rememberPassword = rememberPassword;
      
      if (rememberPassword) {
        config.password = password;
      } else {
        config.password = '';
      }
      
      if (sharedSecret !== undefined) {
        config.sharedSecret = sharedSecret;
      }
      
      await this.save();
      return true;
    },
    
    // Get list of available presets
    async getPresets() {
      try {
        const files = await fs.readdir(PRESETS_DIR);
        const presetFiles = files.filter(file => file.endsWith('.json'));
        
        const presets = [];
        
        for (const file of presetFiles) {
          try {
            const data = await fs.readFile(path.join(PRESETS_DIR, file), 'utf8');
            const preset = JSON.parse(data);
            presets.push({
              id: file.replace('.json', ''),
              name: preset.name || file.replace('.json', ''),
              accountName: preset.accountName || 'Unknown'
            });
          } catch (err) {
            console.error(`Error reading preset ${file}:`, err);
          }
        }
        
        return presets;
      } catch (err) {
        console.error('Error listing presets:', err);
        return [];
      }
    },
    
    // Save current config as a preset
    async saveAsPreset(presetId, presetName) {
      if (!presetId || !presetName) return false;
      
      try {
        // Create a copy of the current config
        const presetConfig = { 
          ...config,
          name: presetName
        };
        
        const presetPath = path.join(PRESETS_DIR, `${presetId}.json`);
        await fs.writeFile(presetPath, JSON.stringify(presetConfig, null, 2));
        
        currentPreset = presetId;
        console.log(`Saved preset "${presetName}" as ${presetId}.json`);
        return true;
      } catch (err) {
        console.error('Failed to save preset:', err);
        return false;
      }
    },
    
    // Save current user-config.json as a preset
    async saveCurrentConfigAsPreset(presetId, presetName) {
      if (!presetId || !presetName) return false;
      
      try {
        // Read the current user-config.json
        if (!existsSync(CONFIG_PATH)) {
          console.error('No configuration file found.');
          return false;
        }
        
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const currentConfig = JSON.parse(data);
        
        // Add the preset name
        currentConfig.name = presetName;
        
        const presetPath = path.join(PRESETS_DIR, `${presetId}.json`);
        await fs.writeFile(presetPath, JSON.stringify(currentConfig, null, 2));
        
        currentPreset = presetId;
        console.log(`Saved current config as preset "${presetName}" (${presetId}.json)`);
        return true;
      } catch (err) {
        console.error('Failed to save current config as preset:', err);
        return false;
      }
    },
    
    // Load a preset
    async loadPreset(presetId) {
      try {
        const presetPath = path.join(PRESETS_DIR, `${presetId}.json`);
        
        if (!existsSync(presetPath)) {
          console.error(`Preset ${presetId}.json not found.`);
          return false;
        }
        
        const data = await fs.readFile(presetPath, 'utf8');
        const presetConfig = JSON.parse(data);
        
        // Update the current config with the preset
        config = { ...defaultConfig, ...presetConfig };
        currentPreset = presetId;
        
        // Save to the main config file as well
        await this.save();
        
        console.log(`Loaded preset: ${config.name}`);
        console.log(`Account: ${config.accountName}`);
        console.log(`Games: ${config.games.length}`);
        
        return true;
      } catch (err) {
        console.error('Failed to load preset:', err);
        return false;
      }
    },
    
    // Delete a preset
    async deletePreset(presetId) {
      try {
        const presetPath = path.join(PRESETS_DIR, `${presetId}.json`);
        
        if (!existsSync(presetPath)) {
          console.error(`Preset ${presetId}.json not found.`);
          return false;
        }
        
        await fs.unlink(presetPath);
        
        // If we deleted the current preset, reset the current preset
        if (currentPreset === presetId) {
          currentPreset = null;
        }
        
        console.log(`Deleted preset: ${presetId}.json`);
        return true;
      } catch (err) {
        console.error('Failed to delete preset:', err);
        return false;
      }
    },
    
    // Get a specific preset
    async getPreset(presetId) {
      try {
        const presetPath = path.join(PRESETS_DIR, `${presetId}.json`);
        
        if (!existsSync(presetPath)) {
          console.error(`Preset ${presetId}.json not found.`);
          return null;
        }
        
        const data = await fs.readFile(presetPath, 'utf8');
        return JSON.parse(data);
      } catch (err) {
        console.error(`Failed to get preset ${presetId}:`, err);
        return null;
      }
    },
    
    // Update a preset
    async updatePreset(presetId, updatedPreset) {
      try {
        const presetPath = path.join(PRESETS_DIR, `${presetId}.json`);
        
        if (!existsSync(presetPath)) {
          console.error(`Preset ${presetId}.json not found.`);
          return false;
        }
        
        await fs.writeFile(presetPath, JSON.stringify(updatedPreset, null, 2));
        
        console.log(`Updated preset: ${presetId}.json`);
        
        // If this is the current preset, update the current config
        if (currentPreset === presetId) {
          config = { ...defaultConfig, ...updatedPreset };
          await this.save();
        }
        
        return true;
      } catch (err) {
        console.error(`Failed to update preset ${presetId}:`, err);
        return false;
      }
    },
    
    // Get the current preset ID
    getCurrentPreset() {
      return currentPreset;
    }
  };
}