# Events and filters

**Available for: Concierge API · Enterprise API**

Specify the event families your application actually consumes. Omitted or empty `eventTypes` currently defaults to **`market_line_update` only**; it does not subscribe you to every event family.

## Subscription request

```json
{
  "eventTypes": ["market_line_update", "event_update"],
  "leagueIds": [5],
  "eventIds": [],
  "marketTypeIds": [1],
  "marketSourceIds": [7],
  "betTypeIds": [1, 2, 3],
  "includeSnapshot": false
}
```

These are sample IDs, not a current list of available leagues or books. Use `GET /league`, `GET /market-type`, `GET /bettype`, `GET /event/{league}/upcoming`, and `GET /market/{league}/{marketType}/sources` to discover the data you need.

| Field | Type | Behavior |
| --- | --- | --- |
| `eventTypes` | `string[]` | Event families to deliver; defaults to `market_line_update`. Use exact names below. |
| `leagueIds` | `int[]` | Limits league-scoped messages. Concierge API remains restricted to its five professional U.S. sports. |
| `eventIds` | `long[]` | Limits individual lines within **market-line updates and market-line snapshots** by `market.eventId`. It does not filter every event family. |
| `marketTypeIds` | `int[]` | Limits market-line updates and snapshots by market type. |
| `marketSourceIds` | `long[]` | Limits source-scoped messages and the lines/alternates within market-line updates and snapshots. |
| `betTypeIds` | `long[]` | Limits market-line updates and snapshots, and market metadata updates. |
| `includeSnapshot` | `boolean` | Requests initial market-line snapshot chunks when the server snapshot feature is enabled; defaults to `false`. |

Omitted or empty dimension arrays request no additional client filter **within your API tier's data coverage**. The server can narrow requested filters to that coverage. An empty resulting set is not an all-data wildcard.

Unknown league, market type, market source, or bet type values can return `400`. A valid subscription can also receive no messages when no available data matches. Check your API tier after a `403`; widening filters or repeating requests does not change the tier's coverage.

<scalar-callout type="warning">

`eventIds` currently narrows market-line data only. If you also request `event_update`, `market_update`, or model events, filter those payloads by their own event IDs in your application. A sportsbook filter does not filter scores or the game clock.

</scalar-callout>

## Event names and JSON roots

Data event payloads use a `data` envelope with a camel-case root. Snapshot completion and gap notices use the smaller control shapes shown below.

| SSE event | JSON root | Purpose and availability |
| --- | --- | --- |
| `market_line_update` | `data.marketLineUpdate` | Changes to prices, points, availability, liquidity, alternate lines, and line metadata. Concierge API and Enterprise API within scope. |
| `event_update` | `data.eventUpdate` | Event state, clock, scores, timing, and metadata. Concierge API and Enterprise API within scope. |
| `market_update` | `data.marketUpdate` | Market lifecycle and metadata. Concierge API and Enterprise API within scope. |
| `market_source_update` | `data.marketSourceUpdate` | Sportsbook or market-source metadata. Concierge API and Enterprise API within scope. |
| `in_game_fair_price_update` | `data.inGameFairPriceUpdate` | NFL model state. Enterprise API. |
| `event_lineup` | `data.eventLineup` | Lineup update. Enterprise API. |
| `player_news` | `data.playerNews` | Player-news update. Enterprise API. |
| `player_percent_to_play` | `data.playerPercentToPlay` | Player availability update. Enterprise API. |
| `play_by_play` | `data.playByPlay` | Play-by-play state. Enterprise API. |
| `market_line_snapshot` | `data.marketLineUpdate` | Requested initial market-line snapshot chunk; same line shape as a market-line update. |
| `market_line_snapshot_complete` | top-level `lineCount`, `sequence`, `ready` | Initial snapshot completion/readiness control frame. |
| `gap` | top-level `droppedEvents` | Automatic warning that an already-open connection discarded queued events because the consumer fell behind. Repair state from REST. |

