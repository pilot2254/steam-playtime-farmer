using System.Text.Json;
using steam_playtime_farmer;

var configPath = "config.json";
if (!File.Exists(configPath))
{
	Console.WriteLine("config.json not found");
	return;
}

FarmingConfig? config;

try
{
	var json = await File.ReadAllTextAsync(configPath);
	config = JsonSerializer.Deserialize<FarmingConfig>(json);
}
catch (Exception ex)
{
	Console.WriteLine($"Failed to parse config.json: {ex.Message}");
	return;
}

if (config?.Accounts == null || config.Accounts.Count == 0)
{
	Console.WriteLine("No accounts in config");
	return;
}

var errors = new List<string>();

for (int i = 0; i < config.Accounts.Count; i++)
{
	var acc = config.Accounts[i];

	if (string.IsNullOrWhiteSpace(acc.Username))
		errors.Add($"Account {i + 1}: Username is empty");

	if (string.IsNullOrWhiteSpace(acc.Password))
		errors.Add($"Account {i + 1}: Password is empty");

	if (acc.Games.Count == 0)
		errors.Add($"Account {i + 1} ({acc.Username}): No games specified");

	foreach (var (appIdStr, hours) in acc.TargetHours)
	{
		if (!uint.TryParse(appIdStr, out var appId))
			errors.Add($"Account {i + 1} ({acc.Username}): Invalid AppID '{appIdStr}' in targetHours");
		else if (!acc.Games.Contains(appId))
			errors.Add($"Account {i + 1} ({acc.Username}): targetHours contains AppID {appId} not in games list");

		if (hours <= 0)
			errors.Add($"Account {i + 1} ({acc.Username}): Target hours for {appIdStr} must be positive");
	}
}

if (errors.Count > 0)
{
	Console.WriteLine("Config validation errors:");
	foreach (var error in errors)
		Console.WriteLine($"  - {error}");
	return;
}

if (config.Accounts.Count > 1 && config.LoginDelaySeconds < 2)
{
	Console.WriteLine("Warning: loginDelaySeconds < 2 with multiple accounts may cause rate limiting");
}

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (s, e) =>
{
	e.Cancel = true;
	cts.Cancel();
	Console.WriteLine("\nShutting down...");
};

var tasks = new List<Task>();

for (int i = 0; i < config.Accounts.Count; i++)
{
	var acc = config.Accounts[i];
	tasks.Add(Task.Run(async () => await new SteamAccount(acc).RunAsync(cts.Token), cts.Token));

	if (i < config.Accounts.Count - 1)
		await Task.Delay(config.LoginDelaySeconds * 1000, cts.Token);
}

await Task.WhenAll(tasks);
