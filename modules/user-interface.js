import steamClient from './steam-client';
import question from './question';
import config from './config';
import { showFarmingInterface, showMainMenu } from './interface-functions';

// Inside the startFarming function, add proper cleanup:

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
  removeErrorHandler();
  
  showMainMenu();
});

const removeDisconnectHandler = steamClient.on('disconnected', () => {
  // Clean up all handlers
  removeGuardHandler();
  removeLoggedOnHandler();
  removeDisconnectHandler();
  removeErrorHandler();
  
  showMainMenu();
});