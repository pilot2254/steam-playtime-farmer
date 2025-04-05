import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create Steam client
const client = new SteamUser();

// Default config
let config = {
  accountName: '',
  sharedSecret: '',
  games: [],
  rememberPassword: false,
  password: ''
};

// Function to ask a question and get response
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Function to save config
async function saveConfig() {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Configuration saved successfully.');
  } catch (err) {
    console.error('Failed to save configuration:', err);
  }
}

// Function to load config
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    const loadedConfig = JSON.parse(data);
    config = { ...config, ...loadedConfig };
    console.log('Configuration loaded successfully.');
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No configuration file found. Creating a new one.');
    } else {
      console.error('Failed to load configuration:', err);
    }
    return false;
  }
}

// Function to setup account
async function setupAccount() {
  config.accountName = await question('Enter your Steam username: ');
  
  const rememberPassword = await question('Remember password? (yes/no): ');
  config.rememberPassword = rememberPassword.toLowerCase() === 'yes';
  
  if (config.rememberPassword) {
    config.password = await question('Enter your Steam password: ');
  }
  
  const has2FA = await question('Do you have Steam Guard Mobile Authenticator? (yes/no): ');
  
  if (has2FA.toLowerCase() === 'yes') {
    config.sharedSecret = await question('Enter your shared secret (leave blank if you don\'t have it): ');
  }
  
  await saveConfig();
}

// Function to manage games
async function manageGames() {
  console.log('\nCurrent games:');
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
      const appId = await question('Enter game AppID: ');
      const name = await question('Enter game name (optional): ');
      config.games.push({ appId: parseInt(appId), name: name || `Game ${appId}` });
      await saveConfig();
      return manageGames();
    
    case '2':
      if (config.games.length === 0) {
        console.log('No games to remove.');
        return manageGames();
      }
      const index = await question('Enter the number of the game to remove: ');
      const idx = parseInt(index) - 1;
      if (idx >= 0 && idx < config.games.length) {
        config.games.splice(idx, 1);
        await saveConfig();
        console.log('Game removed successfully.');
      } else {
        console.log('Invalid game number.');
      }
      return manageGames();
    
    case '3':
      return mainMenu();
    
    default:
      console.log('Invalid choice.');
      return manageGames();
  }
}

// Function to start farming
async function startFarming() {
  if (config.games.length === 0) {
    console.log('No games configured. Please add games first.');
    return mainMenu();
  }
  
  console.log('Starting playtime farming...');
  
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
    loginDetails.twoFactorCode = SteamTotp.generateAuthCode(config.sharedSecret);
  }
  
  client.logOn(loginDetails);
  
  client.on('loggedOn', () => {
    console.log(`Successfully logged in as ${config.accountName}`);
    
    // Get game IDs to play
    const gameIds = config.games.map(game => game.appId);
    
    console.log(`Now farming playtime for ${config.games.length} games:`);
    config.games.forEach(game => console.log(`- ${game.name} (${game.appId})`));
    
    // Start playing the games
    client.gamesPlayed(gameIds);
    
    console.log('\nPlaytime farming is now active. Press Ctrl+C to stop or type "exit" to return to menu.');
    
    // Allow user to exit farming mode
    const farmingRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    farmingRL.on('line', (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('Stopping playtime farming...');
        client.gamesPlayed([]);
        client.logOff();
        farmingRL.close();
        mainMenu();
      }
    });
  });
  
  // Handle Steam Guard (if shared secret wasn't provided or is invalid)
  client.on('steamGuard', (domain, callback) => {
    const domainText = domain ? ` for domain ${domain}` : '';
    question(`Steam Guard code needed${domainText}: `).then(code => {
      callback(code);
    });
  });
  
  // Handle errors
  client.on('error', (err) => {
    console.error('Steam client error:', err);
    mainMenu();
  });
}

// Main menu function
async function mainMenu() {
  console.log('\n===== Steam Playtime Tracker =====');
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
      rl.close();
      process.exit(0);
    
    default:
      console.log('Invalid choice.');
      return mainMenu();
  }
}

// Start the application
async function start() {
  console.log('Steam Playtime Tracker');
  
  // Try to load config
  const configLoaded = await loadConfig();
  
  if (configLoaded && config.accountName) {
    console.log(`Loaded configuration for account: ${config.accountName}`);
  }
  
  await mainMenu();
}

// Handle application exit
process.on('SIGINT', () => {
  console.log('\nExiting application...');
  if (client.steamID) {
    client.gamesPlayed([]);
    client.logOff();
  }
  process.exit(0);
});

// Start the application
start();
