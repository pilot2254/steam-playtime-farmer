// User Interface Module
// Handles basic user interactions with a simplified interface
import readline from 'readline';
import type { ConfigManager } from './config-manager.js';
import type { SteamClient } from './steam-client.js';

// Creates a user interface for the application
export function createUserInterface(configManager: ConfigManager, steamClient: SteamClient) {
  // Create readline interface - shared for all interactions
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // State tracking
  let isFarming = false;

  // Helper functions for UI operations

  // Clear the console screen
  const clearConsole = (): void => {
    process.stdout.write('\x1Bc');
    if (process.platform === 'win32') console.clear();
  };

  // Display a question and get response
  const question = (query: string): Promise<string> => 
    new Promise((resolve) => rl.question(query, resolve));

  // Wait for user to press Enter
  const waitForEnter = async (msg = 'Press Enter to continue...'): Promise<void> => {
    await question(msg);
  };

  // Exit the application cleanly
  const exitApplication = (): void => {
    console.log('\nExiting application...');
    steamClient.stopFarming();
    rl.close();
    process.exit(0);
  };

  // Setup event handlers for Steam farming
  function setupFarmingEventHandlers(): void {
    // Handle Steam Guard authentication requests
    const removeGuardHandler = steamClient.on('steamGuard', async (domain, callback, lastCodeWrong) => {
      const domainText = domain ? ` for domain ${domain}` : '';
      const wrongText = lastCodeWrong ? ' (previous code was wrong)' : '';
      const code = await question(`Steam Guard code needed${domainText}${wrongText}: `);
      callback(code);
    });

    // Handle successful login
    steamClient.on('loggedOn', () => {
      removeGuardHandler(); // No longer need the guard handler
      const gameIds = configManager.get().games.map((game) => game.appId);
      steamClient.startFarming(gameIds);
      isFarming = true;
      showFarmingInterface();
    });

    // Handle login errors with better password error detection
    steamClient.on('error', (err) => {
      if (err.eresult === 5 || err.message?.includes('password') || err.message?.includes('credentials')) {
        console.error('\nError: Incorrect password or invalid credentials');
        console.log('Please check your password and try again.');
      } else {
        console.error('Steam error:', err.message || 'Unknown error');
      }

      // Wait a moment before returning to menu so user can read the error
      setTimeout(() => {
        isFarming = false;
        showMainMenu();
      }, 3000);
    });

    // Handle disconnection events
    steamClient.on('disconnected', () => 
      console.log('Disconnected from Steam. Attempting to reconnect...'));

    // Handle reconnection attempts
    steamClient.on('reconnecting', (attempt, maxAttempts) =>
      console.log(`Reconnecting to Steam (${attempt}/${maxAttempts})...`),
    );

    // Handle successful reconnection
    steamClient.on('reconnected', () => {
      console.log('Reconnected to Steam! Resuming farming...');
      const gameIds = configManager.get().games.map((game) => game.appId);
      steamClient.startFarming(gameIds);
    });

    // Handle failed reconnection
    steamClient.on('reconnectFailed', () => {
      console.log('Failed to reconnect after multiple attempts.');
      isFarming = false;
      showMainMenu();
    });
  }

  // Start farming with current configuration
  async function startFarming(): Promise<void> {
    clearConsole();
    const config = configManager.get();

    // Check if configuration is valid
    if (!configManager.isValidForFarming()) {
      console.log('Configuration is not ready for farming.');
      console.log('Please edit user-config.json with your Steam account details and games.');
      await waitForEnter();
      return showMainMenu();
    }

    // Set up event handlers for Steam client
    setupFarmingEventHandlers();
    console.log('\n===== Starting Playtime Farming =====');

    // Get password - either from saved config or user input
    const password =
      config.rememberPassword && config.password && config.password !== 'YOUR_PASSWORD_HERE'
        ? config.password
        : await question('Enter your Steam password: ');

    // Attempt to login to Steam
    console.log(`Attempting to login as ${config.accountName}...`);
    const sharedSecret = config.sharedSecret !== 'THIS_IS_OPTIONAL' ? config.sharedSecret : undefined;
    steamClient.login(config.accountName, password, sharedSecret);

    // Set a timeout to check if login was successful
    setTimeout(() => {
      if (!isFarming && !steamClient.getStatus().connected) {
        console.log('Login attempt timed out or failed. Check your credentials.');
        waitForEnter('\nPress Enter to return to main menu...').then(showMainMenu);
      }
    }, 10000); // Give it 10 seconds to connect
  }

  // Show farming interface with commands
  function showFarmingInterface(): void {
    clearConsole();
    const config = configManager.get();
    const games = config.games || [];

    // Display farming status
    console.log('\n===== Playtime Farming Active =====');
    console.log(`Account: ${config.accountName}`);
    console.log(`Farming ${games.length} games:`);
    games.forEach((game) => console.log(`- ${game.name} (${game.appId})`));

    // Show available commands
    console.log('\nCommands:');
    console.log('status - Check current status');
    console.log('stop   - Stop farming and return to menu');
    console.log('help   - Show this help message');

    // Process user commands during farming
    function processCommands(): void {
      rl.once('line', async (input) => {
        const cmd = input.trim().toLowerCase();

        switch (cmd) {
          case 'status':
            // Show current farming status
            const status = steamClient.getStatus();
            console.log(`\nConnection: ${status.connected ? 'Connected' : 'Disconnected'}`);
            console.log(`Account: ${status.accountName || config.accountName}`);
            console.log(`Currently farming: ${status.playingAppIds.join(', ') || 'None'}`);
            break;

          case 'stop':
            // Stop farming and return to main menu
            console.log('Stopping farming...');
            steamClient.stopFarming();
            isFarming = false;

            // Remove all event listeners to prevent reconnection attempts
            steamClient.clearAllHandlers('disconnected', 'reconnecting', 'reconnected', 'reconnectFailed');

            return showMainMenu();

          case 'help':
            // Show help message
            console.log('\nAvailable commands:');
            console.log('status - Check current status');
            console.log('stop   - Stop farming and return to menu');
            console.log('help   - Show this help message');
            break;

          default:
            console.log("Unknown command. Type 'help' for available commands.");
        }

        // Continue listening for commands if still farming
        if (isFarming) processCommands();
      });
    }

    // Start listening for commands
    processCommands();
  }

  // Show configuration status
  function showConfigStatus(): void {
    const config = configManager.get();
    
    console.log(`Account: ${config.accountName}`);
    console.log(`Games: ${config.games?.length || 0} configured`);
    console.log(`2FA: ${config.sharedSecret && config.sharedSecret !== 'THIS_IS_OPTIONAL' ? 'Configured' : 'Not configured'}`);
    console.log(`Remember Password: ${config.rememberPassword ? 'Yes' : 'No'}`);
    
    if (!configManager.isValidForFarming()) {
      console.log('\nConfiguration Status: Not ready for farming');
      console.log('Please edit user-config.json with your Steam account details.');
    } else {
      console.log('\nConfiguration Status: Ready for farming');
    }
  }

  // Show main menu with options
  async function showMainMenu(): Promise<void> {
    try {
      clearConsole();

      // Show header and current configuration summary
      console.log('\n===== Steam Playtime Farmer =====');
      showConfigStatus();

      // Show menu options
      console.log('\nOptions:');
      console.log('1. Start Farming');
      console.log('2. View Configuration');
      console.log('3. Exit');

      // Get user choice
      const choice = await question('\nEnter your choice (1-3): ');

      // Process user choice
      switch (choice) {
        case '1':
          await startFarming();
          break;
        case '2':
          await viewConfiguration();
          break;
        case '3':
          exitApplication();
          break;
        default:
          console.log('Invalid choice.');
          await waitForEnter();
          showMainMenu();
      }
    } catch (err) {
      console.error('Error in main menu:', err);
      await waitForEnter('\nAn error occurred. Press Enter to restart the menu...');
      showMainMenu();
    }
  }

  // View current configuration
  async function viewConfiguration(): Promise<void> {
    clearConsole();
    console.log('\n===== Current Configuration =====');
    
    const config = configManager.get();
    
    console.log(`Account Name: ${config.accountName}`);
    console.log(`Shared Secret: ${config.sharedSecret ? (config.sharedSecret === 'THIS_IS_OPTIONAL' ? 'Not configured' : 'Configured') : 'Not configured'}`);
    console.log(`Remember Password: ${config.rememberPassword ? 'Yes' : 'No'}`);
    console.log(`Password: ${config.password && config.password !== 'YOUR_PASSWORD_HERE' ? 'Configured' : 'Not configured'}`);
    
    console.log('\nConfigured Games:');
    if (config.games && config.games.length > 0) {
      config.games.forEach((game, index) => {
        console.log(`${index + 1}. ${game.name} (AppID: ${game.appId})`);
      });
    } else {
      console.log('No games configured.');
    }
    
    console.log('\nTo modify the configuration, edit the user-config.json file.');
    
    await waitForEnter();
    showMainMenu();
  }

  // Return the public API
  return {
    start: showMainMenu,
    close: (): void => rl.close(),
  };
}

export type UserInterface = ReturnType<typeof createUserInterface>;