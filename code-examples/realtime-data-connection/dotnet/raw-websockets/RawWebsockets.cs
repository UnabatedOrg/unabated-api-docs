using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

public class Program
{
    public static async Task Main()
    {
        DotNetEnv.Env.TraversePath().Load();

        var host = DotNetEnv.Env.GetString("REALTIME_API_HOST");
        var apiKey = DotNetEnv.Env.GetString("REALTIME_API_KEY");

        if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(apiKey))
        {
            Console.Error.WriteLine("Missing required environment variables: REALTIME_API_HOST and/or REALTIME_API_KEY");
            return;
        }

        var query = @"
            subscription marketLineUpdate($leagueIds: [Int]) {
                marketLineUpdate(leagueIds: $leagueIds) {
                    leagueId
                    marketSourceGroup
                    marketLines {
                        marketId
                        price
                    }
                }
            }
        ";

        var variables = new { leagueIds = new List<int> {} };

        var client = new UnabatedRealtimeClient(host, apiKey);

        client.OnConnected += () =>
        {
            Console.WriteLine("Connected to Web Socket.");
            return Task.CompletedTask;
        };

        client.OnDataReceived += (json) =>
        {
            Console.WriteLine($"Received update: {json}");
            return Task.CompletedTask;
        };

        client.OnError += (msg) =>
        {
            Console.Error.WriteLine($"Error: {msg}");
            return Task.CompletedTask;
        };

        await client.ConnectAndSubscribeAsync(query, variables);
    }
}

public class UnabatedRealtimeClient
{
    private readonly string _host;
    private readonly string _authToken;
    private readonly Uri _webSocketUri;
    private readonly ClientWebSocket _socket;

    public event Func<string, Task>? OnDataReceived;
    public event Func<Task>? OnConnected;
    public event Func<Task>? OnDisconnected;
    public event Func<string, Task>? OnError;

    public UnabatedRealtimeClient(string host, string authToken)
    {
        _host = host;
        _authToken = authToken;
        _webSocketUri = BuildWebSocketUri(host, authToken);
        _socket = new ClientWebSocket();
        _socket.Options.AddSubProtocol("graphql-ws");
    }

    public async Task ConnectAndSubscribeAsync(string query, object? variables = null)
    {
        try
        {
            Console.WriteLine($"Connecting to: {_webSocketUri}");
            await _socket.ConnectAsync(_webSocketUri, CancellationToken.None);
            if (OnConnected is not null) await OnConnected.Invoke();
        }
        catch (Exception ex)
        {
            if (OnError is not null) await OnError.Invoke(ex.Message);
            return;
        }

        await SendInitPayloadAsync();

        var buffer = new byte[8192];
        bool started = false;

        while (_socket.State == WebSocketState.Open)
        {
            var message = await ReceiveAsync(_socket, buffer);
            if (message == null) break;

            using var doc = JsonDocument.Parse(message);
            if (!doc.RootElement.TryGetProperty("type", out var typeElem)) continue;

            var type = typeElem.GetString();
            switch (type)
            {
                case "connection_ack":
                    if (!started)
                    {
                        await SendSubscriptionStartAsync(query, variables);
                        started = true;
                    }
                    break;

                case "start_ack":
                    break;

                case "ka":
                    break; // keep-alive

                case "data":
                    if (doc.RootElement.TryGetProperty("payload", out var payload) &&
                        payload.TryGetProperty("data", out var dataJson))
                    {
                        var raw = dataJson.GetRawText();
                        if (OnDataReceived is not null) await OnDataReceived.Invoke(raw);
                    }
                    break;

                case "error":
                    if (OnError is not null) await OnError.Invoke(doc.RootElement.GetRawText());
                    break;

                case "complete":
                case "connection_error":
                    if (OnDisconnected is not null) await OnDisconnected.Invoke();
                    return;
            }
        }
    }

    private Uri BuildWebSocketUri(string host, string authToken)
    {
        var header = new { Authorization = authToken, host };
        var headerJson = JsonSerializer.Serialize(header);
        var headerB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(headerJson));
        var payloadB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("{}"));

        return new Uri($"wss://{host}/graphql/realtime?header={Uri.EscapeDataString(headerB64)}&payload={Uri.EscapeDataString(payloadB64)}");
    }

    private async Task SendInitPayloadAsync()
    {
        var initPayload = new
        {
            type = "connection_init",
            payload = new
            {
                authorization = new
                {
                    Authorization = _authToken,
                    host = _host
                }
            }
        };
        await SendAsync(JsonSerializer.Serialize(initPayload));
    }

    private async Task SendSubscriptionStartAsync(string query, object? variables)
    {
        var gqlOperation = new
        {
            query,
            variables
        };

        var dataJson = JsonSerializer.Serialize(
            gqlOperation,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false });

        var startPayload = new Dictionary<string, object?>
        {
            ["id"] = Guid.NewGuid().ToString(),
            ["type"] = "start",
            ["payload"] = new Dictionary<string, object?>
            {
                ["data"] = dataJson,
                ["extensions"] = new Dictionary<string, object?>
                {
                    ["authorization"] = new Dictionary<string, object?>
                    {
                        ["Authorization"] = _authToken,
                        ["host"] = _host,
                        ["x-amz-user-agent"] = "aws-amplify/2.0.8"
                    }
                }
            }
        };

        await SendAsync(JsonSerializer.Serialize(startPayload));
    }

    private async Task SendAsync(string message)
    {
        var bytes = Encoding.UTF8.GetBytes(message);
        await _socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private static async Task<string?> ReceiveAsync(ClientWebSocket socket, byte[] buffer)
    {
        var sb = new StringBuilder();
        WebSocketReceiveResult result;
        do
        {
            result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, string.Empty, CancellationToken.None);
                return null;
            }
            sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
        } while (!result.EndOfMessage);

        return sb.ToString();
    }
}