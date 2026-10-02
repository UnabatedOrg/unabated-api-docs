# Discover leagues, books, and identifiers

**Available for: Free API · Concierge API · Enterprise API.** Responses depend on your API tier's data coverage; discovering an identifier does not expand that coverage.

Use discovery endpoints as the source of current IDs and names. This keeps your integration current as leagues, bet types, periods, and sportsbook coverage change.

## Choose the endpoint for the job

| What you need | Endpoint | What to use next |
| --- | --- | --- |
| League names and IDs | `GET /league`, `GET /league/{id}` | `name` in league-based paths; numeric `id` in filters that require IDs |
| Bet types | `GET /bettype` | `id` in odds `betTypeId` filters and streaming bet type filters |
| Market types | `GET /market-type` | Use `straight`, `futures`, or `props` for REST odds paths |
| Period types | `GET /period-type`, `GET /period-type/{league}` | Period type IDs when reading odds groups |
| Available sportsbook sources | `GET /market/{league}/{marketType}/sources` | Source `id` and `name`; streaming market source filters use IDs |
| Upcoming events | `GET /event/{league}/upcoming` | Event IDs, names, start times, and team context |
| Teams and people in an odds board | `GET /market/{league}/{marketType}/teams`, `GET /market/{league}/{marketType}/people` | IDs used in that board |
| League teams and players | `GET /team/{league}`, `GET /player/{league}` | League-scoped identities |
| Seasons and tournaments | `GET /season/{league}`, `GET /tournament/{league}` | Additional event context |

The REST odds path uses market type names; an SSE filter that requests a market type ID needs the corresponding numeric value. Follow the schema for the operation you are calling instead of assuming the two formats are interchangeable.

## Read a current league list

Set `UNABATED_API_KEY` securely and set `UNABATED_API_BASE_URL` explicitly to the [API base URL](/start/authentication#api-base-url), `https://data.unabated.com`. The examples stop if the base URL is missing and print league IDs and route names when the request succeeds.

<scalar-tabs>
<scalar-tab title="cURL">

```bash
curl --fail-with-body --connect-timeout 5 --max-time 20 \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  --header "Accept: application/json" \
  "${UNABATED_API_BASE_URL:?Set UNABATED_API_BASE_URL to https://data.unabated.com}/league"
```

</scalar-tab>
<scalar-tab title="JavaScript">

Node.js 20 or later; run on your server.

```javascript
const key = process.env.UNABATED_API_KEY;
if (!key) throw new Error('Set UNABATED_API_KEY');
const base = process.env.UNABATED_API_BASE_URL;
if (!base) throw new Error('Set UNABATED_API_BASE_URL to https://data.unabated.com');
const response = await fetch(`${base}/league`, {
  headers: { 'X-Api-Key': key, Accept: 'application/json' },
  signal: AbortSignal.timeout(20_000),
});
if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
const body = await response.json();
if (body.success !== true) throw new Error((body.messages ?? []).join('; '));
for (const league of body.data ?? []) {
  console.log(league.id, league.name, league.fullName);
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
    f'{base}/league',
    headers={'X-Api-Key': os.environ['UNABATED_API_KEY']},
    timeout=(5, 20),
)
response.raise_for_status()
body = response.json()
if body.get('success') is not True:
    raise RuntimeError('; '.join(body.get('messages', [])))
for league in body.get('data') or []:
    print(league['id'], league['name'], league.get('fullName', ''))
```

</scalar-tab>
</scalar-tabs>

After choosing a returned league name, ask which books are present for the market:

```bash
# Replace nfl with a league name from /league.
curl --fail-with-body --connect-timeout 5 --max-time 20 \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  "${UNABATED_API_BASE_URL:?Set UNABATED_API_BASE_URL to https://data.unabated.com}/market/nfl/straight/sources"
```

The source response contains `id`, `name`, logo URLs, and status fields. A source being present does not guarantee a usable line for every event. Inspect the returned odds and line status.

## Cache metadata deliberately

Cache relatively stable lookup data in your application and refresh it periodically. Several discovery operations accept `changedSince`; use it only where the endpoint reference documents it. Store the time of your last successful refresh and preserve existing records when processing changes.

There is no documented event-status or market-line-status discovery endpoint. Their stable numeric values are explained in [response concepts](/guides/response-concepts); do not invent a route for them.

Next: [read an odds board](/guides/odds) using current league and bet type identifiers.
