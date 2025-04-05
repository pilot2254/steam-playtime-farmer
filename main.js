import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { defaultConfig, appConfig } from './app.config.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, appConfig.configFileName);

// Create Steam client
const client = new SteamUser();

// Config with defaults from app.config.js
let config = { ...defaultConfig };

// Track if we're currently farming
let isFarming = false;
let farmingRL = null;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask a question and get response
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Function to save config
async function saveConfig() {
  try {
    // Make sure we don't save the password if rememberPassword is false
    const configToSave = { ...config };
    if (!configToSave.rememberPassword) {
      configToSave.password = '';
    }
    
    await fs.writeFile(CONFIG_PATH, JSON.stringify(configToSave, null, 2));
    console.log('Configuration saved successfully.');
  } catch (err) {
    console.error('Failed to save configuration:', err);
  }
}

// Function to load config
async function loadConfig() {
  try {
    // Check if file exists first
    if (!existsSync(CONFIG_PATH)) {
      console.log('No configuration file found. Creating a new one.');
      return false;
    }
    
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    const loadedConfig = JSON.parse(data);
    config = { ...config, ...loadedConfig };
    console.log('Configuration loaded successfully.');
    return true;
  } catch (err) {
    console.error('Failed to load configuration:', err);
    return false;
  }
}

// Function to setup account
async function setupAccount() {
  console.log('\n===== Account Setup =====');
  
  config.accountName = await question('Enter your Steam username: ');
  
  const rememberPassword = await question('Remember password? (yes/no): ');
  config.rememberPassword = rememberPassword.toLowerCase().startsWith('y');
  
  if (config.rememberPassword) {
    config.password = await question('Enter your Steam password: ');
  } else {
    // Clear password if not remembering
    config.password = '';
  }
  
  const has2FA = await question('Do you have Steam Guard Mobile Authenticator? (yes/no): ');
  
  if (has2FA.toLowerCase().startsWith('y')) {
    console.log('\nShared Secret Info:');
    console.log('- This allows automatic 2FA code generation');
    console.log('- Leave blank if you prefer to enter codes manually');
    console.log('- Advanced users can extract this from their authenticator\n');
    
    config.sharedSecret = await question('Enter your shared secret (or leave blank): ');
  } else {
    config.sharedSecret = '';
  }
  
  await saveConfig();
  console.log('Account setup complete!');
}

