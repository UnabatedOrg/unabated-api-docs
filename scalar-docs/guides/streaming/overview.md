# Live updates with SSE

**Available for: Concierge API · Enterprise API**

Server-Sent Events (SSE) sends updates through a persistent HTTP connection. Use REST to load the data your application needs, then SSE to keep prices, markets, and event state current.

Concierge API streaming is scoped to NFL, NBA, MLB, NHL, and WNBA. Enterprise API scope follows your agreement. Every subscription remains within the data and features authorized for its API key.

<scalar-callout type="info">

Free API access does not include SSE. Use the Free Odds API REST workflow and its polling limits instead. NFL in-game models require a separate, explicitly enabled Enterprise API feature; ordinary streaming access does not include them.

</scalar-callout>

## Two requests, one stream

1. Send `POST /subscriptions` with your API key and the event types and filters you need.
2. Read `data.streamUrl` from the response and open it with `GET` against the same API base URL.

Production base URL: `https://data.unabated.com`

Sandbox base URL: `https://data-sandbox.unabated.com`

```http
POST /subscriptions
X-Api-Key: YOUR_API_KEY
Content-Type: application/json
```

```json
{
  "eventTypes": ["market_line_update", "event_update"],
  "leagueIds": [5],
  "marketTypeIds": [1],
  "includeSnapshot": false
}
```

The IDs above are illustrative. Discover the league and market-type IDs you want using the REST reference instead of treating sample values as a maintained catalog.

Successful subscription creation returns the standard API envelope:

```json
{
  "data": {
    "subscriptionId": "sub_0123456789abcdef0123456789abcdef",
    "streamUrl": "/sse/sub_0123456789abcdef0123456789abcdef?token=SIGNED_TOKEN"
  },
  "success": true,
  "messages": [],
  "pagination": null
}
```

Join the relative URL to the base URL with a URL library. Use the returned URL unchanged: the signed token carries the subscription definition and authenticates the stream request. You do not need to send the API key again when opening the stream.

<scalar-callout type="warning">

The complete signed stream URL is a credential. Keep it out of logs, analytics, screenshots, source control, and public pages. Create subscriptions on your server so your original API key never appears in a public client bundle.

</scalar-callout>

## What arrives over the connection

A successful stream returns `200` with `Content-Type: text/event-stream` and `Cache-Control: no-cache`.

```text
: connected 2026-10-01T15:00:00.0000000Z

id: 801daf96614a4f6e9b970233e95ad41d
event: market_line_update
data: {"data":{"marketLineUpdate":{"leagueId":5,"marketTypeId":1,"marketLines":[]}}}

: keepalive

```

Each blank line ends a frame. `event` names the event family, `data` contains its JSON payload, and `id` is an opaque hint for best-effort reconnect recovery. Lines beginning with `:` are connection or keepalive comments; they are not application events. The empty array above illustrates framing, not a real market update.

Unabated sends named events. In a browser, register `addEventListener("market_line_update", handler)` rather than relying only on `onmessage`. A raw HTTP reader must combine every `data:` line in a frame before decoding JSON. The [complete lifecycle examples](/guides/streaming/lifecycle) handle this for you.

## Build current state, not just an event log

Most stream messages contain changes rather than a complete view of all odds. Identify a line by its `marketLineId`, compare its ordering fields with the state you already hold, and apply changes without discarding unrelated REST metadata.

SSE market-line messages do not contain a `deepLink` URL. For a price or status change with unchanged selection points, retain the link obtained from REST. The link encodes the selection's points: when points change, invalidate the old link and retrieve a matching link from REST before publishing it. Apply the same rule to each alternate selection. For a newly encountered selection, retrieve its relevant REST data first.

Use the optional server snapshot only after handling its completion and readiness state. If snapshots are unavailable, use REST synchronization with a bounded buffer of incoming events. Reconnect recovery is best effort and does not provide durable historical replay, so a resumed connection alone does not prove your state is complete. [Snapshots and recovery](/guides/streaming/recovery) explains these boundaries.

## Choose your next step

- [Connect and receive your first events](/guides/streaming/lifecycle): runnable cURL, JavaScript, and Python examples, plus a browser `EventSource` example.
- [Events and filters](/guides/streaming/events-and-filters): supported families, exact payload roots, filter behavior, and line-update rules.
- [Snapshots and recovery](/guides/streaming/recovery): initialization, `Last-Event-ID`, gap notices, expiry, and state repair.
- [NFL in-game models](/guides/streaming/models): explicit Enterprise API access and model state transitions.

## Agent task

```text
Build a server-side Unabated live-odds integration for my entitled API tier.
Read the streaming lifecycle, filter, and recovery pages first. Discover IDs,
create a narrowly filtered subscription, and consume named SSE events using
standard framing. Keep credentials in environment variables and never log
the signed stream URL. Maintain state by stable IDs, reject stale updates,
retain REST deep links only for unchanged selection points, refetch links
when points change, and repair uncertain continuity with REST data.
Do not request NFL in-game models unless I explicitly have that feature.
```
