# Steam Playtime Farmer

Farm playtime hours on multiple Steam games simultaneously without actually playing them.

## Features

- Farm multiple games at once
- Custom Steam status messages
- Automatic reconnection
- 2FA support (manual or automatic with shared secret)
- Optional password saving
- Simple config-based setup

## Installation

1. Install [Node.js](https://nodejs.org/) (LTS version)
2. Download/clone this repo
3. Install dependencies:
```bash
npm install
```

## Configuration

Edit `user-config.json`:

```json
{
  "accountName": "your_steam_username",
  "sharedSecret": "",
  "games": [
    {
      "appId": 730,
      "name": "Counter-Strike 2"
    },
    {
      "appId": 440,
      "name": "Team Fortress 2"
    }
  ],
  "password": "your_password",
  "customStatus": "Grinding cards 🎮"
}
```

### Config Options

- **accountName**: Your Steam username (required)
- **password**: Your Steam password (optional, will prompt if not set)
- **sharedSecret**: Your Steam Guard shared secret for auto 2FA (optional)
- **games**: Array of games to farm with `appId` and `name`
- **customStatus**: Custom status text (optional, shows as "In non-Steam game: [your text]")

### Finding Game AppIDs

Go to the game's Steam store page and check the URL:
```
https://store.steampowered.com/app/730/
                                   ^^^
                                  AppID
```

Or use [SteamDB](https://steamdb.info/).

## Usage

Start the farmer:
```bash
npm start
```

### Commands While Farming

- `status` - Check current status
- `stop` - Stop farming
- `help` - Show commands

## Custom Status

When you set `customStatus` in config, it displays as a non-Steam game at the top of your playing status, while your actual games farm playtime below it.

Example:
- Profile shows: "In non-Steam game: Grinding cards 🎮"
- Games CS2, TF2, Dota 2 accumulate playtime

Leave `customStatus` as empty string `""` for no custom status.

## 2FA / Steam Guard

### Manual Entry
If you have Steam Guard, you'll be prompted for the code when logging in.

### Automatic (Shared Secret)
1. Get your shared secret from your Steam Guard setup
2. Add it to `sharedSecret` in config
3. 2FA codes generate automatically

## Warning

Using this may violate Steam's ToS. Use at your own risk. Won't cause VAC bans (doesn't modify games), but Steam could take action on your account.

## Troubleshooting

**"Config not ready"**
- Edit `user-config.json` and replace placeholder values with real credentials

**"Incorrect password"**
- Check your password in config
- Try logging in via Steam client to verify

**Reconnection fails**
- Check internet connection
- Steam servers might be down
- Restart the app

**Login timeout**
- Make sure you're entering Steam Guard code if prompted
- Check credentials are correct

## Development

Build:
```bash
npm run build
```

Watch mode:
```bash
npm run dev
```

Clean build:
```bash
npm run clean
```

## License

MIT