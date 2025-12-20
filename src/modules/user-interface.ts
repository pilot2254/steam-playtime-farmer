// User Interface Module
import readline from 'readline';
import type { ConfigManager } from './config-manager.js';
import type { SteamClient } from './steam-client.js';

export function createUserInterface(configManager: ConfigManager, steamClient: SteamClient) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let isFarming = false;
  let loginTimeout: NodeJS.Timeout | null = null;

  const question = (q: string): Promise<string> => 
    new Promise(resolve => rl.question(q, resolve));

  const waitEnter = async (msg = 'Press Enter...'): Promise<void> => {
    await question(msg);
  };

  const clearScreen = (): void => {
    process.stdout.write('\x1Bc');
  };

  function clearLoginTimeout(): void {
    if (loginTimeout) {
      clearTimeout(loginTimeout);
      loginTimeout = null;
    }
  }

  function setupEvents(): void {
    const removeGuard = steamClient.on('steamGuard', async (domain, callback, wrong) => {
      clearLoginTimeout();
      const domainTxt = domain ? ` for ${domain}` : '';
      const wrongTxt = wrong ? ' (previous was wrong)' : '';
      const code = await question(`Steam Guard${domainTxt}${wrongTxt}: `);
      callback(code);
    });

    steamClient.on('loggedOn', () => {
      clearLoginTimeout();
      removeGuard();
      const config = configManager.get();
      steamClient.startFarming(
        config.games.map(g => g.appId),
        config.customStatus
      );
      isFarming = true;
      showFarming();
    });

    steamClient.on('error', (err) => {
      clearLoginTimeout();
      if (err.eresult === 5 || err.message?.includes('password')) {
        console.error('\nIncorrect password or invalid credentials');
      } else {
        console.error('Steam error:', err.message || 'Unknown');
      }
      setTimeout(() => {
        isFarming = false;
        showMenu();
      }, 3000);
    });

    steamClient.on('disconnected', () => 
      console.log('Disconnected. Reconnecting...'));

    steamClient.on('reconnecting', (attempt, max) =>
      console.log(`Reconnecting (${attempt}/${max})...`));

    steamClient.on('reconnected', () => {
      console.log('Reconnected! Resuming...');
      const config = configManager.get();
      steamClient.startFarming(
        config.games.map(g => g.appId),
        config.customStatus
      );
    });

    steamClient.on('reconnectFailed', () => {
      console.log('Reconnect failed.');
      isFarming = false;
      showMenu();
    });
  }

  async function startFarming(): Promise<void> {
    clearScreen();
    const config = configManager.get();

    if (!configManager.isValidForFarming()) {
      console.log('Config not ready. Edit user-config.json first.');
      await waitEnter();
      return showMenu();
    }

    setupEvents();
    console.log('\n===== Starting Farming =====');

    let password = '';
    if (config.password && config.password !== 'YOUR_PASSWORD_HERE' && config.password.trim()) {
      password = config.password;
      console.log('Using saved password...');
    } else {
      password = await question('Password: ');
    }

    console.log(`Logging in as ${config.accountName}...`);
    const secret = config.sharedSecret !== 'THIS_IS_OPTIONAL' ? config.sharedSecret : undefined;
    steamClient.login(config.accountName, password, secret);

    loginTimeout = setTimeout(() => {
      if (!isFarming && !steamClient.getStatus().connected) {
        console.log('Login timeout. Check credentials.');
        waitEnter('\nPress Enter...').then(showMenu);
      }
    }, 15000);
  }

  function showFarming(): void {
    clearScreen();
    const config = configManager.get();
    const games = config.games || [];

    console.log('\n===== Farming Active =====');
    console.log(`Account: ${config.accountName}`);
    if (config.customStatus) console.log(`Status: "${config.customStatus}"`);
    console.log(`Games (${games.length}):`);
    games.forEach(g => console.log(`- ${g.name} (${g.appId})`));

    console.log('\nCommands: status | stop | help');

    function processCmd(): void {
      rl.once('line', async (input) => {
        const cmd = input.trim().toLowerCase();

        switch (cmd) {
          case 'status':
            const s = steamClient.getStatus();
            console.log(`\nConnected: ${s.connected ? 'Yes' : 'No'}`);
            console.log(`Account: ${s.accountName || config.accountName}`);
            console.log(`Farming: ${s.playingAppIds.join(', ') || 'None'}`);
            if (config.customStatus) console.log(`Status: "${config.customStatus}"`);
            break;

          case 'stop':
            console.log('Stopping...');
            steamClient.stopFarming();
            isFarming = false;
            steamClient.clearAllHandlers('disconnected', 'reconnecting', 'reconnected', 'reconnectFailed');
            return showMenu();

          case 'help':
            console.log('\nstatus - Check status');
            console.log('stop - Stop and return');
            console.log('help - Show commands');
            break;

          default:
            console.log("Unknown. Type 'help'");
        }

        if (isFarming) processCmd();
      });
    }

    processCmd();
  }

  function showStatus(): void {
    const config = configManager.get();
    console.log(`Account: ${config.accountName}`);
    console.log(`Games: ${config.games?.length || 0}`);
    console.log(`2FA: ${config.sharedSecret && config.sharedSecret !== 'THIS_IS_OPTIONAL' ? 'Yes' : 'No'}`);
    console.log(`Status: ${config.customStatus ? `"${config.customStatus}"` : 'None'}`);
    
    if (!configManager.isValidForFarming()) {
      console.log('\nNot ready. Edit config.');
    } else {
      console.log('\nReady!');
    }
  }

  async function showMenu(): Promise<void> {
    try {
      clearScreen();
      console.log('\n===== Steam Playtime Farmer =====');
      showStatus();

      console.log('\n1. Start Farming');
      console.log('2. View Config');
      console.log('3. Exit');

      const choice = await question('\nChoice (1-3): ');

      switch (choice) {
        case '1':
          await startFarming();
          break;
        case '2':
          await viewConfig();
          break;
        case '3':
          console.log('\nExiting...');
          steamClient.stopFarming();
          rl.close();
          process.exit(0);
          break;
        default:
          console.log('Invalid.');
          await waitEnter();
          showMenu();
      }
    } catch (err) {
      console.error('Menu error:', err);
      await waitEnter('\nPress Enter...');
      showMenu();
    }
  }

  async function viewConfig(): Promise<void> {
    clearScreen();
    console.log('\n===== Config =====');
    
    const c = configManager.get();
    
    console.log(`Account: ${c.accountName}`);
    console.log(`Secret: ${c.sharedSecret && c.sharedSecret !== 'THIS_IS_OPTIONAL' ? 'Set' : 'Not set'}`);
    console.log(`Password: ${c.password && c.password !== 'YOUR_PASSWORD_HERE' ? 'Set' : 'Not set'}`);
    console.log(`Custom Status: ${c.customStatus || 'Not set'}`);
    
    console.log('\nGames:');
    if (c.games?.length > 0) {
      c.games.forEach((g, i) => {
        console.log(`${i + 1}. ${g.name} (${g.appId})`);
      });
    } else {
      console.log('None');
    }
    
    console.log('\nEdit user-config.json to change.');
    await waitEnter();
    showMenu();
  }

  return {
    start: showMenu,
    close: (): void => rl.close(),
  };
}

export type UserInterface = ReturnType<typeof createUserInterface>;