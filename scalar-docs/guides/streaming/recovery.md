# Snapshots and recovery

**Available for: Concierge API · Enterprise API**

An open connection is useful only if your application knows how to build and repair its state. Initialize from a snapshot, apply updates using stable IDs and ordering fields, and resynchronize whenever continuity is uncertain.

## Optional initial snapshot over SSE

Set `includeSnapshot: true` in `POST /subscriptions` to request the current matching market lines before live delivery. Use it with a subscription that includes `market_line_update` and the matching line filters.

When server snapshots are enabled, the connection is registered first. Events arriving while snapshot chunks are written are queued and delivered afterward. Chunks contain up to 500 lines grouped by league and market type, with the same `data.marketLineUpdate` line shape as ordinary market-line updates.

```text
event: market_line_snapshot
data: {"data":{"marketLineUpdate":{"correlationId":"snapshot","leagueId":5,"marketTypeId":1,"marketLines":[]}}}

event: market_line_snapshot_complete
data: {"lineCount":0,"sequence":12345,"ready":true}

```

The empty chunk above demonstrates the payload shape. A real empty result can have only a completion frame and no chunks.

| Completion field | Meaning |
| --- | --- |
| `lineCount` | Number of market lines sent in this snapshot. |
| `sequence` | Server snapshot-store sequence for diagnostic context. It is not a per-line version or a replay cursor. |
| `ready` | Whether the server's latest-line store was marked ready when the snapshot began. |

Snapshot chunks and completion frames have no `id:` field. Do not use them to replace your last delivered data-event replay hint.

<scalar-callout type="warning">

The snapshot feature is server-controlled. If disabled, `includeSnapshot: true` currently sends **no snapshot chunks and no completion frame**; live delivery still starts. If a completion arrives with `ready: false`, the snapshot is not ready. Give initialization a bounded deadline and fall back to REST rather than waiting indefinitely.

</scalar-callout>

`ready: true` does not assert that every possible market is present, or that the snapshot is a transactionally frozen view of all sources. The store is maintained from live updates and periodically refreshed. Treat the snapshot as current matching line state, continue comparing line versions, and repair missing or inconsistent data with REST. It does not replace event, team, player, or deep-link discovery.

## REST initialization with buffered updates

This works whether or not server snapshots are available:

1. Create a narrowly filtered subscription and open its returned signed URL.
2. Once the connection opens, buffer incoming application events while fetching the relevant REST odds and event data.
3. Build indexes keyed by `marketLineId` and `eventId` from the REST response. Retain its deep links and descriptive metadata alongside their selection points.
4. Apply the buffered events with the same ordering checks you will use during live delivery.
5. Switch to live processing and continue to repair gaps or missing metadata from REST.

For odds, fetch `GET /market/{league}/{marketType}/odds` for each league/market-type combination your subscription needs. A league or event name in a REST path is not interchangeable with the numeric IDs used in a subscription body; discover and map both through the reference data.

Bound the buffer by bytes/events and the snapshot request by a timeout. If either budget is exceeded, discard the incomplete local view, narrow the subscription if appropriate, and start a fresh synchronization attempt with backoff. Do not keep growing a queue indefinitely.

This approach covers updates received while REST loads, but **does not create a universal gap-free guarantee**. REST freshness, reconnect retention, pod changes, source behavior, and consumer overload can all affect continuity. Reconcile authoritative state whenever you cannot prove that your local state is current.

## Apply updates without moving backward

For the same market-line identity:

- When comparable `sequenceNumber` values are present, reject a lower incoming value.
- When comparable `modifiedOn` timestamps are present, reject an older incoming timestamp. If clocks disagree, do not blindly overwrite a state you know is newer; reconcile it from REST.
- Equal ordering values can still carry meaningful changes. Do not use “equal version” alone to ignore a status, liquidity, alternate, or freshness update.
- When ordering information is missing, use cautious processing and periodic REST reconciliation. Arrival order across reconnects is not proof of source freshness.
- Merge explicit streaming fields into the existing record; preserve unrelated REST-only fields. Process explicit nulls instead of treating them as missing fields.
- Retain the previous `deepLink` only for the same selection with unchanged points. The URL encodes points, so invalidate and refetch it whenever points change, including on an alternate. Do not publish a previous-points URL with an updated line.

When a replacement-link fetch finishes, verify that its selection points still match your current local line before attaching it. Another SSE update can move the points while the REST request is in flight.

A minimal update guard looks like this. It invalidates links for changed selection points and merges each alternate independently. Integrate REST refetch scheduling and your hierarchy indexes around it; do not publish records with missing links until you have retrieved the correct selection URL:

