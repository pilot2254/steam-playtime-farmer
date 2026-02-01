using SteamKit2;
using SteamKit2.Internal;
using System.Text.Json;

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
    private readonly Dictionary<uint, DateTime> _farmingStartTimes = new();
    private readonly string _stateFile;
    private readonly string? _logFile;

    public SteamAccount(AccountConfig config)
    {
        _config = config;
        _client = new SteamClient();
        _manager = new CallbackManager(_client);
        _user = _client.GetHandler<SteamUser>()!;
        _friends = _client.GetHandler<SteamFriends>()!;

        Directory.CreateDirectory("state");
        _stateFile = $"state/state_{_config.Username}.json";

        if (_config.EnableLogging)
        {
            Directory.CreateDirectory("logs");
            _logFile = $"logs/{_config.Username}.log";
        }

        _manager.Subscribe<SteamClient.ConnectedCallback>(OnConnected);
        _manager.Subscribe<SteamClient.DisconnectedCallback>(OnDisconnected);
        _manager.Subscribe<SteamUser.LoggedOnCallback>(OnLoggedOn);
        _manager.Subscribe<SteamUser.LoggedOffCallback>(OnLoggedOff);

        LoadState();
    }

    private void Log(string message)
    {
        var msg = $"[{_config.Username}] {message}";
        Console.WriteLine(msg);

        if (_logFile != null)
        {
            try
            {
                File.AppendAllText(_logFile, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}\n");
            }
            catch { }
        }
    }

    public async Task RunAsync(CancellationToken ct)
    {
        _isRunning = true;
        Log("Connecting to Steam...");

        try
        {
            _client.Connect();

            while (_isRunning && !ct.IsCancellationRequested)
            {
                _manager.RunWaitCallbacks(TimeSpan.FromSeconds(1));
                await Task.Delay(100, ct);
            }
        }
        catch (Exception ex)
        {
            Log($"Error: {ex.Message}");
        }
        finally
        {
            SaveState();
            _client.Disconnect();
            Log("Disconnected");
        }
    }

    private void OnConnected(SteamClient.ConnectedCallback callback)
    {
        Log("Connected, logging in...");

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
        Log("Disconnected, reconnecting in 5s...");
        SaveState();

        // Reset start times since we're not farming while disconnected
        foreach (var appId in _farmingStartTimes.Keys.ToList())
        {
            _farmingStartTimes[appId] = DateTime.UtcNow;
        }

        Thread.Sleep(5000);

        if (_isRunning)
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

            Log($"Login failed: {callback.Result}");
            _isRunning = false;
            return;
        }

        Log("Logged in successfully");

        // Reset start times on login
        foreach (var appId in _farmingStartTimes.Keys.ToList())
        {
            _farmingStartTimes[appId] = DateTime.UtcNow;
        }

        StartFarming();
    }

    private void LogProgress()
    {
        var state = LoadState();

        foreach (var appId in _config.Games)
        {
            var totalSeconds = state.FarmedSeconds.GetValueOrDefault(appId, 0);
            var hours = totalSeconds / 3600;

            var appIdStr = appId.ToString();
            if (_config.TargetHours.ContainsKey(appIdStr))
            {
                var target = _config.TargetHours[appIdStr];
                Log($"Progress - Game {appId}: {hours:F2}h / {target}h ({(hours / target * 100):F1}%)");
            }
            else
            {
                Log($"Progress - Game {appId}: {hours:F2}h (no target)");
            }
        }
    }

    private void OnLoggedOff(SteamUser.LoggedOffCallback callback)
    {
        Log($"Logged off: {callback.Result}");
        SaveState();
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

        foreach (var appId in _config.Games)
        {
            if (!_farmingStartTimes.ContainsKey(appId))
                _farmingStartTimes[appId] = DateTime.UtcNow;
        }

        UpdateGamesPlayed();
        Log($"Farming {_config.Games.Count} games");

        if (!string.IsNullOrWhiteSpace(_config.CustomGame))
            Log($"Custom status: {_config.CustomGame}");

        Task.Run(CheckTargets);
    }

    private void UpdateGamesPlayed()
    {
        var msg = new ClientMsgProtobuf<CMsgClientGamesPlayed>(EMsg.ClientGamesPlayed);

        // Custom game FIRST (like in the old nodejs version)
        // This prioritizes showing the custom game over the official steam ones
        if (!string.IsNullOrWhiteSpace(_config.CustomGame))
        {
            msg.Body.games_played.Add(new CMsgClientGamesPlayed.GamePlayed
            {
                game_id = new GameID(0),
                game_extra_info = _config.CustomGame
            });
        }

        // Real games AFTER
        foreach (var appId in _config.Games)
        {
            msg.Body.games_played.Add(new CMsgClientGamesPlayed.GamePlayed
            {
                game_id = new GameID(appId)
            });
        }

        _client.Send(msg);
    }

    private async Task CheckTargets()
    {
        while (_isRunning)
        {
            await Task.Delay(60000);

            var state = LoadState();
            var gamesToRemove = new List<uint>();

            foreach (var appId in _config.Games.ToList())
            {
                var appIdStr = appId.ToString();
                if (!_config.TargetHours.ContainsKey(appIdStr))
                    continue;

                var targetSeconds = _config.TargetHours[appIdStr] * 3600;
                var totalFarmedSeconds = state.FarmedSeconds.GetValueOrDefault(appId, 0);

                if (totalFarmedSeconds >= targetSeconds)
                {
                    var hours = totalFarmedSeconds / 3600;
                    Log($"Target reached for {appId} ({hours:F2}h / {_config.TargetHours[appIdStr]}h)");
                    gamesToRemove.Add(appId);
                }
            }

            if (gamesToRemove.Count > 0)
            {
                foreach (var appId in gamesToRemove)
                {
                    _config.Games.Remove(appId);
                    _farmingStartTimes.Remove(appId);
                }

                if (_config.Games.Count == 0)
                {
                    Log("All targets reached, stopping");
                    _isRunning = false;
                    SaveState();
                    CleanupCompletedGames(gamesToRemove);
                    return;
                }

                UpdateGamesPlayed();
                CleanupCompletedGames(gamesToRemove);
            }

            SaveState();
            LogProgress();
        }
    }

    private void SaveState()
    {
        try
        {
            var state = new FarmingState
            {
                FarmedSeconds = new Dictionary<uint, double>()
            };

            var existingState = LoadState();

            // Reset start times first to prevent double counting if crash happens
            var sessionTimes = new Dictionary<uint, double>();
            foreach (var (appId, startTime) in _farmingStartTimes.ToList())
            {
                var sessionSeconds = (DateTime.UtcNow - startTime).TotalSeconds;
                sessionTimes[appId] = sessionSeconds;
                _farmingStartTimes[appId] = DateTime.UtcNow;
            }

            // For currently farming games, calculate total time
            foreach (var (appId, sessionSeconds) in sessionTimes)
            {
                var previousSeconds = existingState.FarmedSeconds.GetValueOrDefault(appId, 0);
                state.FarmedSeconds[appId] = previousSeconds + sessionSeconds;
            }

            // For games we stopped farming but haven't hit target yet, keep their previous time
            foreach (var (appId, seconds) in existingState.FarmedSeconds)
            {
                if (!_farmingStartTimes.ContainsKey(appId) && _config.Games.Contains(appId))
                    state.FarmedSeconds[appId] = seconds;
            }

            // Atomic write using temp file
            var tempFile = _stateFile + ".tmp";
            var json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(tempFile, json);
            File.Move(tempFile, _stateFile, true);
        }
        catch (Exception ex)
        {
            Log($"Failed to save state: {ex.Message}");
        }
    }

    private FarmingState LoadState()
    {
        try
        {
            if (File.Exists(_stateFile))
            {
                var json = File.ReadAllText(_stateFile);
                return JsonSerializer.Deserialize<FarmingState>(json) ?? new FarmingState();
            }
        }
        catch (Exception ex)
        {
            Log($"Failed to load state: {ex.Message}");
        }

        return new FarmingState();
    }

    private void CleanupCompletedGames(List<uint> completedGames)
    {
        try
        {
            var state = LoadState();

            foreach (var appId in completedGames)
            {
                state.FarmedSeconds.Remove(appId);
            }

            var json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_stateFile, json);

            Log($"Cleaned up {completedGames.Count} completed games from state");
        }
        catch (Exception ex)
        {
            Log($"Failed to cleanup state: {ex.Message}");
        }
    }

    private class FarmingState
    {
        public Dictionary<uint, double> FarmedSeconds { get; set; } = new();
    }
}
