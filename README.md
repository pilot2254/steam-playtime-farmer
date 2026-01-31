# Steam Playtime Farmer

Farm playtime hours on multiple Steam games simultaneously without actually playing them.

> [!WARNING]
> While Steam allows playtime farming, using this may still violate Steam's ToS because of trading card farming. Use at your own risk. It won't cause VAC bans (doesn't modify games), but Steam could take action on your account.
>
> I'm not responsible for any actions on your account.
>
> You can farm up to 32 games at once (including custom status → `31 games + 1 custom status = 32 steam applications`)

> [!NOTE]
> This app was originally built with TypeScript/Node.js but was rewritten in C# to leverage SteamKit2 for better Steam integration. If you want the old Node.js version, check the `nodejs-version` branch.

> [!NOTE]
> Why not just use ArchiSF? Because my playtime farmer is lightweight, and doesnt have 16 gazillion files. Yes, it doesn't have GUI and all of the other advanced and fancy features.

## Features

- Farm multiple accounts in parallel
- Farm multiple games per account
- Custom Steam status messages (Online/Invisible/Away/Offline)
- Custom in-game activity text
- Automatic reconnection on disconnect
- 2FA support (prompts for email/mobile auth codes)
- Target hour tracking (auto-stops when reached)
- Simple config-based setup

## Requirements

- [.NET 10 Runtime](https://dotnet.microsoft.com/download/dotnet/10.0) (or use the self-contained build)

## Installation

### Option 1: Download Pre-built Release
1. Download the latest release for your platform from the [Releases](../../releases) page
2. Extract the archive
3. Edit `config.json` with your accounts

### Option 2: Build from Source
1. Install [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
2. Clone this repo
3. Build:
```bash
dotnet publish -c Release -r <runtime> --self-contained true -p:PublishSingleFile=true -o ./publish
```
Replace `<runtime>` with:
- `win-x64` for Windows
- `linux-x64` for Linux
- `linux-arm64` for Raspberry Pi
- `osx-x64` for macOS Intel
- `osx-arm64` for macOS Apple Silicon

## Configuration

Rename `config.json.example` to `config.json` and edit it:

```json
{
  "accounts": [
    {
      "username": "your_username",
      "password": "your_password",
      "games": [730, 440],
      "targetHours": {
        "730": 100
      },
      "status": "Online",
      "customGame": "Farming..."
    }
  ]
}
```

### Config Options

- **username**: Steam username (required)
- **password**: Steam password (required)
- **games**: Array of game AppIDs to farm (required)
- **targetHours**: Optional hour targets per game. Format: `{"appId": hours}`. Removes game from farming when target is reached. Omit games you want to farm indefinitely.
- **status**: Steam online status - `"Online"`, `"Invisible"`, `"Away"`, or `"Offline"` (default: `"Online"`)
- **customGame**: Custom game name text (optional, shows as "In non-Steam game: [your text]")

### Finding Game AppIDs

Go to the game's Steam store page and check the URL:
```
https://store.steampowered.com/app/730/
                                   ^^^
                                  AppID
```

Or be smart and use [SteamDB](https://steamdb.info/).

## Usage

Run the executable:

**Windows:**
```bash
steam-playtime-farmer.exe
```

**Linux/macOS:**
```bash
chmod +x steam-playtime-farmer
./steam-playtime-farmer
```

### 2FA / Steam Guard

If you have Steam Guard enabled:
- **Email Auth**: App will prompt you to enter the code sent to your email
- **Mobile 2FA**: App will prompt you to enter the code from your Steam Mobile app

The app stores authentication tokens, so you won't need to enter 2FA codes on every run.

### Running on Raspberry Pi / Server

Use `screen` or `tmux` to keep it running after SSH disconnect:

```bash
screen -S farmer
./steam-playtime-farmer
# Press Ctrl+A then D to detach
# Reconnect later with: screen -r farmer
```

### Stopping the App

Press `Ctrl+C` to gracefully shut down all farming sessions.

## How It Works

- Each account runs in a separate parallel session
- Games accumulate playtime while the app is running
- If a game reaches its target hours, it's automatically removed from that account's farming list
- When all games for an account reach their targets (or you stop manually), that account's session ends
- Handles disconnects with automatic reconnection
- Tracks playtime locally using timers (Steam's official playtime updates periodically on their end)

## Known Issues

- **Custom game status may not display**: When farming real games simultaneously, Steam prioritizes showing actual game names over custom text. Custom status works best when not farming real games, or it may show inconsistently.
- **Multiple account 2FA prompts**: If running many accounts, 2FA prompts may overlap in the console. Enter codes one at a time as prompted.

## Troubleshooting

**"config.json not found"**
- Make sure `config.json` is in the same directory as the executable

**"Login failed: InvalidPassword"**
- Check your username and password in config
- Try logging in via Steam client to verify credentials

**"Login failed: RateLimitExceeded"**
- Steam is rate limiting login attempts
- Wait a few minutes before trying again

**Disconnects frequently**
- Check your internet connection
- Steam servers may be unstable
- The app will auto-reconnect every 5 seconds

## License

MIT