```javascript
const linesById = new Map();

function mergeSelection(previous, incoming) {
  if (previous) {
    if (previous.sequenceNumber != null && incoming.sequenceNumber != null &&
        incoming.sequenceNumber < previous.sequenceNumber) return previous;
    if (previous.modifiedOn && incoming.modifiedOn &&
        Date.parse(incoming.modifiedOn) < Date.parse(previous.modifiedOn)) return previous;
  }
  const next = {...previous, ...incoming};
  const sameSelection = previous &&
    previous.marketLineId === incoming.marketLineId &&
    previous.marketSourceId === incoming.marketSourceId;
  const unchangedPoints = sameSelection &&
    Object.hasOwn(previous, "points") && Object.hasOwn(incoming, "points") &&
    previous.points === incoming.points;
  if (!unchangedPoints) {
    // SSE carries no replacement URL. Fetch matching REST data before publishing.
    delete next.deepLink;
  }
  if (Array.isArray(incoming.alternateLines)) {
    const oldAlternates = new Map(
      (previous?.alternateLines ?? []).map(line => [line.marketLineId, line])
    );
    next.alternateLines = incoming.alternateLines.map(line =>
      mergeSelection(oldAlternates.get(line.marketLineId), line)
    );
  }
  return next;
}

function applyLine(incoming) {
  if (incoming.marketLineId == null) return;
  const previous = linesById.get(incoming.marketLineId);
  linesById.set(incoming.marketLineId, mergeSelection(previous, incoming));
}
```

## Reconnect and `Last-Event-ID`

Save the opaque `id` of the last **data event you successfully processed**. A raw HTTP client can send it when reopening the same signed stream URL:

```http
GET /sse/{subscriptionId}?token=SIGNED_TOKEN
Accept: text/event-stream
Last-Event-ID: OPAQUE_LAST_PROCESSED_ID
```

Native browser `EventSource` handles standard `Last-Event-ID` reconnection for you. A new `EventSource` instance does not automatically inherit the old instance's state; raw HTTP clients can explicitly supply the header. Apply bounded exponential backoff with jitter for temporary network/server failures, and keep only one active connection for a subscription.

The general SSE stream offers **best-effort reconnect recovery**, not durable historical replay. The current implementation retains up to 1,024 recent events per serving process and sends at most the newest 256 matching events to a reconnecting connection. Busy periods can make that time window very short. A different serving process, a restart, a long interruption, or more matching updates than the recovery budget can leave your cursor outside retained history.

<scalar-callout type="warning">

An unknown or trimmed `Last-Event-ID` does not currently produce an explicit “cursor expired” response or `gap` notice. A successful reconnect therefore does not prove that every missed update was replayed. Refresh your REST state whenever continuity is uncertain, including after longer interruptions or process changes.

</scalar-callout>

Do not parse, increment, compare lexically, or manufacture the SSE ID. It is separate from each line's `sequenceNumber`. The general stream has no public time-based replay parameter.

Opening the same subscription again replaces its previous connection on the same serving process. Create separate subscriptions when you need independent consumers.

## Handle a `gap` notice

The general stream keeps its connection open when a slow consumer's bounded queue overflows. It discards older queued events and sends a notice before the next data delivery:

```text
event: gap
data: {"droppedEvents":17}

```

This control frame has no `id:`. `droppedEvents` is the number discarded since the previous notice, not a lifetime total. It indicates lost delivery on this connection; it is not a guarantee that all other forms of missed history will be reported.

On `gap`, mark affected state as needing repair, start REST resynchronization, and buffer further messages within a bounded budget until you can apply them to refreshed state. If the application is persistently falling behind, narrow filters or improve processing rather than repeatedly reconnecting into the same overload.

## Expiry, revocation, and cleanup

An API-key-created subscription is currently valid for 24 hours. The creation response does not include an expiry field, so record when you created it and refresh the subscription before you depend on a longer-running connection. Do not decode signed tokens to build your client contract.

The API checks current key/access state when admitting a stream and periodically while it is open. Revoked keys, lost permissions, or expired subscriptions can close the connection; the next admission can return `401` or `403`. An already-started `200` stream cannot change its HTTP status after headers are sent.

For a new connection rejected with `401`, create a fresh subscription with your still-valid API key and repeat initialization. For `403`, fix the entitlement or key state; do not retry indefinitely. On token expiry, renew the subscription rather than repeatedly reopening the expired URL.

Close unused streams explicitly: `EventSource.close()` in browsers, `AbortController.abort()` for `fetch`, or close the HTTP response/context in Python. Closing the connection releases that consumer; no public delete-subscription operation is required for cleanup.

Next: [Complete lifecycle samples](/guides/streaming/lifecycle) or [NFL model-specific state rules](/guides/streaming/models).