The control event names cannot be used as ordinary subscription event types. Request `includeSnapshot` to ask for snapshots; listen for `gap` on every connection. The server sends `gap` automatically when queued events are dropped; there is no endpoint to call to request it. It does not replay changes missed between a REST snapshot and opening SSE. Address that race by [opening and buffering SSE before loading REST, then reconciling ordering](/guides/streaming/recovery#rest-initialization-with-buffered-updates). Do not infer commercial feature availability just because an event name exists in the protocol.

## Filter applicability

| Family | League | Event ID | Market type | Market source | Bet type |
| --- | --- | --- | --- | --- | --- |
| Market-line updates and snapshots | Yes | Yes, within lines | Yes | Yes, within lines and alternates | Yes, within lines |
| Event updates | Yes | No | No | No | No |
| Market updates | Yes | No | No | No | Yes |
| Market-source updates | No | No | No | Yes | No |
| NFL in-game fair-price updates | Yes | No | No | No | No |
| Lineups, player news, percent-to-play, play-by-play | League-scoped where metadata is present | No | No | No | No |

Your API tier's data coverage applies even to event families without a user-specified filter dimension. A metadata notification does not expand that coverage.

## Market-line updates

One frame can contain multiple lines:

```json
{
  "data": {
    "marketLineUpdate": {
      "marketSourceGroup": "STANDARD",
      "leagueId": 5,
      "marketTypeId": 1,
      "correlationId": null,
      "messageId": "33a224985bed44849a4641ba9fdba59b0",
      "marketLines": [
        {
          "marketId": 308238780,
          "marketLineId": 17971985415,
          "marketSourceId": 7,
          "points": null,
          "price": 135,
          "sourcePrice": 135.0,
          "sourceFormat": 1,
          "liquidity": null,
          "statusId": 1,
          "disabled": false,
          "sequenceNumber": 1788207551574,
          "freshnessExpiresAt": null,
          "modifiedOn": "2026-10-01T15:00:00Z",
          "bestAltPrice": null,
          "bestAltPoints": null,
          "alternateLines": [],
          "marketLineKey": "illustrative.path.to.a.line",
          "market": {
            "eventId": 110845,
            "marketTypeId": 1,
            "betTypeId": 1,
            "teamId": 56,
            "sideIndex": 0,
            "periodTypeId": 20,
            "personId": null,
            "live": false,
            "modifiedOn": "2026-10-01T15:00:00Z"
          }
        }
      ]
    }
  }
}
```

This is illustrative sample output. Fields depend on the line and your API tier's datasets; additional fields may appear.

- Identify a source line by `marketLineId`. Use `marketSourceId` and market metadata to associate it with the correct book and selection.
- Use `marketLineKey` as a location hint into the REST hierarchy; do not parse its segments to derive league, book, or betting semantics.
- Reject stale line updates using `sequenceNumber` and/or `modifiedOn`. Neither the SSE frame `id` nor `messageId` is a numeric ordering value.
- Apply `disabled`, `statusId`, `freshnessExpiresAt`, liquidity, and alternate-line changes even when price and points remain unchanged.
- A streaming `null` can explicitly clear a field. Do not drop all null-valued fields while merging.
- Preserve unrelated REST-only metadata. Retain a returned `deepLink` for price or status changes only when the selection's points remain unchanged. If points change, invalidate the link and obtain a replacement through a workflow available to your API tier before publishing it; apply this rule to each alternate too. Concierge API does not include `GET /deeplink`, and a link is not required to collect odds. The stream does not resend deep links with updates.

Market-line status is a protocol enum: `1` Available, `2` Unavailable, `3` PriceUnknown. `disabled: true` also means the line should not be offered as an available wager. `freshnessExpiresAt`, when present, is a UTC freshness boundary for the line; stop presenting an expired quote as current.

### Alternate lines and liquidity

An update may carry alternate or milestone values while the top-level `points` and `price` are null. Inspect `alternateLines` before deciding that no actionable values exist.

```json
{
  "marketLineId": 17971985469,
  "marketSourceId": 7,
  "points": null,
  "price": null,
  "alternateLines": [
    {
      "marketLineId": 17971985470,
      "marketSourceId": 7,
      "points": -1.0,
      "price": 119,
      "sourcePrice": 119.0,
      "sourceFormat": 1,
      "liquidity": 5000.0,
      "alternateNumber": 1,
      "statusId": 1,
      "disabled": false,
      "sequenceNumber": 1788207551574,
      "freshnessExpiresAt": null,
      "modifiedOn": "2026-10-01T15:00:00Z"
    }
  ]
}
```

Match alternates by `marketLineId`, retain their own ordering fields, and process liquidity independently of prices. Do not assume the outer line is always the line currently displayed to your users.

## Event and metadata updates

<scalar-detail title="Event updates">

`data.eventUpdate` contains `leagueId`, `change`, `event`, `correlationId`, and `messageId`. The embedded event can contain `eventId`, status, start/end times, period, game clock, and `eventTeams` with scores. Exact fields vary by league and game state.

```json
{
  "data": {
    "eventUpdate": {
      "leagueId": 5,
      "change": "updated",
      "event": {
        "eventId": 110845,
        "leagueId": 5,
        "statusId": 2,
        "statusName": "Live",
        "eventStart": "2026-10-01T14:00:00Z",
        "gameClock": "05:32",
        "eventTeams": [
          {"teamId": 56, "score": 3, "sideIndex": 0},
          {"teamId": 34, "score": 4, "sideIndex": 1}
        ],
        "modifiedOn": "2026-10-01T15:00:00Z"
      },
      "correlationId": null,
      "messageId": "33a224985bed44849a4641ba9fdba59b0"
    }
  }
}
```

Identify the event by `eventId` and reject older `modifiedOn` values when available. An `eventIds` subscription filter does not currently narrow this family; filter locally if you only need one game.

</scalar-detail>

<scalar-detail title="Market and source metadata">

`data.marketUpdate` contains `leagueId`, `updateType`, and `market`, plus message/correlation IDs. Use the identifiers inside `market` to locate its event and selection; preserve the documented lifecycle state rather than assuming every message means a new active market.

`data.marketSourceUpdate` contains `marketSource`, plus message/correlation IDs. Use `marketSource.id` as the stable book/source identifier. Changes can include active state or separate straight, props, and futures availability.

</scalar-detail>

Next: [Connect with a complete sample](/guides/streaming/lifecycle) or [handle snapshots and reconnects](/guides/streaming/recovery).
