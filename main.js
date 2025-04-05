import { createSteamClient } from './modules/steam-client.js';
import { createConfigManager } from './modules/config-manager.js';
import { createUserInterface } from './modules/user-interface.js';
import { appConfig } from './app.config.js';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure presets directory exists
const PRESETS_DIR = path.join(__dirname, 'presets');
if (!existsSync(PRESETS_DIR)) {
  mkdirSync(PRESETS_DIR, { recursive: true });
}

// Initialize modules
const configManager = createConfigManager();
const steamClient = createSteamClient();
const ui = createUserInterface(configManager, steamClient);

// Start the application
async function start() {
  console.log(`===== ${appConfig.appName} v${appConfig.version} =====`);
  
  // Load configuration
  await configManager.load();
  
  // Start the UI
  await ui.showMainMenu();
}

// Handle application exit
process.on('SIGINT', () => {
  console.log('\nExiting application...');
  steamClient.stopFarming();
  process.exit(0);
});

// Start the application
start().catch(err => {
  console.error('Application error:', err);
  process.exit(1);
});