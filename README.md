# steam-playtime-farmer

farms steam playtime on multiple accounts/games at once without opening the actual games. built this because every other tool out there is either bloated as fk or doesn't do what i want

no gui, no dashboard, just a config file and it runs. if you want ASF go use ASF, this is for people who want something small

## what it does

- multiple accounts in parallel, multiple games per account
- custom status (online/invisible/away/offline) + custom in-game text
- auto reconnects when steam drops you
- handles 2FA, asks for the code in console when it needs one
- target hours per game, drops it once you hit the number
- saves progress so a crash/reboot doesn't wipe your hours

## get it running

grab a build from [releases](https://github.com/pilot2254/steam-playtime-farmer/releases), or build it yourself:

```bash
.\build-all.bat
```

rename `config.json.example` to `config.json`:

```json
{
  "accounts": [
    {
      "username": "your_username",
      "password": "your_password",
      "games": [730, 440],
      "targetHours": { "730": 100 },
      "status": "Online",
      "customGame": "Farming...",
      "enableLogging": false
    }
  ],
  "loginDelaySeconds": 5
}
```

skip `targetHours` for a game if you want it farming forever. appid is in the store url (`store.steampowered.com/app/730/`) or just check steamdb.

run it:
```bash
./steam-playtime-farmer
```

first login per account will ask for a Steam Guard code in console. after that it caches the session so you're not doing that every restart.

## heads up

- your password sits in plain text in `config.json`. don't commit it, don't share it, use a throwaway account not your main
- max 32 games total (31 + 1 custom status), that's steam's hard cap
- steam's fine with playtime farming, but farming for trading cards specifically can technically brush against their ToS. won't get you VAC banned, just use common sense
- don't edit `config.json` while it's running, it's not reading it live

## troubleshooting

**"config.json not found"** - it needs to sit next to the executable

**"Login failed: InvalidPassword"** - check your creds, if they're right and it still fails delete `state/auth_username.json` for that account and let it re-auth

**"Login failed: RateLimitExceeded"** - steam's throttling you, bump `loginDelaySeconds` and chill for a bit

**keeps disconnecting** - check your internet, otherwise it's just steam being steam, it auto-reconnects

## why C#

rewrote this from an old node.js version because SteamKit2 just plays nicer with steam than the node libs did. old version's on the `nodejs-version` branch if you want to play with it

## license

see [LICENSE](LICENSE). tl;dr don't redistribute or sell this <3
