# Understand the response

**Available for: Free API · Concierge API · Enterprise API.** Fields and datasets can be omitted when not part of your API tier's data coverage.

The API uses structured identifiers, grouped odds, and explicit status fields. Read those fields directly and preserve their relationships in your integration.

## The public response envelope

Odds and many discovery operations return:

```json
{
  "data": {},
  "success": true,
  "messages": []
}
```

`data` is the operation-specific payload: an object, list, or dictionary according to the endpoint schema. Check `success` before reading it. `messages` carries explanatory messages when an operation cannot complete. `pagination` appears only for operations that supply pagination; do not assume every list is paginated.

Bet-slip generation and status, available to Free API and Enterprise API, are an exception: their responses are direct objects with `status`, `details`, and `requestId`. Concierge API does not include these operations. Middleware and validation errors may also use a different body shape. The [error guide](/guides/errors-and-limits) explains how to handle that distinction.

## Selection identity

| Field | Meaning |
| --- | --- |
| `leagueId` | League identity; discover names and IDs with `/league` |
| `eventId` | Event identity, shared by selections for that event |
| `periodTypeId` | Period being priced, such as a game or a portion of it; discover period definitions |
| `betTypeId` | Type of bet; discover its name, sides, and points behavior with `/bettype` |
| `sideIndex`, `sideName` | Side of the market and its display context |
| `teamId`, `personId` | Team/player selection context when applicable |
| `marketId` | Underlying market identity |
| `marketLineId` | Sportsbook market-line identity; also used for deep-link requests with Free API or Enterprise API |
| `marketSourceId` | Sportsbook/source identity; discover names with the scoped source endpoint |
| `points` | Selected spread/total/prop line where the bet uses points |

A market line can have alternate points. Keep the selected points with its identity; the same market-line ID does not make all alternate selections interchangeable. Preserve a returned deep link for the exact points you display.

Odds dictionaries group by league, period, pregame/live phase, market group, side, and source. Composite dictionary keys are grouping keys. Structured IDs and fields are the contract to use when comparing or joining records.

## Side index

These stable numeric values describe conventional sides:

| Value | Meaning |
| --- | --- |
| `0` | Away or over |
| `1` | Home or under |
| `2` | Tie or draw |

Use the group's bet type and `sideName` to understand the selection. Do not label every `0` as “away” when reading an over/under market, or assume every market has a draw side.

## Event status

| `statusId` | Meaning |
| --- | --- |
| `1` | Pre-game |
| `2` | Live |
| `3` | Final |
| `4` | Delayed |
| `5` | Postponed |
| `6` | Cancelled |

These are event/group statuses. A live event does not imply that every sportsbook line is currently available.

## Market-line status

| `statusId` | Meaning |
| --- | --- |
| `1` | Available |
| `2` | Unavailable |
| `3` | Price unknown |

Also inspect `disabled` and the presence of the required price/link fields. Do not show a disabled or unavailable line as an actionable bet merely because you still have its old URL. Source status fields have their own enum; use the source schema rather than applying this market-line table to them.

## Prices and optional fields

`price` is American odds. `points` can be absent for a selection without a points line. `openerPrice` and `openerPoints`, when present, describe the first captured line. `alternateLines` describes other available points/prices; use each alternate's own fields.

Source-specific price, format, and liquidity fields can vary across providers. Use `sourceFormat` and the reference schema when interpreting `sourcePrice`. Do not turn an omitted price into zero or assume that omitted liquidity means no liquidity.

Null fields can be omitted from JSON. Fields outside your API tier's datasets may be absent, and partner/source metadata can be absent when no mapping exists. Clients should tolerate missing optional fields and additional fields while still checking required contract values.

## Timestamps and ordering

`data.lastUpdated` in an odds response is Unix time in **milliseconds**, based on the newest included line modification. Convert it with `new Date(value)` in JavaScript, or divide by `1000` before passing it to Python's timestamp conversion. A value of `0` does not provide a useful observed update time.

`modifiedOn` identifies an individual record's modification time where provided. `sequenceNumber` and `freshnessExpiresAt` provide additional line context. The response timestamp does not mean every line changed at once; a delayed response can contain many unchanged selections.

When consuming live updates, apply the [streaming ordering and recovery rules](/guides/streaming/recovery). Do not compare SSE event IDs as if they were interchangeable with a market line's sequence number.

## Deep links are selection data

When a deep link is returned, use the one belonging to the displayed selection or alternate. Free odds links are generic Gambly URLs until you add your partner code. Price-only live updates can omit links; retain an existing link for the unchanged selection instead of clearing it whenever a delta lacks `deepLink`. Odds collection does not require a link.

Before publishing a link for a new selection or different points, obtain the correct current link rather than attaching a URL from a different line. The separate `GET /deeplink` endpoint is available to Free API and Enterprise API, not Concierge API. See [tracked deep links](/guides/deep-links) and [odds](/guides/odds).
