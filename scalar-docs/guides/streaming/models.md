# NFL in-game models

**Available for: Enterprise API**

The NFL in-game model estimates probabilities for betting outcomes using live game state. A fair price expresses that model estimate as American odds, so your application can compare it with a sportsbook's quoted price.

Retrieve current model state through REST or receive changes through the `in_game_fair_price_update` SSE event. NFL in-game models are available through Enterprise API and are not part of Free API or Concierge API. Contact Unabated to include this dataset in your Enterprise API agreement.

## Read current state or subscribe to changes

| Operation | Purpose |
| --- | --- |
| `GET /market/nfl/in-game-fair-prices` | REST snapshot of the current indexed NFL event states. |
| `POST /subscriptions` with `in_game_fair_price_update` | Create a model stream subscription. |
| Signed `GET /sse/{subscriptionId}` | Receive the model updates for that subscription. |

Request the model event explicitly; it is not included in the default `market_line_update` subscription.

```json
{
  "eventTypes": ["in_game_fair_price_update"],
  "leagueIds": [1]
}
```

The example uses the NFL league ID from the current protocol. Use discovery data to map your league IDs. `leagueIds` applies to model events. `eventIds`, `marketTypeIds`, `marketSourceIds`, and `betTypeIds` do **not** narrow this family; filter `fairPriceSet.eventId` locally if you need only one game.

A model request outside your Enterprise API agreement returns `403`. Confirm that your agreement includes NFL in-game models before requesting this dataset.

## Full state replacement per event

```json
{
  "data": {
    "inGameFairPriceUpdate": {
      "correlationId": "example-output-id",
      "messageId": "33a224985bed44849a4641ba9fdba59b0",
      "fairPriceSet": {
        "sourceKey": "unabated_in_game",
        "leagueId": 1,
        "eventId": 123456,
        "outputId": "example-output-id",
        "status": "ready",
        "statusReason": "",
        "producedUtc": "2026-10-01T15:00:00Z",
        "statusChangedUtc": "2026-10-01T15:00:00Z",
        "schemaVersion": "1.3",
        "checkpointType": "period_end",
        "periodNumber": 2,
        "markets": [
          {
            "marketId": 122333,
            "probabilities": [
              {
                "price": -157,
                "method": 3,
                "points": 4.5,
                "probability": 0.610304932599433
              }
            ]
          }
        ]
      }
    }
  }
}
```

This is sample output, not a currently available bet or guaranteed market ladder. The state is keyed by `leagueId` and `eventId`. `outputId` identifies the model output and is also used as its correlation ID. Treat `fairPriceSet` as a full replacement for that event's model state; do not combine market ladders from separate outputs.

## Ready, expired, and unavailable

| `status` | Application behavior |
| --- | --- |
| `ready` | The `markets` ladder is active and can drive fair-price or edge calculations. |
| `expired` | Explicit state transition. Retain the previous ladder only for inactive/historical display; remove it from active calculations. |
| `unavailable` | The current valid model state could not be established. Clear active fair prices and calculations for the event. |

Use `probability` as the canonical decimal probability. `price` is an optional American-odds representation and can be null; `points` is the market point level, and `method` identifies the probability method.

Use `periodNumber`, `producedUtc`, and `statusChangedUtc` to reject stale outputs or transitions according to their model context. Do not sort opaque `outputId` strings to decide which output is newer. A transition for the same output can change its active state without creating a new ladder.

<scalar-callout type="warning">

Only `ready` state may drive active calculations. Do not invent a model expiration time from `producedUtc`: model expiry is an explicit `expired` or `unavailable` state transition. During an uncertain connection or failed resynchronization, suspend active calculations until you have verified current state.

</scalar-callout>

## Initialize and repair model state

Open the model SSE subscription, buffer model frames within a bounded budget, and fetch `GET /market/nfl/in-game-fair-prices`. The REST response's `data` array contains current indexed event states. Replace the local view with that snapshot, then apply newer buffered states using the model-specific ordering fields.

Repeat this on a prolonged interruption, a `gap` notice, or any uncertain continuity. If the REST request fails, returns `success: false`, or contains no valid state for an event, clear or suspend its active fair-price calculations. Do not keep using an old ladder as if it were current.

The optional `includeSnapshot` market-line feature does not send a model-state snapshot. Fetch the model REST snapshot separately even when your connection also requests ordinary odds updates. See [general recovery](/guides/streaming/recovery) for the limits of replay and snapshot consistency.

## Agent task

```text
Integrate Unabated NFL in-game fair prices for Enterprise API. Confirm that
our agreement includes this dataset. Use https://data.unabated.com and obtain
my authorization before making API requests. Create the model SSE subscription, load its REST
snapshot, and maintain full replacement state by leagueId and eventId.
Only ready output may drive calculations. Handle expired and unavailable
transitions, reject stale output, suspend calculations on uncertain state,
and resynchronize after gaps. Use the documented API tier availability
when choosing event families.
```
