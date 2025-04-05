import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultConfig, appConfig } from '../app.config.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', appConfig.configFileName);

export function createConfigManager() {
  // Config with defaults from app.config.js
  let config = { ...defaultConfig };
  
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
    }
  };
}