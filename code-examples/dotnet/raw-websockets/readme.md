## Dotnet 8.0 - Raw Websockets

We are not aware of any out of the box GraphQL libraries that correctly connect to our websocket source, due to custom handshakes peformed by AWS AppSync.  This implementation shows how you can use raw websockets and a manual handshake to subscribe to the market line update stream.

### Usage

#### Authentication

Fill in values for `REALTIME_API_HOST` and `REALTIME_API_HOST` in the root of this repository with values provided by your account manager.

#### Execution

```
dotnet build
dotnet run
```