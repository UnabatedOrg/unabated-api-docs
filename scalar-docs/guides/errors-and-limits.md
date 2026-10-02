# Handle errors and request limits

**Available for: Free API · Concierge API · Enterprise API.** The five-second odds interval below applies to Free API keys; other limits depend on your API tier.

Check the HTTP status first. For endpoints using the public envelope, also check `success` and `messages` before reading `data`. Bet-slip operations use a direct status object instead; see their [lifecycle guide](https://docs.unabated.com/guides/bet-slips).

## Know what the response means

| Signal | Meaning | Recovery |
| --- | --- | --- |
| `400` | Invalid request, identifier, parameter, or body | Correct the input; check the operation schema and discovery data |
| `401` | Authentication missing or invalid | Check the header, API base URL, and active key |
| `403` | Endpoint or data is unavailable for your API tier or Enterprise API agreement | Check the endpoint's available tiers and data coverage; repeating the call does not change your tier |
| `404` | The requested resource or selection was not found, where emitted by that operation | Refresh the relevant data and use a current identifier |
| `429` | Free odds request arrived before the key's next allowed interval | Wait for `Retry-After`; coordinate all odds calls using that key |
| `503` | Odds access or the delayed snapshot is temporarily unavailable | Respect `Retry-After` and use bounded backoff |
| Other `5xx` or network timeout | Processing, upstream, or transport failure | Preserve useful context; retry suitable read operations with a bound, and surface persistent failures |
| HTTP success with `success: false` | The public operation could not complete successfully | Read `messages`; do not assume `data` exists |
| HTTP success with bet-slip `status: "error"` or `"Error"` | Generation/status processing failed | Read `details` and `message`; stop the lifecycle rather than polling indefinitely |

Error bodies are not all the same shape. Middleware can return a `message` object; some operations return plain text or framework validation errors. Inspect status and content type before assuming every error has a `data` envelope.

## Free odds: one scheduler per key

Allow **one odds call every five seconds per API key, shared across all odds endpoints**. A call for NFL consumes the same interval as a call for NBA, props, or futures using that key. Requests served from an odds cache still go through admission.

Do not create one independent five-second timer per endpoint. If multiple processes share a key, coordinate their requests. Sequential polling should schedule the next call after the previous request and interval have completed.

This shared interval applies to odds endpoints. Discovery and bet-slip status requests do not consume that odds interval; keep their polling bounded too.

### Retry a read safely

This Node.js 20+ example serializes calls made through **one instance** of the client. A distributed integration must coordinate across its processes too. It honors `Retry-After`, bounds attempts, and uses a timeout. Set `UNABATED_API_KEY` securely and set `UNABATED_API_BASE_URL` explicitly to the [API base URL](https://docs.unabated.com/start/authentication#api-base-url), `https://data.unabated.com`. The example stops if the base URL is missing.

```javascript
const key = process.env.UNABATED_API_KEY;
if (!key) throw new Error('Set UNABATED_API_KEY');
const base = process.env.UNABATED_API_BASE_URL;
if (!base) throw new Error('Set UNABATED_API_BASE_URL to https://data.unabated.com');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let queue = Promise.resolve();
let nextRequestAt = 0;

function retryDelay(response, fallbackMs) {
  const value = response.headers.get('Retry-After');
  if (!value) return fallbackMs;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : fallbackMs;
}

function getFreeOdds(path) {
  const result = queue.then(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await sleep(Math.max(0, nextRequestAt - Date.now()));
      // Reserve locally before sending; no parallel odds requests from this client.
      nextRequestAt = Date.now() + 5_000;
      const response = await fetch(`${base}${path}`, {
        headers: { 'X-Api-Key': key, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if ((response.status === 429 || response.status === 503) && attempt < 2) {
        const delay = retryDelay(response, 5_000 * (attempt + 1));
        await response.arrayBuffer(); // Consume the response before retrying.
        nextRequestAt = Math.max(nextRequestAt, Date.now() + delay);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const body = await response.json();
      if (body.success !== true) throw new Error((body.messages ?? []).join('; '));
      return body.data;
    }
    throw new Error('Retry limit reached');
  });
  queue = result.then(() => undefined, () => undefined);
  return result;
}

const nfl = await getFreeOdds('/market/nfl/straight/odds');
const nba = await getFreeOdds('/market/nba/straight/odds');
console.log(Object.keys(nfl?.odds ?? {}), Object.keys(nba?.odds ?? {}));
```

The example retries only explicit temporary odds responses. It does not retry `401`/`403`, resubmit bet-slip generation, or silently fetch live data after a Free failure. Choose an appropriate overall deadline for your application.

## Keep freshness separate from polling

Free data is delayed by at least 15 seconds. Polling more often cannot remove that delay. An individual market may not have changed for minutes, so line timestamps can be older than the minimum delay. A temporary snapshot failure should be visible to your application; do not substitute an unrelated stale board without labeling it.

Live access also does not mean every line changes on every request. Cache metadata separately from changing prices and show the relevant update context. See [response concepts](https://docs.unabated.com/guides/response-concepts).

## Investigate without exposing credentials

Record the method/path, timestamp, response status, safe response messages, and any nonsecret request identifier your integration receives. Redact `X-Api-Key` headers and signed stream URLs. For a bet-slip issue, preserve `requestId` so you can resume status checks or report the specific request without creating another one.
