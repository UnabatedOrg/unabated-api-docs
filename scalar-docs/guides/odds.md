# Request and read odds

**Available for: Free API · Concierge API · Enterprise API.** Free API odds are delayed by at least 15 seconds and limited to included books. Concierge API covers NFL, NBA, MLB, NHL, and WNBA with live data. Enterprise API coverage follows your agreement.

`GET /market/{league}/{marketType}/odds`

Choose a league route name from [`GET /league`](/guides/discovery) and one market type: `straight`, `futures`, or `props`. The response contains a board grouped by league, period, event/market group, side, and sportsbook.

<scalar-callout type="info">
Free API permits one odds request every five seconds per API key, shared across all odds endpoints. Use one scheduler for that key, even when requesting different leagues or market types. Honor the response's `Retry-After` header on a `429`.
</scalar-callout>

## Make a request

Set `UNABATED_API_BASE_URL` explicitly to the [API base URL](/start/authentication#api-base-url), `https://data.unabated.com`. The examples stop if it is missing.

```bash
curl --fail-with-body --connect-timeout 5 --max-time 20 \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  --header "Accept: application/json" \
  "${UNABATED_API_BASE_URL:?Set UNABATED_API_BASE_URL to https://data.unabated.com}/market/nfl/straight/odds"
```

For a narrower response, add one or more `betTypeId` query parameters using IDs from `GET /bettype`:

```text
/market/nfl/straight/odds?betTypeId=BET_TYPE_ID&betTypeId=ANOTHER_BET_TYPE_ID
```

This route does not accept arbitrary sportsbook, event, or period filters. Fetch the permitted board and select the records your application needs from its structured fields.

## Navigate the response

Start at **`body.data.odds`**, after checking the HTTP status and `body.success`.

```text
data.odds
  → each league (leagueId)
    → periodTypes (periodTypeId)
      → pregame and live groups (eventId, eventName, betTypeId)
        → sides (sideIndex, sideName, teamId, personId)
          → marketSourceLines (marketSourceId, marketLineId,
                             points, price, deepLink, alternateLines)
```

Dictionary keys group data for efficient access. Use fields such as `eventId`, `betTypeId`, `sideIndex`, and `marketSourceId` for identity; do not reverse-engineer a key's spelling to obtain those values.

### Extract available selections

These examples request one board and print selections with deep links. They do not place bets. Set `UNABATED_API_KEY` securely. Override the league or market type with values you have discovered.

<scalar-tabs>
<scalar-tab title="JavaScript">

Node.js 20 or later; save as `odds.mjs` and run `node odds.mjs` on your server.

```javascript
const key = process.env.UNABATED_API_KEY;
if (!key) throw new Error('Set UNABATED_API_KEY');
const base = process.env.UNABATED_API_BASE_URL;
if (!base) throw new Error('Set UNABATED_API_BASE_URL to https://data.unabated.com');
const response = await fetch(`${base}/market/nfl/straight/odds`, {
  headers: { 'X-Api-Key': key, Accept: 'application/json' },
  signal: AbortSignal.timeout(20_000),
});
if (!response.ok) {
  const retry = response.headers.get('Retry-After');
  throw new Error(`HTTP ${response.status}; Retry-After=${retry ?? 'none'}`);
}
const body = await response.json();
if (body.success !== true) throw new Error((body.messages ?? []).join('; '));

for (const league of Object.values(body.data?.odds ?? {})) {
  for (const period of Object.values(league.periodTypes ?? {})) {
    for (const groups of [period.pregame, period.live]) {
      for (const group of Object.values(groups ?? {})) {
        for (const side of Object.values(group.sides ?? {})) {
          for (const line of Object.values(side.marketSourceLines ?? {})) {
            if (line.statusId !== 1 || line.disabled || !line.deepLink) continue;
            console.log({
              event: group.eventName, eventId: group.eventId,
              betTypeId: group.betTypeId, periodTypeId: period.periodTypeId,
              side: side.sideName, sourceId: line.marketSourceId,
              lineId: line.marketLineId, points: line.points,
              price: line.price, deepLink: line.deepLink,
            });
          }
        }
      }
    }
  }
}
```

</scalar-tab>
<scalar-tab title="Python">

Python 3.10 or later; install `requests` with `python -m pip install requests`.

```python
import os
import requests

base = os.environ['UNABATED_API_BASE_URL']
response = requests.get(
    f'{base}/market/nfl/straight/odds',
    headers={'X-Api-Key': os.environ['UNABATED_API_KEY']},
    timeout=(5, 20),
)
response.raise_for_status()
body = response.json()
if body.get('success') is not True:
    raise RuntimeError('; '.join(body.get('messages', [])))
for league in ((body.get('data') or {}).get('odds') or {}).values():
    for period in (league.get('periodTypes') or {}).values():
        for phase in ('pregame', 'live'):
            for group in (period.get(phase) or {}).values():
                for side in (group.get('sides') or {}).values():
                    for line in (side.get('marketSourceLines') or {}).values():
                        if line.get('statusId') != 1 or line.get('disabled') or not line.get('deepLink'):
                            continue
                        print({
                            'event': group.get('eventName'),
                            'eventId': group.get('eventId'),
                            'betTypeId': group.get('betTypeId'),
                            'side': side.get('sideName'),
                            'sourceId': line.get('marketSourceId'),
                            'lineId': line.get('marketLineId'),
                            'points': line.get('points'),
                            'price': line.get('price'),
                            'deepLink': line['deepLink'],
                        })
```

</scalar-tab>
</scalar-tabs>

## Prices, alternates, and links

`price` is the American odds value. `points` identifies the line for a spread, total, or prop; it can be absent for selections that do not use points. `sourcePrice`, `sourceFormat`, and `liquidity` may supply source-specific information; consult the schema rather than assuming all providers use the same representation.

`alternateLines` contains alternate points/prices for the selection. Read each alternate's own `points`, `price`, status, and `deepLink`. Do not attach the main line's URL to an alternate with different points.

Use the returned `deepLink` when available. For Free content partners, add the partner code before publishing; the [deep-link guide](/guides/deep-links) shows the complete process. A link resolves the destination at click time; the sportsbook can have changed its price or availability since your response.

## Freshness and empty boards

`data.lastUpdated` is Unix time in milliseconds derived from the newest included line modification. It is not the HTTP response time or a guarantee that every line changed then. Individual lines can have `modifiedOn`, `sequenceNumber`, and `freshnessExpiresAt` for finer context.

Free odds come from a delayed snapshot. Do not fall back to a different key or a live dataset to hide a delayed-data error. A temporary delayed snapshot failure can return `503` with `Retry-After: 5`.

An empty board or a missing book can be valid: there may be no current offers, the market may not exist for that league, or the key may lack that scope. Inspect discovered sources and the response messages. See [errors and limits](/guides/errors-and-limits) for recovery and [response concepts](/guides/response-concepts) for status values.
