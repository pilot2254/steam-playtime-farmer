using SteamKit2;
using System.Diagnostics;

namespace steam_playtime_farmer;

public class SteamAccount
{
    private readonly AccountConfig _config;
    private readonly SteamClient _client;
    private readonly CallbackManager _manager;
    private readonly SteamUser _user;
    private readonly SteamFriends _friends;

    private bool _isRunning;
    private string? _authCode;
    private string? _twoFactorAuth;
    private readonly Dictionary<uint, Stopwatch> _timers = new();

    public SteamAccount(AccountConfig config)
    {
        _config = config;
        _client = new SteamClient();
        _manager = new CallbackManager(_client);
        _user = _client.GetHandler<SteamUser>()!;
        _friends = _client.GetHandler<SteamFriends>()!;

        _manager.Subscribe<SteamClient.ConnectedCallback>(OnConnected);
        _manager.Subscribe<SteamClient.DisconnectedCallback>(OnDisconnected);
        _manager.Subscribe<SteamUser.LoggedOnCallback>(OnLoggedOn);
        _manager.Subscribe<SteamUser.LoggedOffCallback>(OnLoggedOff);
    }

    public async Task RunAsync(CancellationToken ct)
    {
        _isRunning = true;
        Console.WriteLine($"[{_config.Username}] Connecting to Steam...");
        _client.Connect();

        while (_isRunning && !ct.IsCancellationRequested)
        {
            _manager.RunWaitCallbacks(TimeSpan.FromSeconds(1));
            await Task.Delay(100, ct);
        }
    }

    private void OnConnected(SteamClient.ConnectedCallback callback)
    {
        Console.WriteLine($"[{_config.Username}] Connected, logging in...");

        _user.LogOn(new SteamUser.LogOnDetails
        {
            Username = _config.Username,
            Password = _config.Password,
            AuthCode = _authCode,
            TwoFactorCode = _twoFactorAuth
        });
    }

    private void OnDisconnected(SteamClient.DisconnectedCallback callback)
    {
        Console.WriteLine($"[{_config.Username}] Disconnected, reconnecting in 5s...");
        Thread.Sleep(5000);
        _client.Connect();
    }

    private void OnLoggedOn(SteamUser.LoggedOnCallback callback)
    {
        if (callback.Result != EResult.OK)
        {
            if (callback.Result == EResult.AccountLogonDenied)
            {
                Console.Write($"[{_config.Username}] Email auth code: ");
                _authCode = Console.ReadLine();
                return;
            }

            if (callback.Result == EResult.AccountLoginDeniedNeedTwoFactor)
            {
                Console.Write($"[{_config.Username}] 2FA code: ");
                _twoFactorAuth = Console.ReadLine();
                return;
            }

            Console.WriteLine($"[{_config.Username}] Login failed: {callback.Result}");
            _isRunning = false;
            return;
        }

        Console.WriteLine($"[{_config.Username}] Logged in successfully");
        StartFarming();
    }

    private void OnLoggedOff(SteamUser.LoggedOffCallback callback)
    {
        Console.WriteLine($"[{_config.Username}] Logged off: {callback.Result}");
    }

    private void StartFarming()
    {
        var statusEnum = _config.Status.ToLower() switch
        {
            "online" => EPersonaState.Online,
            "invisible" => EPersonaState.Invisible,
            "away" => EPersonaState.Away,
            "offline" => EPersonaState.Offline,
            _ => EPersonaState.Online
        };

        _friends.SetPersonaState(statusEnum);

        var msg = new ClientMsgProtobuf<CMsgClientGamesPlayed>(EMsg.ClientGamesPlayed);

        if (!string.IsNullOrWhiteSpace(_config.CustomGame))
        {
            msg.Body.games_played.Add(new CMsgClientGamesPlayed.GamePlayed
            {
                game_id = new GameID(0),
                game_extra_info = _config.CustomGame
            });
        }

        foreach (var appId in _config.Games)
        {
            msg.Body.games_played.Add(new CMsgClientGamesPlayed.GamePlayed
            {
                game_id = new GameID(appId)
            });

            _timers[appId] = Stopwatch.StartNew();
        }

        _client.Send(msg);

        Console.WriteLine($"[{_config.Username}] Farming {_config.Games.Count} games");
        if (!string.IsNullOrWhiteSpace(_config.CustomGame))
            Console.WriteLine($"[{_config.Username}] Custom status: {_config.CustomGame}");

        Task.Run(CheckTargets);
    }

    private async Task CheckTargets()
    {
        while (_isRunning)
        {
            await Task.Delay(60000); // Check every minute

            var toRemove = new List<uint>();

            foreach (var (appId, timer) in _timers)
            {
                var appIdStr = appId.ToString();
                if (!_config.TargetHours.ContainsKey(appIdStr))
                    continue;

                var targetSeconds = _config.TargetHours[appIdStr] * 3600;
                var currentSeconds = timer.Elapsed.TotalSeconds;

                if (currentSeconds >= targetSeconds)
                {
                    Console.WriteLine($"[{_config.Username}] Target reached for {appId} ({_config.TargetHours[appIdStr]}h)");
                    toRemove.Add(appId);
                }
            }

            if (toRemove.Count > 0)
            {
                foreach (var appId in toRemove)
                {
                    _config.Games.Remove(appId);
                    _timers.Remove(appId);
                }

                if (_config.Games.Count == 0)
                {
                    Console.WriteLine($"[{_config.Username}] All targets reached, stopping");
                    _isRunning = false;
                    return;
                }

                // Refresh game list
                var msg = new ClientMsgProtobuf<CMsgClientGamesPlayed>(EMsg.ClientGamesPlayed);

                if (!string.IsNullOrWhiteSpace(_config.CustomGame))
                {
                    msg.Body.games_played.Add(new CMsgClientGamesPlayed.GamePlayed
                    {
                        game_id = new GameID(0),
                        game_extra_info = _config.CustomGame
                    });
                }

                foreach (var appId in _config.Games)
                {
                    msg.Body.games_played.Add(new CMsgClientGamesPlayed.GamePlayed
                    {
                        game_id = new GameID(appId)
                    });
                }

                _client.Send(msg);
            }
        }
    }
}
