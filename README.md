# Steam Playtime Farmer

A simple command-line tool that automatically farms playtime for your Steam games. This application lets you run multiple games simultaneously in the background to accumulate playtime hours without actually playing them.

## Table of Contents

- [What is This?](#what-is-this)
- [Features](#features)
- [Installation for Regular Users](#installation-for-regular-users)
- [How to Use](#how-to-use)
- [Configuration](#configuration)
- [Steam Guard Authentication](#steam-guard-authentication)
- [For Developers](#for-developers)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [License](#license)

## What is This?

Steam Playtime Farmer is a tool that lets you "farm" hours on your Steam games without actually playing them. This can be useful for:

- Increasing your playtime stats
- Earning Steam trading cards
- Making your profile look more active
- Testing Steam's family sharing features

The application runs in the background and doesn't require your games to be installed - it simply tells Steam that you're playing the games.

> [!WARNING]
> Using this tool might violate Steam's terms of service. Use at your own risk.

## Features

- Farm multiple games simultaneously
- Secure login with Steam Guard support
- Automatic reconnection if disconnected
- Optional 2FA integration with shared secret
- Optional password saving
- Simple configuration file management

## Installation for Regular Users

### Step 1: Install Node.js

This application runs on Node.js, which you'll need to install first:

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the "LTS" (Long Term Support) version
3. Run the installer and follow the instructions
4. When asked about additional tools, check "Automatically install the necessary tools"

### Step 2: Download Steam Playtime Farmer

1. Download the latest release from [the releases page](https://github.com/pilot2254/steam-playtime-farmer/releases)
2. Extract the ZIP file to a folder on your computer

### Step 3: Install Dependencies

1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to the folder where you extracted the files:

```bash
cd path/to/steam-playtime-farmer
```

3. Install the required packages:

```bash
npm install
```

> [!NOTE]
> If you encounter any errors during installation, make sure you have the latest version of Node.js installed.

## How to Use

### Starting the Application

1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to the application folder:

```bash
cd path/to/steam-playtime-farmer
```

3. Start the application:

```bash
npm start
```

### First-Time Setup

When you first run the application, it will create a default configuration file called `user-config.json`. You'll need to edit this file with your Steam account details before you can start farming.

### Logging In

1. Select "Start Farming" from the main menu
2. Enter your Steam password when prompted (unless you've saved it in the config)
3. If you have Steam Guard enabled, you'll be asked for your code

> [!TIP]
> If you have a shared secret configured, the application will automatically generate 2FA codes for you.

### Commands While Farming

Once farming has started, you can use these commands:

- `status` - Check your current farming status
- `stop` - Stop farming and return to the main menu
- `help` - Show available commands

## Configuration

The application uses a `user-config.json` file to store your settings. When you first run the application, it will create a template file that looks like this:

```json
{
  "accountName": "YOUR_ACCOUNT_NAME_HERE",
  "sharedSecret": "THIS_IS_OPTIONAL",
  "games": [
    {
      "appId": 221410,
      "name": "Steam for Linux"
    },
    {
      "appId": 730,
      "name": "CS2"
    }
  ],
  "rememberPassword": false,
  "password": "YOUR_PASSWORD_HERE",
  "name": "YOUR_ACCOUNT_NAME_HERE"
}
```

### Configuration Options

- **accountName**: Your Steam username
- **sharedSecret**: Your Steam Guard shared secret (optional, for automatic 2FA)
- **games**: Array of games to farm (AppID and name)
- **rememberPassword**: Whether to save your password in the config file
- **password**: Your Steam password (only used if rememberPassword is true)
- **name**: Display name for your configuration

> [!IMPORTANT]
> Replace the placeholder values with your actual Steam account details. The application will not work with the default placeholder values.

### Finding Game AppIDs

You can find Steam AppIDs by:
1. Going to the game's Steam store page
2. Looking at the URL - the number after `/app/` is the AppID
3. Using websites like SteamDB to search for games

## Steam Guard Authentication

### Using Steam Guard Codes

If you have Steam Guard enabled on your account, you'll be prompted for your authentication code when logging in. Simply enter the code from your Steam Guard app or email.

### Using 2FA Shared Secret (Advanced)

For automatic 2FA code generation, you can configure your shared secret:

1. Obtain your shared secret (this requires access to your Steam Guard setup)
2. Add it to your configuration file
3. The application will generate codes automatically

> [!WARNING]
> Your shared secret is sensitive information. Keep it secure and don't share it with anyone.

## For Developers

### Project Structure

```
steam-playtime-farmer/
├── src/
│   ├── config/
│   │   └── app.config.ts
│   ├── modules/
│   │   ├── config-manager.ts
│   │   ├── connection-manager.ts
│   │   ├── event-manager.ts
│   │   ├── session-manager.ts
│   │   ├── steam-client.ts
│   │   └── user-interface.ts
│   ├── types/
│   │   ├── config.ts
│   │   ├── connection.ts
│   │   ├── events.ts
│   │   └── steam.ts
│   └── main.ts
├── dist/
├── package.json
├── tsconfig.json
├── user-config.json
├── LICENSE
└── README.md
```

### Key Components

- **Steam Client**: Handles authentication and game farming
- **Config Manager**: Manages user configuration
- **User Interface**: Provides the command-line interface
- **Session Manager**: Handles saving/loading Steam sessions
- **Connection Manager**: Manages reconnection logic
- **Event Manager**: Provides an event system for communication

### Adding New Features

1. Fork the repository
2. Install dependencies with `npm install`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Building from Source

```bash
# Clone the repository
git clone https://github.com/pilot2254/steam-playtime-farmer.git

# Navigate to the directory
cd steam-playtime-farmer

# Install dependencies
npm install

# Build the project
npm run build

# Run the application
npm start
```

### Development Commands

```bash
# Build the project
npm run build

# Start the application
npm start

# Watch for changes during development
npm run dev

# Clean build directory
npm run clean
```

> [!NOTE]
> The project is written in TypeScript and needs to be compiled before running. The `npm start` command automatically builds the project before starting it.

## Troubleshooting

### Common Issues

#### "Error: Incorrect password or invalid credentials"

- Double-check your Steam username and password in the config file
- Make sure you're entering the correct Steam Guard code
- Try logging in through the Steam client to verify your credentials

#### "Failed to reconnect after multiple attempts"

- Check your internet connection
- Steam servers might be down - try again later
- Restart the application and try again

#### "Steam Guard required but no handler registered"

- This usually happens when the application loses focus during login
- Restart the application and try again

#### "Configuration is not ready for farming"

- Make sure you've edited the `user-config.json` file with your actual Steam account details
- Replace all placeholder values like "YOUR_ACCOUNT_NAME_HERE" with real values
- Ensure you have at least one game configured in the games array

#### "Command not found: tsc"

- Make sure all dependencies are installed: `npm install`
- Try rebuilding the project: `npm run build`

> [!TIP]
> Most connection issues can be resolved by restarting the application and trying again.

### Logs

The application logs important information to the console. If you're experiencing issues, check the console output for error messages that might help identify the problem.

## FAQ

<details>
<summary>Is this against Steam's terms of service?</summary>

Using this tool might violate Steam's terms of service. The tool doesn't modify game files or use any exploits, but it does simulate playing games without actually running them. Use at your own risk and discretion.
</details>

<details>
<summary>Will this get me VAC banned?</summary>

No, this tool doesn't modify any game files or interact with VAC-protected games in any way that would trigger a VAC ban. It only tells Steam that you're playing certain games without actually launching them.
</details>

<details>
<summary>Do I need to have the games installed?</summary>

No, the application only tells Steam you're playing the games - it doesn't actually run them. You don't need to have the games installed on your computer.
</details>

<details>
<summary>Can I use this with multiple Steam accounts?</summary>

You can use this with multiple accounts by creating different configuration files or manually editing the config file each time you want to switch accounts.
</details>

<details>
<summary>Is my Steam password stored securely?</summary>

Your password is only stored if you enable the "rememberPassword" option in the config file. It's stored locally on your computer in plain text, so only enable this option if your computer is secure and you trust the environment.
</details>

<details>
<summary>How many games can I farm at once?</summary>

Steam typically allows farming multiple games simultaneously. The exact limit isn't officially documented, but most users can farm 10-30 games at once without issues. Your account status and Steam's current policies may affect this limit.
</details>

<details>
<summary>Will this affect my Steam level or badges?</summary>

Farming playtime can help you earn trading cards for eligible games, which can be used to craft badges and increase your Steam level. However, not all games drop cards, and there are daily limits on card drops.
</details>

<details>
<summary>Can I still use Steam normally while farming?</summary>

Yes, you can still use Steam normally while the farmer is running. However, your status will show that you're playing the games being farmed.
</details>

<details>
<summary>How do I add or remove games from farming?</summary>

Edit the `user-config.json` file and modify the "games" array. Add or remove game objects with "appId" and "name" properties. You'll need to restart the application for changes to take effect.
</details>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

> [!IMPORTANT]
> This tool is for educational purposes only. The developers are not responsible for any consequences resulting from the use of this software. Always respect the terms of service of the platforms you use.