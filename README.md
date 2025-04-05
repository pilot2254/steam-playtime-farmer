# Steam Playtime Farmer

A simple Node.js application for farming playtime across multiple Steam games simultaneously.

## Important Limitations

- **Maximum 32 games**: Steam only allows farming playtime for up to 32 games at once
- **One device only**: You can only be playing on one device with your account

## Quick Start

1. Install [Node.js](https://nodejs.org/) (v14 or newer)
2. Clone or download this repository
3. Install dependencies:
```bash
npm install
```

4. Run the application:
```shellscript
npm start
```

## Basic Usage

### Setting Up

1. Select "Setup Account" from the main menu
2. Enter your Steam username and password
3. If you have Steam Guard, you'll need to enter codes when prompted

### Adding Games

1. Select "Manage Games" from the main menu
2. Choose "Add game"
3. Enter the AppID of the game (found in the URL of the game's Steam store page)

4. Example: For `https://store.steampowered.com/app/730/CounterStrike/`, the AppID is 730

### Farming Playtime

1. Select "Start Farming" from the main menu
2. The app will log in to Steam and start farming playtime
3. Type "status" to check current status
4. Type "stop" to stop farming and return to the menu

## Security Notes

- If you choose to save your password, it will be stored in plain text
- For better security, choose not to save your password
- Keep your `user-config.json` file secure and do not share it

## Finding Game AppIDs

1. Go to the game's store page on Steam
2. Look at the URL: `https://store.steampowered.com/app/[AppID]/[Game_Name]/`
3. The number after `/app/` is the AppID

## Troubleshooting

- Make sure your username and password are correct
- If using 2FA, enter the code correctly when prompted
- If you get "Rate Limited" errors, wait a few minutes before trying again
- Remember you can only be logged into Steam on one device at a time
