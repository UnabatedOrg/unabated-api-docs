# Connect and consume events

**Available for: Concierge API · Enterprise API**

Create a subscription, open its signed URL, and handle named SSE frames. These examples run one bounded, 60-second session, then close it. They establish the complete authentication and framing lifecycle; add the [snapshot and recovery workflow](/guides/streaming/recovery) before using streamed updates as a complete production view.

## Before you run

Use a Concierge API or Enterprise API key. Free API keys return `403` for this workflow. Discover a league ID from `GET /league`, and choose one within your API tier's sports coverage. Set the following variables privately in your shell:

```bash
export UNABATED_API_BASE_URL="https://data.unabated.com"
read -r -s -p "API key: " UNABATED_API_KEY; printf '\n'
export UNABATED_API_KEY
read -r -p "Discovered league ID: " UNABATED_LEAGUE_ID
export UNABATED_LEAGUE_ID
```

The `read` commands above use Bash syntax. Run them in Bash, or set the same environment variables through your normal secret manager. The API base URL is `https://data.unabated.com`.

The request subscribes to `market_line_update` and `event_update` for your selected league. Further narrow it with discovered market/source/bet-type IDs if needed.

## Full runnable examples

<scalar-tabs>
<scalar-tab title="cURL">

Requires Bash, cURL, and Python 3. Save this as `stream.sh` and run `bash stream.sh` after setting the environment variables above. It prints raw SSE frames for 60 seconds; cURL exit code `28` at the stream deadline is expected.

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${UNABATED_API_KEY:?Set UNABATED_API_KEY privately}"
: "${UNABATED_LEAGUE_ID:?Set a discovered UNABATED_LEAGUE_ID}"
api_base="${UNABATED_API_BASE_URL:?Set UNABATED_API_BASE_URL to https://data.unabated.com}"
case "$api_base" in
  https://data.unabated.com) ;;
  *) echo "Set UNABATED_API_BASE_URL to https://data.unabated.com." >&2; exit 1 ;;
esac

request_body=$(python3 - <<'PY'
import json, os
league = int(os.environ["UNABATED_LEAGUE_ID"])
if league <= 0:
    raise SystemExit("League ID must be a positive discovered ID.")
print(json.dumps({"eventTypes": ["market_line_update", "event_update"],
                  "leagueIds": [league], "includeSnapshot": False}))
PY
)

# Subscription output contains a signed credential; keep the temporary file
# private, never print it, and delete it when this script exits.
umask 077
subscription_file=$(mktemp)
trap 'rm -f "$subscription_file"' EXIT
status=$(curl --silent --show-error --connect-timeout 10 --max-time 20 \
  --output "$subscription_file" --write-out '%{http_code}' \
  --request POST "$api_base/subscriptions" \
  --header "X-Api-Key: $UNABATED_API_KEY" \
  --header 'Content-Type: application/json' \
  --data "$request_body")
if [[ "$status" != "200" ]]; then
  echo "Subscription creation failed (HTTP $status). Check access and filters." >&2
  exit 1
fi

stream_url=$(python3 - "$subscription_file" "$api_base" <<'PY'
import json, sys
from urllib.parse import urljoin, urlsplit, parse_qs
with open(sys.argv[1], encoding="utf-8") as f:
    result = json.load(f)
if result.get("success") is not True:
    raise SystemExit("Subscription creation did not succeed.")
data = result.get("data") or {}
subscription_id = data.get("subscriptionId")
stream_url = data.get("streamUrl")
if not subscription_id or not stream_url:
    raise SystemExit("Subscription response is missing its stream details.")
url = urljoin(sys.argv[2] + "/", stream_url)
base, parsed = urlsplit(sys.argv[2]), urlsplit(url)
if ((parsed.scheme, parsed.netloc) != (base.scheme, base.netloc)
        or parsed.path != "/sse/" + subscription_id
        or not parse_qs(parsed.query).get("token")):
    raise SystemExit("Unexpected stream destination.")
print(url)
PY
)

echo "Subscription created. Receiving SSE for up to 60 seconds..."
set +e
curl --silent --show-error --no-buffer --fail \
  --connect-timeout 10 --max-time 60 \
  --header 'Accept: text/event-stream' "$stream_url"
stream_exit=$?
set -e
if [[ "$stream_exit" != "0" && "$stream_exit" != "28" ]]; then
  echo "Stream stopped (cURL exit $stream_exit). Check recovery guidance." >&2
  exit "$stream_exit"