// Function to manage games
async function manageGames() {
  console.log('\n===== Game Management =====');
  console.log('Current games:');
  
  if (config.games.length === 0) {
    console.log('No games configured.');
  } else {
    config.games.forEach((game, index) => {
      console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`);
    });
  }
  
  console.log('\nOptions:');
  console.log('1. Add game');
  console.log('2. Remove game');
  console.log('3. Return to main menu');
  
  const choice = await question('\nEnter your choice (1-3): ');
  
  switch (choice) {
    case '1':
      const appIdInput = await question('Enter game AppID (number): ');
      const appId = parseInt(appIdInput);
      
      if (isNaN(appId)) {
        console.log('Invalid AppID. Please enter a number.');
        return manageGames();
      }
      
      const name = await question('Enter game name (optional): ');
      config.games.push({ appId, name: name || `Game ${appId}` });
      await saveConfig();
      console.log(`Game ${appId} added successfully.`);
      return manageGames();
    
    case '2':
      if (config.games.length === 0) {
        console.log('No games to remove.');
        return manageGames();
      }
      
      const indexInput = await question('Enter the number of the game to remove: ');
      const idx = parseInt(indexInput) - 1;
      
      if (idx >= 0 && idx < config.games.length) {
        const removed = config.games.splice(idx, 1)[0];
        await saveConfig();
        console.log(`Game ${removed.name} (${removed.appId}) removed successfully.`);
      } else {
        console.log('Invalid game number.');
      }
      return manageGames();
    
    case '3':
      return mainMenu();
    
    default:
      console.log('Invalid choice. Please enter 1, 2, or 3.');
      return manageGames();
  }
}

// Function to start farming
async function startFarming() {
  if (config.games.length === 0) {
    console.log('No games configured. Please add games first.');
    return mainMenu();
  }
  
  // Check if already farming
  if (isFarming) {
    console.log('Already farming playtime. Please stop the current session first.');
    return mainMenu();
  }
  
  console.log('\n===== Starting Playtime Farming =====');
  
  const loginDetails = {
    accountName: config.accountName,
    rememberPassword: true
  };
  
  if (config.rememberPassword && config.password) {
    loginDetails.password = config.password;
  } else {
    loginDetails.password = await question('Enter your Steam password: ');
  }
  
  // If we have a shared secret, generate the auth code
  if (config.sharedSecret) {
    try {
      loginDetails.twoFactorCode = SteamTotp.generateAuthCode(config.sharedSecret);
      console.log('Generated 2FA code automatically.');
    } catch (err) {
      console.log('Failed to generate 2FA code. You may need to enter it manually.');
    }
  }
  
  console.log('Logging in to Steam...');
  client.logOn(loginDetails);
  
  // Set up event handlers
  client.on('loggedOn', () => {
    console.log(`Successfully logged in as ${config.accountName}`);
    
    // Get game IDs to play
    const gameIds = config.games.map(game => game.appId);
    
    console.log(`\nNow farming playtime for ${config.games.length} games:`);
    config.games.forEach(game => console.log(`- ${game.name} (${game.appId})`));
    
    // Start playing the games
    client.gamesPlayed(gameIds);
    isFarming = true;
    
    console.log('\nPlaytime farming is now active.');
    console.log('Type "status" to check current status.');
    console.log('Type "stop" to stop farming and return to menu.');
    
    // Create a new readline interface for farming mode
    farmingRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    farmingRL.on('line', (input) => {
      const command = input.toLowerCase().trim();
      
      if (command === 'stop') {
        stopFarming();
        farmingRL.close();
        farmingRL = null;
        mainMenu();
      } else if (command === 'status') {
        console.log(`\nCurrently farming ${config.games.length} games:`);
        config.games.forEach(game => console.log(`- ${game.name} (${game.appId})`));
        console.log('\nType "stop" to stop farming and return to menu.');
      } else {
        console.log('Unknown command. Type "status" to check status or "stop" to stop farming.');
      }
    });
  });
  
  // Handle Steam Guard (if shared secret wasn't provided or is invalid)
  client.on('steamGuard', async (domain, callback) => {
    const domainText = domain ? ` for domain ${domain}` : '';
    const code = await question(`Steam Guard code needed${domainText}: `);
    callback(code);
  });
  
  // Handle errors
  client.on('error', (err) => {
    console.error('Steam client error:', err);
    isFarming = false;
    if (farmingRL) {
      farmingRL.close();
      farmingRL = null;
    }
    mainMenu();
  });
  
  // Handle disconnects
  client.on('disconnected', (eresult, msg) => {
    console.log(`Disconnected from Steam: ${msg || eresult}`);
    isFarming = false;
    if (farmingRL) {
      farmingRL.close();
      farmingRL = null;
    }
    mainMenu();
  });
}

// Function to stop farming
function stopFarming() {
  if (isFarming) {
    console.log('Stopping playtime farming...');
    client.gamesPlayed([]);
    client.logOff();
    isFarming = false;
  }
}

// Main menu function
async function mainMenu() {
  console.log(`\n===== ${appConfig.appName} =====`);
  console.log('1. Setup Account');
  console.log('2. Manage Games');
  console.log('3. Start Farming');
  console.log('4. Exit');
  
  const choice = await question('\nEnter your choice (1-4): ');
  
  switch (choice) {
    case '1':
      await setupAccount();
      return mainMenu();
    
    case '2':
      await manageGames();
      return;
    
    case '3':
      await startFarming();
      return;
    
    case '4':
      console.log('Exiting...');
      stopFarming();
      rl.close();
      process.exit(0);
    
    default:
      console.log('Invalid choice. Please enter a number between 1 and 4.');
      return mainMenu();
  }
}

// Start the application
async function start() {
  console.log(`===== ${appConfig.appName} v${appConfig.version} =====`);
  
  // Try to load config
  const configLoaded = await loadConfig();
  
  if (configLoaded && config.accountName) {
    console.log(`Loaded configuration for account: ${config.accountName}`);
    if (config.games.length > 0) {
      console.log(`Found ${config.games.length} configured games.`);
    }
  }
  
  await mainMenu();
}

// Handle application exit
process.on('SIGINT', () => {
  console.log('\nExiting application...');
  stopFarming();
  process.exit(0);
});

// Start the application
start().catch(err => {
  console.error('Application error:', err);
  process.exit(1);
});