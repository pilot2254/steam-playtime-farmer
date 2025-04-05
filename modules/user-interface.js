import readline from 'readline';
import { appConfig } from '../app.config.js';

export function createUserInterface(configManager, steamClient) {
  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Function to ask a question and get response
  function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
  }
  
  // Function to setup account
  async function setupAccount() {
    console.log('\n===== Account Setup =====');
    
    const accountName = await question('Enter your Steam username: ');
    
    const rememberPassword = await question('Remember password? (yes/no): ');
    const shouldRemember = rememberPassword.toLowerCase().startsWith('y');
    
    const password = await question('Enter your Steam password: ');
    
    const has2FA = await question('Do you have Steam Guard Mobile Authenticator? (yes/no): ');
    
    let sharedSecret = '';
    if (has2FA.toLowerCase().startsWith('y')) {
      console.log('\nShared Secret Info:');
      console.log('- This allows automatic 2FA code generation');
      console.log('- Leave blank if you prefer to enter codes manually');
      console.log('- Advanced users can extract this from their authenticator');
      console.log('- Note: Shared secret is typically 20+ characters long\n');
      
      sharedSecret = await question('Enter your shared secret (or leave blank): ');
    }
    
    await configManager.updateAccount(accountName, password, shouldRemember, sharedSecret);
    console.log('Account setup complete!');
  }
  
  // Function to manage games
  async function manageGames() {
    const config = configManager.get();
    
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
        await addGame();
        return manageGames();
      
      case '2':
        if (config.games.length === 0) {
          console.log('No games to remove.');
          return manageGames();
        }
        
        const indexInput = await question('Enter the number of the game to remove: ');
        const idx = parseInt(indexInput) - 1;
        
        const removed = await configManager.removeGame(idx);
        if (removed) {
          console.log(`Game ${removed.name} (${removed.appId}) removed successfully.`);
        } else {
          console.log('Invalid game number.');
        }
        return manageGames();
      
      case '3':
        return showMainMenu();
      
      default:
        console.log('Invalid choice. Please enter 1, 2, or 3.');
        return manageGames();
    }
  }
  
  // Function to add a game
  async function addGame() {
    const appIdInput = await question('Enter game AppID (number): ');
    const appId = parseInt(appIdInput);
    
    if (isNaN(appId)) {
      console.log('Invalid AppID. Please enter a number.');
      return false;
    }
    
    const name = await question('Enter game name (optional): ');
    const added = await configManager.addGame(appId, name || `Game ${appId}`);
    
    if (added) {
      console.log(`Game ${appId} added successfully.`);
    }
    
    return added;
  }
  
  // Function to edit a preset
  async function editPreset(presetId) {
    const preset = await configManager.getPreset(presetId);
    
    if (!preset) {
      console.log(`Preset ${presetId} not found.`);
      return false;
    }
    
    console.log(`\n===== Editing Preset: ${preset.name} =====`);
    console.log('1. Edit preset name');
    console.log('2. Edit games');
    console.log('3. Return to preset management');
    
    const choice = await question('\nEnter your choice (1-3): ');
    
    switch (choice) {
      case '1':
        // Edit preset name
        const newName = await question(`Enter new name for preset (current: ${preset.name}): `);
        
        if (newName && newName !== preset.name) {
          preset.name = newName;
          await configManager.updatePreset(presetId, preset);
          console.log(`Preset name updated to "${newName}".`);
        }
        return editPreset(presetId);
      
      case '2':
        // Edit games
        return editPresetGames(presetId, preset);
      
      case '3':
        return true;
      
      default:
        console.log('Invalid choice. Please enter a number between 1 and 3.');
        return editPreset(presetId);
    }
  }
  
  // Function to edit games in a preset
  async function editPresetGames(presetId, preset) {
    console.log('\n===== Edit Games in Preset =====');
    console.log('Current games:');
    
    if (!preset.games || preset.games.length === 0) {
      console.log('No games in this preset.');
    } else {
      preset.games.forEach((game, index) => {
        console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`);
      });
    }
    
    console.log('\nOptions:');
    console.log('1. Add game');
    console.log('2. Remove game');
    console.log('3. Edit game');
    console.log('4. Return to preset editing');
    
    const choice = await question('\nEnter your choice (1-4): ');
    
    switch (choice) {
      case '1':
        // Add game
        const appIdInput = await question('Enter game AppID (number): ');
        const appId = parseInt(appIdInput);
        
        if (isNaN(appId)) {
          console.log('Invalid AppID. Please enter a number.');
          return editPresetGames(presetId, preset);
        }
        
        // Check if game already exists
        const existingGame = preset.games.find(game => game.appId === appId);
        if (existingGame) {
          console.log(`Game with AppID ${appId} already exists as "${existingGame.name}".`);
          return editPresetGames(presetId, preset);
        }
        
        const name = await question('Enter game name (optional): ');
        preset.games.push({ appId, name: name || `Game ${appId}` });
        
        await configManager.updatePreset(presetId, preset);
        console.log(`Game ${appId} added to preset.`);
        return editPresetGames(presetId, preset);
      
      case '2':
        // Remove game
        if (!preset.games || preset.games.length === 0) {
          console.log('No games to remove.');
          return editPresetGames(presetId, preset);
        }
        
        const removeIndex = await question('Enter the number of the game to remove: ');
        const removeIdx = parseInt(removeIndex) - 1;
        
        if (removeIdx >= 0 && removeIdx < preset.games.length) {
          const removed = preset.games.splice(removeIdx, 1)[0];
          await configManager.updatePreset(presetId, preset);
          console.log(`Game ${removed.name} (${removed.appId}) removed from preset.`);
        } else {
          console.log('Invalid game number.');
        }
        return editPresetGames(presetId, preset);
      
      case '3':
        // Edit game
        if (!preset.games || preset.games.length === 0) {
          console.log('No games to edit.');
          return editPresetGames(presetId, preset);
        }
        
        const editIndex = await question('Enter the number of the game to edit: ');
        const editIdx = parseInt(editIndex) - 1;
        
        if (editIdx >= 0 && editIdx < preset.games.length) {
          const game = preset.games[editIdx];
          
          console.log(`Editing game: ${game.name} (${game.appId})`);
          
          const newAppIdInput = await question(`Enter new AppID (current: ${game.appId}, leave blank to keep): `);
          if (newAppIdInput) {
            const newAppId = parseInt(newAppIdInput);
            if (!isNaN(newAppId)) {
              game.appId = newAppId;
            } else {
              console.log('Invalid AppID. Keeping current value.');
            }
          }
          
          const newName = await question(`Enter new name (current: ${game.name}, leave blank to keep): `);
          if (newName) {
            game.name = newName;
          }
          
          await configManager.updatePreset(presetId, preset);
          console.log(`Game updated: ${game.name} (${game.appId})`);
        } else {
          console.log('Invalid game number.');
        }
        return editPresetGames(presetId, preset);
      
      case '4':
        return editPreset(presetId);
      
      default:
        console.log('Invalid choice. Please enter a number between 1 and 4.');
        return editPresetGames(presetId, preset);
    }
  }
  
  // Function to manage presets
  async function managePresets() {
    console.log('\n===== Preset Management =====');
    
    // Get list of available presets
    const presets = await configManager.getPresets();
    const currentPreset = configManager.getCurrentPreset();
    
    console.log('Available presets:');
    if (presets.length === 0) {
      console.log('No presets found.');
    } else {
      presets.forEach((preset, index) => {
        const current = preset.id === currentPreset ? ' (current)' : '';
        console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current}`);
      });
    }
    
    console.log('\nOptions:');
    console.log('1. Create new preset');
    console.log('2. Save current config as preset');
    console.log('3. Load preset');
    console.log('4. Edit preset');
    console.log('5. Delete preset');
    console.log('6. Return to main menu');
    
    const choice = await question('\nEnter your choice (1-6): ');
    
    switch (choice) {
      case '1':
        // Create new preset
        const presetId = await question('Enter preset ID (letters, numbers, hyphens only): ');
        
        if (!/^[a-zA-Z0-9-]+$/.test(presetId)) {
          console.log('Invalid preset ID. Use only letters, numbers, and hyphens.');
          return managePresets();
        }
        
        const presetName = await question('Enter preset name: ');
        
        if (!presetName) {
          console.log('Preset name cannot be empty.');
          return managePresets();
        }
        
        await configManager.saveAsPreset(presetId, presetName);
        return managePresets();
      
      case '2':
        // Save current config as preset
        const currentConfigPresetId = await question('Enter preset ID (letters, numbers, hyphens only): ');
        
        if (!/^[a-zA-Z0-9-]+$/.test(currentConfigPresetId)) {
          console.log('Invalid preset ID. Use only letters, numbers, and hyphens.');
          return managePresets();
        }
        
        const currentConfigPresetName = await question('Enter preset name: ');
        
        if (!currentConfigPresetName) {
          console.log('Preset name cannot be empty.');
          return managePresets();
        }
        
        await configManager.saveCurrentConfigAsPreset(currentConfigPresetId, currentConfigPresetName);
        return managePresets();
      
      case '3':
        // Load preset
        if (presets.length === 0) {
          console.log('No presets available to load.');
          return managePresets();
        }
        
        const loadIndex = await question('Enter the number of the preset to load: ');
        const loadIdx = parseInt(loadIndex) - 1;
        
        if (loadIdx >= 0 && loadIdx < presets.length) {
          // If we're currently farming, we need to stop first
          if (steamClient.isFarming()) {
            console.log('Stopping current farming session to switch presets...');
            steamClient.stopFarming();
          }
          
          const loaded = await configManager.loadPreset(presets[loadIdx].id);
          
          if (loaded) {
            console.log(`Preset "${presets[loadIdx].name}" loaded successfully.`);
            console.log('You will need to start farming again with the new preset.');
          }
        } else {
          console.log('Invalid preset number.');
        }
        return managePresets();
      
      case '4':
        // Edit preset
        if (presets.length === 0) {
          console.log('No presets available to edit.');
          return managePresets();
        }
        
        const editIndex = await question('Enter the number of the preset to edit: ');
        const editIdx = parseInt(editIndex) - 1;
        
        if (editIdx >= 0 && editIdx < presets.length) {
          await editPreset(presets[editIdx].id);
        } else {
          console.log('Invalid preset number.');
        }
        return managePresets();
      
      case '5':
        // Delete preset
        if (presets.length === 0) {
          console.log('No presets available to delete.');
          return managePresets();
        }
        
        const deleteIndex = await question('Enter the number of the preset to delete: ');
        const deleteIdx = parseInt(deleteIndex) - 1;
        
        if (deleteIdx >= 0 && deleteIdx < presets.length) {
          const confirm = await question(`Are you sure you want to delete preset "${presets[deleteIdx].name}"? (yes/no): `);
          
          if (confirm.toLowerCase().startsWith('y')) {
            await configManager.deletePreset(presets[deleteIdx].id);
          }
        } else {
          console.log('Invalid preset number.');
        }
        return managePresets();
      
      case '6':
        return showMainMenu();
      
      default:
        console.log('Invalid choice. Please enter a number between 1 and 6.');
        return managePresets();
    }
  }
  
  // Function to start farming
  async function startFarming() {
    const config = configManager.get();
    
    if (config.games.length === 0) {
      console.log('No games configured. Please add games first.');
      return showMainMenu();
    }
    
    // Check if already farming
    if (steamClient.isFarming()) {
      console.log('Already farming playtime. Please stop the current session first.');
      return showMainMenu();
    }
    
    console.log('\n===== Starting Playtime Farming =====');
    
    // Set up Steam Guard handler (only needed during login)
    const removeGuardHandler = steamClient.on('steamGuard', async (domain, callback, lastCodeWrong) => {
      const domainText = domain ? ` for domain ${domain}` : '';
      const wrongText = lastCodeWrong ? ' (previous code was wrong)' : '';
      const code = await question(`Steam Guard code needed${domainText}${wrongText}: `);
      callback(code);
    });
    
    // Set up logged on handler
    const removeLoggedOnHandler = steamClient.on('loggedOn', () => {
      // Clean up the Steam Guard handler after successful login
      removeGuardHandler();
      
      const gameIds = config.games.map(game => game.appId);
      steamClient.startFarming(gameIds);
      showFarmingInterface();
    });
    
    // Set up error and disconnect handlers with proper cleanup
    const removeErrorHandler = steamClient.on('error', () => {
      // Clean up all handlers
      removeGuardHandler();
      removeLoggedOnHandler();
      removeDisconnectHandler();
      
      showMainMenu();
    });
    
    const removeDisconnectHandler = steamClient.on('disconnected', () => {
      // Clean up all handlers
      removeGuardHandler();
      removeLoggedOnHandler();
      removeErrorHandler();
      
      showMainMenu();
    });
    
    // Login to Steam
    const password = config.rememberPassword && config.password 
      ? config.password 
      : await question('Enter your Steam password: ');
    
    steamClient.login(config.accountName, password, config.sharedSecret);
  }
  
  // Function to show farming interface
  function showFarmingInterface() {
    const config = configManager.get();
    
    console.log('\nPlaytime farming is now active.');
    console.log('Type "status" to check current status.');
    console.log('Type "add" to add a new game while farming.');
    console.log('Type "remove" to remove a game while farming.');
    console.log('Type "stop" to stop farming and return to menu.');
    console.log('Type "help" to see all available commands.');
    
    // Create a new readline interface for farming mode
    const farmingRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    farmingRL.on('line', async (input) => {
      const command = input.toLowerCase().trim();
      
      if (command === 'stop') {
        steamClient.stopFarming();
        farmingRL.close();
        showMainMenu();
      } else if (command === 'status') {
        console.log(`\nCurrently farming ${config.games.length} games:`);
        config.games.forEach(game => console.log(`- ${game.name} (${game.appId})`));
        console.log('\nType "help" to see all available commands.');
      } else if (command === 'debug') {
        const status = steamClient.getStatus();
        console.log('\nSteam Client Status:');
        console.log('- Connected:', status.connected);
        console.log('- Logged On:', status.loggedOn);
        console.log('- Steam ID:', status.steamID);
        console.log('- Current games:', status.playingAppIds);
      } else if (command === 'add') {
        console.log('\n===== Add Game While Farming =====');
        const appIdInput = await question('Enter game AppID (number): ');
        const appId = parseInt(appIdInput);
        
        if (isNaN(appId)) {
          console.log('Invalid AppID. Please enter a number.');
          return;
        }
        
        const name = await question('Enter game name (optional): ');
        const added = await configManager.addGame(appId, name || `Game ${appId}`);
        
        if (added) {
          steamClient.addGame(appId);
          console.log(`Game ${appId} added successfully and is now being farmed.`);
        }
      } else if (command === 'remove') {
        console.log('\n===== Remove Game While Farming =====');
        console.log('Current games:');
        
        if (config.games.length === 0) {
          console.log('No games configured.');
          return;
        }
        
        config.games.forEach((game, index) => {
          console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`);
        });
        
        const indexInput = await question('Enter the number of the game to remove: ');
        const idx = parseInt(indexInput) - 1;
        
        if (idx >= 0 && idx < config.games.length) {
          const appId = config.games[idx].appId;
          const removed = await configManager.removeGame(idx);
          
          if (removed) {
            steamClient.removeGame(appId);
            console.log(`Game ${removed.name} (${removed.appId}) removed successfully.`);
          }
        } else {
          console.log('Invalid game number.');
        }
      } else if (command === 'help') {
        console.log('\nAvailable commands:');
        console.log('- status: Show currently farming games');
        console.log('- add: Add a new game to farm without stopping');
        console.log('- remove: Remove a game from farming without stopping');
        console.log('- debug: Show Steam client status');
        console.log('- stop: Stop farming and return to main menu');
        console.log('- help: Show this help message');
      } else {
        console.log('Unknown command. Type "help" to see available commands.');
      }
    });
  }
  
  // Main menu function
  async function showMainMenu() {
    console.log(`\n===== ${appConfig.appName} =====`);
    console.log('1. Setup Account');
    console.log('2. Manage Games');
    console.log('3. Start Farming');
    console.log('4. Manage Presets');
    console.log('5. Exit');
    
    const choice = await question('\nEnter your choice (1-5): ');
    
    switch (choice) {
      case '1':
        await setupAccount();
        return showMainMenu();
      
      case '2':
        await manageGames();
        return;
      
      case '3':
        await startFarming();
        return;
      
      case '4':
        await managePresets();
        return;
      
      case '5':
        console.log('Exiting...');
        steamClient.stopFarming();
        rl.close();
        process.exit(0);
      
      default:
        console.log('Invalid choice. Please enter a number between 1 and 5.');
        return showMainMenu();
    }
  }
  
  return {
    showMainMenu,
    question,
    close: () => rl.close()
  };
}