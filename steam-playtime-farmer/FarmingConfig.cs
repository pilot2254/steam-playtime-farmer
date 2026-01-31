using System.Text.Json.Serialization;

namespace steam_playtime_farmer;

public class FarmingConfig
{
    [JsonPropertyName("accounts")]
    public List<AccountConfig> Accounts { get; set; } = new();
}

public class AccountConfig
{
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("games")]
    public List<uint> Games { get; set; } = new();

    [JsonPropertyName("targetHours")]
    public Dictionary<string, int> TargetHours { get; set; } = new();

    [JsonPropertyName("status")]
    public string Status { get; set; } = "Online";

    [JsonPropertyName("customGame")]
    public string CustomGame { get; set; } = string.Empty;
}
