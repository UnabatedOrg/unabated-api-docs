# Snapshots and recovery

**Available for: Concierge API · Enterprise API**

An open connection is useful only if your application knows how to build and repair its state. Initialize from the REST odds board, apply updates using stable IDs and ordering fields, and resynchronize whenever continuity is uncertain.

## No snapshot on subscribe

Snapshot-on-subscribe is not currently available. The stream sends changes only, so load the current board through REST and apply `market_line_update` frames on top of it. The `includeSnapshot` subscription field is reserved: `true` currently sends no `market_line_snapshot` chunks and no `market_line_snapshot_complete` frame, and live delivery starts as usual.

## REST initialization with buffered updates

Open SSE and begin buffering updates **before** loading REST to address the REST/stream race:

1. Create a narrowly filtered subscription and open its returned signed URL.
2. Once the connection opens, begin buffering incoming application events, then fetch the relevant REST odds and event data.
3. Build indexes keyed by `marketLineId` and `eventId` from the REST response. Retain descriptive metadata and any returned deep links alongside their selection points; a link is not required to initialize the odds store.
4. Apply the buffered events with the same ordering checks you will use during live delivery.
5. Switch to live processing and continue to repair gaps or missing metadata from REST.

For odds, fetch `GET /market/{league}/{marketType}/odds` for each league/market-type combination your subscription needs. Boards are rebuilt periodically, so a fresh board can be slightly older than updates you have already buffered; the ordering checks below keep the newer value. Futures are not streamed, so poll the futures board instead. A league or event name in a REST path is not interchangeable with the numeric IDs used in a subscription body; discover and map both through the reference data.

Bound the buffer by bytes/events and the REST request by a timeout. If either budget is exceeded, discard the incomplete local view, narrow the subscription if appropriate, and start a fresh synchronization attempt with backoff. Do not keep growing a queue indefinitely.

This approach covers updates received while REST loads, but **does not create a universal gap-free guarantee**. REST freshness, reconnect retention, pod changes, source behavior, and consumer overload can all affect continuity. Reconcile authoritative state whenever you cannot prove that your local state is current.

## Apply updates without moving backward

For the same market-line identity:

- When comparable `sequenceNumber` values are present, reject a lower incoming value.
- When comparable `modifiedOn` timestamps are present, reject an older incoming timestamp. If clocks disagree, do not blindly overwrite a state you know is newer; reconcile it from REST.
- Equal ordering values can still carry meaningful changes. Do not use “equal version” alone to ignore a status, liquidity, alternate, or freshness update.
- When ordering information is missing, use cautious processing and periodic REST reconciliation. Arrival order across reconnects is not proof of source freshness.
- Merge explicit streaming fields into the existing record; preserve unrelated REST-only fields. Process explicit nulls instead of treating them as missing fields.
- Retain a previous `deepLink` only for the same selection with unchanged points. The URL encodes points, so invalidate it whenever points change, including on an alternate. Obtain a matching replacement through a workflow available to your API tier before publishing a link. Do not publish a previous-points URL with an updated line.

Concierge API does not include `GET /deeplink`; its odds store must continue to collect data without a link. When a replacement-link fetch is available and finishes, check `data.pointsMatched` first: if it is `false`, the link was built for different points (see [Check the requested points](/guides/deep-links#check-the-requested-points)) and must not be attached to the requested line. Then verify that its selection points still match your current local line before attaching it. Another SSE update can move the points while the REST request is in flight.

A minimal update guard looks like this. It invalidates links for changed selection points and merges each alternate independently. Integrate REST synchronization and your hierarchy indexes around it. If your API tier supports link generation, schedule replacement-link requests as needed; publish a link only after retrieving the correct selection URL:

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
    // SSE carries no replacement URL. A new link requires a supported workflow.
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

The server automatically sends `gap` when a slow consumer's bounded queue on an already-open connection overflows. It keeps the stream open, discards older queued events, and sends a notice before the next data delivery. You cannot subscribe to `gap` in `eventTypes` or call an endpoint to request it:

```text
event: gap
data: {"droppedEvents":17}

```

This control frame has no `id:`. `droppedEvents` is the number discarded since the previous notice, not a lifetime total. It indicates lost delivery on this connection; it is not a guarantee that all other forms of missed history will be reported.

`gap` does not replay changes missed between a REST snapshot and opening SSE. Address that race separately by [opening and buffering SSE before loading REST, then reconciling ordering](/guides/streaming/recovery#rest-initialization-with-buffered-updates).

On `gap`, mark affected state as needing repair, start REST resynchronization, and buffer further messages within a bounded budget until you can apply them to refreshed state. If the application is persistently falling behind, narrow filters or improve processing rather than repeatedly reconnecting into the same overload.

## Expiry, revocation, and cleanup

An API-key-created subscription is currently valid for 24 hours. The creation response does not include an expiry field, so record when you created it and refresh the subscription before you depend on a longer-running connection. Do not decode signed tokens to build your client contract.

The API checks the current key and API tier when admitting a stream and periodically while it is open. Revoked keys, changes to your API tier, or expired subscriptions can close the connection; the next admission can return `401` or `403`. An already-started `200` stream cannot change its HTTP status after headers are sent.

For a new connection rejected with `401`, create a fresh subscription with your still-valid API key and repeat initialization. For `403`, confirm that the key is active and your API tier covers the request; do not retry indefinitely. On token expiry, renew the subscription rather than repeatedly reopening the expired URL.

Close unused streams explicitly: `EventSource.close()` in browsers, `AbortController.abort()` for `fetch`, or close the HTTP response/context in Python. Closing the connection releases that consumer; no public delete-subscription operation is required for cleanup.

Next: [Complete lifecycle samples](/guides/streaming/lifecycle).
