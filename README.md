### Steam Playtime Farmer

A simple, command-line tool that automatically farms playtime for your Steam games. This application lets you run multiple games simultaneously in the background to accumulate playtime hours without actually playing the games.


## 📋 Table of Contents

- [What is This?](#what-is-this)
- [Features](#features)
- [Installation for Regular Users](#installation-for-regular-users)
- [How to Use](#how-to-use)
- [Creating and Managing Presets](#creating-and-managing-presets)
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

## Features

- 🎮 Farm multiple games simultaneously
- 🔐 Secure login with Steam Guard support
- 💾 Save and load different game presets
- 🔄 Automatic reconnection if disconnected
- 📱 Optional 2FA integration with shared secret
- 🔒 Optional password saving


## Installation for Regular Users

### Step 1: Install Node.js

This application runs on Node.js, which you'll need to install first:

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the "LTS" (Long Term Support) version
3. Run the installer and follow the instructions
4. When asked about additional tools, check "Automatically install the necessary tools"


### Step 2: Download Steam Playtime Farmer

1. Download the latest release from [the releases page](https://github.com/yourusername/steam-playtime-farmer/releases)
2. Extract the ZIP file to a folder on your computer


### Step 3: Install Dependencies

1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to the folder where you extracted the files:

```plaintext
cd path/to/steam-playtime-farmer
```


3. Install the required packages:

```plaintext
npm install
```


## How to Use

### Starting the Application

1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to the application folder:

```plaintext
cd path/to/steam-playtime-farmer
```


3. Start the application:

```plaintext
npm start
```




### First-Time Setup

1. When you first run the application, it will create a default configuration file
2. You'll need to create a preset with your Steam account and games


### Logging In

1. Select "Start Farming" from the main menu
2. Enter your Steam password when prompted
3. If you have Steam Guard enabled, you'll be asked for your code


### Commands While Farming

Once farming has started, you can use these commands:

- `status` - Check your current farming status
- `stop` - Stop farming and return to the main menu
- `help` - Show available commands


## Creating and Managing Presets

Presets allow you to save different configurations for different accounts or sets of games.

### Creating a Preset

1. First, make sure you've added your account details and games to the current configuration
2. From the main menu, select "Save Current Config as Preset"
3. Enter a unique ID (letters, numbers, and hyphens only)
4. Enter a name for your preset


### Loading a Preset

1. From the main menu, select "Load Preset"
2. Choose the preset you want to load from the list
3. The preset will be loaded and ready to use


### Deleting a Preset

1. From the main menu, select "Delete Preset"
2. Choose the preset you want to delete
3. Confirm the deletion


## Steam Guard Authentication

### Using Steam Guard Codes

If you have Steam Guard enabled, you'll be prompted for your code when logging in.

### Using 2FA Shared Secret (Advanced)

For automatic 2FA code generation:

1. Obtain your shared secret (requires access to your Steam Guard setup)
2. Add it to your configuration or preset
3. The application will generate codes automatically


## For Developers

### Project Structure

```plaintext
steam-playtime-farmer/
├── main.js                 # Entry point
├── app.config.js           # Application configuration
├── modules/
│   ├── steam-client.js     # Steam client functionality
│   ├── config-manager.js   # Configuration management
│   ├── user-interface.js   # Command-line interface
│   ├── session-manager.js  # Session persistence
│   ├── connection-manager.js # Connection handling
│   └── event-manager.js    # Event system
├── presets/                # Saved presets (JSON files)
└── user-config.json        # User configuration
```

### Key Components

- **Steam Client**: Handles authentication and game farming
- **Config Manager**: Manages user configuration and presets
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

```shellscript
# Clone the repository
git clone https://github.com/yourusername/steam-playtime-farmer.git

# Navigate to the directory
cd steam-playtime-farmer

# Install dependencies
npm install

# Run the application
npm start
```

## Troubleshooting

### Common Issues

#### "Error: Incorrect password or invalid credentials"

- Double-check your Steam username and password
- Make sure you're entering the correct Steam Guard code


#### "Failed to reconnect after multiple attempts"

- Check your internet connection
- Steam servers might be down - try again later


#### "Steam Guard required but no handler registered"

- Restart the application and try again


### Logs

The application logs important information to the console. If you're experiencing issues, check the console output for error messages.

## FAQ

### Is this against Steam's terms of service?

Using this tool might violate Steam's terms of service. Use at your own risk.

### Will this get me VAC banned?

No, this tool doesn't modify any game files or interact with VAC-protected games in any way that would trigger a VAC ban.

### Do I need to have the games installed?

No, the application only tells Steam you're playing the games - it doesn't actually run them.

### Can I use this with multiple Steam accounts?

Yes, you can create different presets for different accounts.

### Is my Steam password stored securely?

Your password is only stored if you enable the "Remember Password" option. It's stored locally on your computer in plain text, so only enable this option if your computer is secure.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Disclaimer**: This tool is for educational purposes only. The developers are not responsible for any consequences resulting from the use of this software.