fi
echo "Stream closed."
```

This is a wire-format demonstration. Do not send every output line directly to a JSON decoder: frames can contain comments, IDs, event names, and multiple `data:` lines. The JavaScript and Python examples parse those boundaries.

</scalar-tab>
<scalar-tab title="JavaScript">

Requires Node.js 20 or newer; no package installation is needed. Save as `stream.mjs` and run `node stream.mjs`. API-key operations stay on your server. This reader supports UTF-8, a leading BOM, LF/CRLF/CR line endings, multiline `data`, comments, opaque IDs, and `retry` hints.

```javascript
const base = process.env.UNABATED_API_BASE_URL;
if (!base) {
  throw new Error("Set UNABATED_API_BASE_URL to https://data.unabated.com.");
}
const apiKey = process.env.UNABATED_API_KEY;
const leagueId = Number(process.env.UNABATED_LEAGUE_ID);
if (!apiKey || !Number.isSafeInteger(leagueId) || leagueId <= 0) {
  throw new Error("Set UNABATED_API_KEY and a discovered UNABATED_LEAGUE_ID.");
}
if (base !== "https://data.unabated.com") {
  throw new Error("Set UNABATED_API_BASE_URL to https://data.unabated.com.");
}

async function* sseFrames(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let pending = "", event = "", data = [], lastEventId = "", retryMs;
  let dataSize = 0;
  // A sample safety budget; narrow filters or adjust your own validated limit.
  const maxFrameChars = 8 * 1024 * 1024;
  function acceptLine(line) {
    if (line === "") {
      const frame = data.length
        ? {event: event || "message", data: data.join("\n"), lastEventId, retryMs}
        : null;
      event = ""; data = []; dataSize = 0;
      return frame;
    }
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") {
      dataSize += value.length;
      if (dataSize > maxFrameChars) throw new Error("SSE frame exceeded sample budget.");
      data.push(value);
    } else if (field === "id" && !value.includes("\0")) lastEventId = value;
    else if (field === "retry" && /^\d+$/.test(value)) retryMs = Number(value);
    return null;
  }
  try {
    while (true) {
      const {value, done} = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, {stream: true});
      if (pending.length > maxFrameChars) throw new Error("SSE line exceeded sample budget.");
      while (true) {
        const end = pending.search(/[\r\n]/);
        if (end < 0) break;
        // Keep a final CR until the next chunk so a split CRLF is one boundary.
        if (pending[end] === "\r" && end === pending.length - 1 && !done) break;
        const width = pending[end] === "\r" && pending[end + 1] === "\n" ? 2 : 1;
        const line = pending.slice(0, end);
        pending = pending.slice(end + width);
        const frame = acceptLine(line);
        if (frame) yield frame;
      }
      if (done) break; // An incomplete final frame is not dispatched.
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function main() {
  const response = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: {"X-Api-Key": apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({
      eventTypes: ["market_line_update", "event_update"],
      leagueIds: [leagueId], includeSnapshot: false
    }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Subscription creation failed: HTTP ${response.status}.`);
  const result = await response.json();
  if (result.success !== true || !result.data?.subscriptionId || !result.data?.streamUrl) {
    throw new Error("Subscription response did not contain a successful stream definition.");
  }
  const url = new URL(result.data.streamUrl, `${base}/`);
  if (url.origin !== base || url.pathname !== `/sse/${result.data.subscriptionId}` ||
      !url.searchParams.get("token")) throw new Error("Unexpected stream destination.");

  const controller = new AbortController();
  const stop = () => controller.abort();
  const deadline = setTimeout(stop, 60_000);
  process.once("SIGINT", stop);
  let lastProcessedId = "";
  try {
    const stream = await fetch(url, {
      headers: {Accept: "text/event-stream"}, signal: controller.signal
    });
    if (!stream.ok) throw new Error(`Stream admission failed: HTTP ${stream.status}.`);
    if (!stream.headers.get("content-type")?.startsWith("text/event-stream") || !stream.body) {
      throw new Error("Expected an SSE response body.");
    }
    console.log("Connected. Receiving updates for up to 60 seconds...");
    for await (const frame of sseFrames(stream.body)) {
      const payload = JSON.parse(frame.data);
      if (frame.event === "gap") {
        console.warn(`State repair required: ${payload.droppedEvents} queued events dropped.`);
        // Production: resynchronize REST state; do not ignore this notice.
      } else if (frame.event === "market_line_update") {
        console.log("Market-line update:", payload.data.marketLineUpdate.marketLines.length, "lines");
      } else if (frame.event === "event_update") {
        console.log("Event update:", payload.data.eventUpdate.event.eventId);
      } else {
        console.log("Control or additional event:", frame.event);
      }
      // In a production client, advance only after successful durable processing.
      lastProcessedId = frame.lastEventId;
    }
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    clearTimeout(deadline);
    process.removeListener("SIGINT", stop);
    controller.abort();
    console.log("Stream closed.", lastProcessedId ? "A data-event reconnect hint was observed." : "No data event observed.");
  }
}

main().catch(error => {
  // Keep errors free of the API key and signed URL.
  console.error(error.message);
  process.exitCode = 1;
});
```

The parser captures `retry` hints and IDs, but this one-session sample deliberately does not retry or maintain full odds state. Follow [recovery](/guides/streaming/recovery) to add bounded retries, `Last-Event-ID`, and authoritative-state repair.

</scalar-tab>
<scalar-tab title="Python">

Requires Python 3.10 or newer; this example uses only the standard library. Save as `stream.py` and run `python3 stream.py`. Universal newline handling supports LF, CRLF, and CR, and multiline `data:` fields are joined before JSON decoding.

```python
import io
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urljoin, urlsplit
from urllib.request import Request, urlopen

BASE = os.environ["UNABATED_API_BASE_URL"]
API_KEY = os.environ["UNABATED_API_KEY"]
LEAGUE_ID = int(os.environ["UNABATED_LEAGUE_ID"])
if LEAGUE_ID <= 0:
    raise SystemExit("Choose a positive discovered league ID.")
if BASE != "https://data.unabated.com":
    raise SystemExit("Set UNABATED_API_BASE_URL to https://data.unabated.com.")


def sse_frames(lines, deadline=None):
    event, data, last_event_id, retry_ms = "", [], "", None
    data_size = 0
    max_frame_chars = 8 * 1024 * 1024  # Sample budget, not an API limit.
    for raw in lines:
        if deadline is not None and time.monotonic() >= deadline:
            return
        line = raw.removesuffix("\n")  # TextIOWrapper normalizes all SSE newlines.
        if len(line) > max_frame_chars:
            raise ValueError("SSE line exceeded sample budget.")
        if line == "":
            if data:
                yield {"event": event or "message", "data": "\n".join(data),
                       "last_event_id": last_event_id, "retry_ms": retry_ms}
            event, data, data_size = "", [], 0
            continue
        if line.startswith(":"):
            continue
        field, separator, value = line.partition(":")
        if not separator:
            value = ""
        if value.startswith(" "):
            value = value[1:]
        if field == "event":
            event = value
        elif field == "data":
            data_size += len(value)
            if data_size > max_frame_chars:
                raise ValueError("SSE frame exceeded sample budget.")
            data.append(value)
        elif field == "id" and "\0" not in value:
            last_event_id = value
        elif field == "retry" and value.isascii() and value.isdigit():
            retry_ms = int(value)
    # No blank terminator means an incomplete final event: discard it.


def main():
    body = json.dumps({"eventTypes": ["market_line_update", "event_update"],
                       "leagueIds": [LEAGUE_ID], "includeSnapshot": False}).encode()
    create = Request(BASE + "/subscriptions", data=body, method="POST",
                     headers={"X-Api-Key": API_KEY, "Content-Type": "application/json"})
    with urlopen(create, timeout=20) as response:
        result = json.load(response)
    details = result.get("data") or {}
    if (result.get("success") is not True or not details.get("subscriptionId")
            or not details.get("streamUrl")):
        raise ValueError("Subscription response did not contain a successful stream definition.")
    url = urljoin(BASE + "/", details["streamUrl"])
    base, parsed = urlsplit(BASE), urlsplit(url)
    if ((parsed.scheme, parsed.netloc) != (base.scheme, base.netloc)
            or parsed.path != "/sse/" + details["subscriptionId"]
            or not parse_qs(parsed.query).get("token")):
        raise ValueError("Unexpected stream destination.")

    stream = Request(url, headers={"Accept": "text/event-stream"})
    deadline = time.monotonic() + 60
    last_processed_id = ""
    # The read timeout bounds a stalled connection. Ctrl+C exits both contexts.
    with urlopen(stream, timeout=25) as response:
        if not response.headers.get("Content-Type", "").startswith("text/event-stream"):
            raise ValueError("Expected an SSE response body.")
        with io.TextIOWrapper(response, encoding="utf-8-sig", newline=None) as lines:
            print("Connected. Receiving updates for about 60 seconds...")
            for frame in sse_frames(lines, deadline):
                payload = json.loads(frame["data"])
                if frame["event"] == "gap":
                    print("State repair required:", payload["droppedEvents"], "queued events dropped")
                    # Production: resynchronize REST state; do not ignore this notice.
                elif frame["event"] == "market_line_update":
                    print("Market-line update:", len(payload["data"]["marketLineUpdate"]["marketLines"]), "lines")
                elif frame["event"] == "event_update":
                    print("Event update:", payload["data"]["eventUpdate"]["event"]["eventId"])
                else:
                    print("Control or additional event:", frame["event"])
                last_processed_id = frame["last_event_id"]
                if time.monotonic() >= deadline:
                    break
    print("Stream closed.", "A reconnect hint was observed." if last_processed_id else "No data event observed.")


if __name__ == "__main__":
    try:
        main()
    except HTTPError as error:
        # Do not print the exception's URL: it contains the signed stream token.
        raise SystemExit(f"API request rejected: HTTP {error.code}. Check access and recovery guidance.")
    except (URLError, TimeoutError):
        raise SystemExit("Connection failed or timed out. Check recovery guidance.")
    except KeyboardInterrupt:
        print("Stream closed.")
```

This sample prints a summary of received events. It does not yet maintain a complete local snapshot or reconnect. It checks the session deadline on every received line, including keepalive comments. A stalled read can extend shutdown until the 25-second read timeout; Ctrl+C closes it immediately.

</scalar-tab>
</scalar-tabs>

## Browser `EventSource`

Create the subscription through your application's authenticated server, then return the signed stream URL only to the authorized client. Do not place `UNABATED_API_KEY` in browser code. Pass `https://data.unabated.com` as the `UNABATED_API_BASE_URL` argument. This base URL is safe to expose; the API key is not. The signed URL must use the same API origin.

```javascript
// `streamUrl` was created by your server for this authorized client.
// It may be an absolute URL or the relative URL returned by the API.
function openStream(streamUrl, UNABATED_API_BASE_URL) {
  if (UNABATED_API_BASE_URL !== "https://data.unabated.com") {
    throw new Error("Set UNABATED_API_BASE_URL to https://data.unabated.com.");
  }
  const url = new URL(streamUrl, `${UNABATED_API_BASE_URL}/`);
  if (url.origin !== UNABATED_API_BASE_URL) {
    throw new Error("The signed stream URL must use https://data.unabated.com.");
  }
  const source = new EventSource(url);
  source.addEventListener("market_line_update", event => {
    const message = JSON.parse(event.data).data.marketLineUpdate;
    // Apply message.marketLines with the state/ordering rules in Recovery.
    console.log("Updated lines:", message.marketLines.length);
  });
  source.addEventListener("event_update", event => {
    const message = JSON.parse(event.data).data.eventUpdate;
    console.log("Updated event:", message.event.eventId);
  });
  source.addEventListener("gap", event => {
    const {droppedEvents} = JSON.parse(event.data);
    console.warn("REST state repair required:", droppedEvents);
  });
  source.onerror = () => {
    // EventSource may reconnect automatically. Bound retries in your app and
    // obtain a fresh subscription if the token expires or access is rejected.
    console.warn("Stream interrupted; check continuity before using stale state.");
  };
  return () => source.close(); // Call on logout, component teardown, or navigation.
}
```

Native `EventSource` handles the SSE framing and its usual reconnect behavior. It does not automatically fetch a fresh REST snapshot, renew an expired signed URL, or repair your local state after a gap. Close the instance during cleanup and avoid creating multiple instances for the same subscription.

## Understand failures before retrying

| HTTP status / condition | Next action |
| --- | --- |
| `400` at creation | Check event names and discovered filter IDs. Correct the request. |
| `401` at creation | Check the API key. Do not attempt the stream without a successful subscription response. |
| `403` at creation | SSE is available for Concierge API and Enterprise API. Check the requested event family's available tiers. |
| `404` | Check the route and confirm that SSE is available for your API tier. |
| `400` at stream admission | The subscription ID does not match its signed token. Use the returned URL unchanged. |
| `401` at stream admission | The signed token is invalid or expired. Create a new subscription with a valid key. |
| `403` at stream admission | Verify that the key is active and your API tier still covers the subscription's data. |
| Temporary `5xx`, network failure, or ended stream | Retry with bounded backoff, and repair uncertain state from REST. |
| `200` with only comments | The connection is alive, but no matching updates may be occurring. Check scope/filters; do not assume every game continuously changes. |
| `gap` control event | Some delivery was lost. Resynchronize state; an open connection is not enough. |

Subscription creation uses the standard `success`/`messages` envelope. Stream admission failures can have an empty response body, so check the HTTP status and content type before decoding frames. A connection that already sent `200` can later close on expiry or lost access without emitting a new HTTP status.

Next: [Choose precise filters](/guides/streaming/events-and-filters) and [initialize, reconnect, and repair state](/guides/streaming/recovery).
