using System.Text.Json;
using steam_playtime_farmer;

var configPath = "config.json";
if (!File.Exists(configPath))
{
    Console.WriteLine("config.json not found");
    return;
}

var json = await File.ReadAllTextAsync(configPath);
var config = JsonSerializer.Deserialize<FarmingConfig>(json);

if (config?.Accounts == null || config.Accounts.Count == 0)
{
    Console.WriteLine("No accounts in config");
    return;
}

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (s, e) =>
{
    e.Cancel = true;
    cts.Cancel();
    Console.WriteLine("\nShutting down...");
};

var tasks = config.Accounts.Select(acc => new SteamAccount(acc).RunAsync(cts.Token)).ToList();

await Task.WhenAll(tasks);
