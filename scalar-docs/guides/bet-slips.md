# Generate a bet slip

**Available for: Free API · Concierge API · Enterprise API.** Requires bet-slip access and remains within your key's data scope. Free content partner requests are limited to included books and carry partner attribution.

Turn a text description or image into matched sportsbook bet slips. Generation is asynchronous: submit content, keep the returned request ID, and poll for the result. A successful submission does not mean every requested leg has matched.

## 1. Submit content

`POST /api/v1/bet/generate`

For a text request, send `type: "text"` and `content.text`. The example prompt describes the kind of bet to find; its results depend on current availability.

```bash
curl --fail-with-body --connect-timeout 5 --max-time 30 \
  --request POST \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{"type":"text","generateMobileLinks":true,"content":{"text":"NFL three-game moneyline parlay"}}' \
  "${UNABATED_API_BASE_URL:-https://data.unabated.com}/api/v1/bet/generate"
```

The response is a **direct object**, not the `data/success/messages` envelope used by odds endpoints. A representative accepted response looks like:

```json
{
  "status": "pending",
  "details": "text: NFL three-game moneyline parlay",
  "requestId": "00000000-0000-4000-8000-000000000001"
}
```

The illustrated ID is a placeholder. Use your response's `requestId`. If the returned `status` indicates an error, stop and read `details`; do not poll the example ID or assume an HTTP `200` means generation succeeded.

### Image input

Use `type: "image"` with **one** image representation:

```json
{
  "type": "image",
  "generateMobileLinks": true,
  "content": { "imageUrl": "https://your-site.example/bet-slip.png" }
}
```

Alternatively, send `content.base64String` containing the image data. A `compression` field is available for base64 input; follow the request schema for supported usage. Only submit an image you are authorized to process. `generateMobileLinks` defaults to `true`; set it to `false` when requesting desktop-oriented links.

## 2. Poll the request status

`GET /api/v1/bet/status/{guid}`

```bash
curl --fail-with-body --connect-timeout 5 --max-time 20 \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  "${UNABATED_API_BASE_URL:-https://data.unabated.com}/api/v1/bet/status/${UNABATED_REQUEST_ID}"
```

| Status | What to do |
| --- | --- |
| `Processing` | Wait briefly and poll again, within your application's deadline |
| `Complete` | Read `betSlips` and inspect matched selections |
| `Error` | Stop, read `details`/`message`, and report the failure |

Status responses also use a direct object. A request remains associated with its owner; use the same account's key when polling.

## Complete lifecycle example

These server-side examples use a two-second poll interval as a client recommendation, not an endpoint limit. They stop after a bounded wait and do not automatically resubmit a generation request after a timeout, which could create duplicate work.

<scalar-tabs>
<scalar-tab title="JavaScript">

Node.js 20 or later; save as `bet-slip.mjs` and run on your server with `UNABATED_API_KEY` set.

```javascript
const key = process.env.UNABATED_API_KEY;
if (!key) throw new Error('Set UNABATED_API_KEY');
const base = process.env.UNABATED_API_BASE_URL ?? 'https://data.unabated.com';
const headers = { 'X-Api-Key': key, 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options, headers, signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

const submitted = await request('/api/v1/bet/generate', {
  method: 'POST',
  body: JSON.stringify({
    type: 'text', generateMobileLinks: true,
    content: { text: 'NFL three-game moneyline parlay' },
  }),
});
if (submitted.status?.toLowerCase() === 'error' || !submitted.requestId) {
  throw new Error(submitted.details ?? 'Generation was not accepted');
}

const deadline = Date.now() + 60_000;
let completed;
while (Date.now() < deadline) {
  const result = await request(`/api/v1/bet/status/${submitted.requestId}`);
  const status = result.status?.toLowerCase();
  if (status === 'complete') { completed = result; break; }
  if (status === 'error') throw new Error(result.message ?? result.details ?? 'Generation failed');
  if (status !== 'processing') throw new Error(`Unexpected status: ${result.status}`);
  await new Promise(resolve => setTimeout(resolve, 2_000));
}
if (!completed) throw new Error(`Still processing; retain requestId ${submitted.requestId} to resume later`);
for (const slip of completed.betSlips ?? []) {
  console.log({
    book: slip.book, odds: slip.overallOdds,
    matched: slip.legsMatched, requested: slip.legsRequested,
    deepLink: slip.deepLink,
  });
}
```

</scalar-tab>
<scalar-tab title="Python">

Python 3.10 or later; install `requests` with `python -m pip install requests`.

```python
import os
import time
import requests

base = os.environ.get('UNABATED_API_BASE_URL', 'https://data.unabated.com')
session = requests.Session()
session.headers.update({'X-Api-Key': os.environ['UNABATED_API_KEY']})

def request(method, path, payload=None):
    response = session.request(method, f'{base}{path}', json=payload, timeout=(5, 20))
    response.raise_for_status()
    return response.json()

submitted = request('POST', '/api/v1/bet/generate', {
    'type': 'text', 'generateMobileLinks': True,
    'content': {'text': 'NFL three-game moneyline parlay'},
})
if submitted.get('status', '').lower() == 'error' or not submitted.get('requestId'):
    raise RuntimeError(submitted.get('details', 'Generation was not accepted'))

deadline = time.monotonic() + 60
completed = None
while time.monotonic() < deadline:
    result = request('GET', f"/api/v1/bet/status/{submitted['requestId']}")
    status = result.get('status', '').lower()
    if status == 'complete':
        completed = result
        break
    if status == 'error':
        raise RuntimeError(result.get('message') or result.get('details') or 'Generation failed')
    if status != 'processing':
        raise RuntimeError(f"Unexpected status: {result.get('status')}")
    time.sleep(2)
if completed is None:
    raise TimeoutError(f"Still processing; retain requestId {submitted['requestId']} to resume later")
for slip in completed.get('betSlips') or []:
    print(slip['book'], slip.get('overallOdds'),
          slip.get('legsMatched'), slip.get('legsRequested'), slip.get('deepLink'))
session.close()
```

</scalar-tab>
</scalar-tabs>

## 3. Inspect the matched result

Each item in `betSlips` describes one sportsbook:

- `book`, `overallOdds`, and `deepLink` describe the full slip.
- `legsRequested` and `legsMatched` tell you how much of the request was matched.
- `betslipBets` contains the individual selections, including event/player descriptions, bet type, period, `odds`, and individual `deepLink.url` values.
- `sharedBetSlipId` and `shareUrl` on the status response may provide a shareable slip when one was created.

<scalar-callout type="warning">
Show matched-leg counts and actual returned selections to your user. Do not present a partially matched slip as if every requested leg was found. Odds and availability can change before the sportsbook opens, and generation does not place a bet.
</scalar-callout>

Free requests carry your partner attribution into returned bet-slip links. Publish those links as returned; the manual suffix workflow for generic odds links is explained separately in [tracked deep links](/guides/deep-links).
