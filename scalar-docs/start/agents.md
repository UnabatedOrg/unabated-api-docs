# Agents welcome

These docs are built for humans and agents working together. Start with the successful request flow, discover current identifiers from the API, and read each endpoint's available API tiers before making calls.

## Read the documentation

- [Quickstart](/start/quickstart): key setup, a first odds request, and the next action.
- [API Reference](/reference): methods, parameters, request bodies, and response schemas.
- [llms.txt](/llms.txt): a compact index of the documentation.
- [llms-full.txt](/llms-full.txt): documentation content for tools that prefer one text resource.

## OpenAPI specification

The [OpenAPI specification](https://data.unabated.com/swagger/v1/swagger.json) is machine-readable JSON describing routes, parameters, authentication, and response schemas. Tools can use it to inspect the contract or generate clients. You do not need to download it to follow the readable guides.

## Integration rules for an agent

1. Use `https://data.unabated.com` and confirm the API tier. Keep credentials in an environment variable or secrets store; never request a key in an ordinary chat message.
2. Discover league names, bet type IDs, period types, and market source IDs from the [discovery endpoints](/guides/discovery). Do not copy a stale identifier list into application code.
3. Check HTTP status and, when present, `success` and `messages`. Do not treat an empty response as an authentication success test or a guarantee of sportsbook coverage.
4. Serialize Free odds requests through one scheduler per API key. The five-second interval is shared across odds endpoints; honor `Retry-After` after a `429`.
5. Read structured odds fields rather than parsing composite dictionary keys. Preserve IDs, prices, points, timestamps, and selection context.
6. For a Free partner, add the partner code to returned generic Gambly links and test from the partner's own platform. Do not guess a sportsbook destination or fabricate a selection URL.
7. Use SSE with Concierge API or Enterprise API. Concierge API does not include `GET /deeplink`, `POST /api/v1/bet/generate`, or `GET /api/v1/bet/status/{guid}`; those operations are available to Free API and Enterprise API. Check each endpoint's available API tiers before requesting data.
8. Use bounded retries and request timeouts. Report an unavailable API tier or unsupported data request rather than attempting to work around it.

## Example prompts

### Build a Free odds integration

```text
Build a server-side Unabated Free API integration using these docs.
Read UNABATED_API_KEY and UNABATED_PARTNER_CODE from the environment.
Set UNABATED_API_BASE_URL to https://data.unabated.com.
Discover current leagues and market sources. Request one straight-odds
board, check HTTP status plus the success/messages envelope, and show
available selections using structured fields. Coordinate every odds
request through one five-second scheduler per key and honor Retry-After.
Add our partner code to generic Gambly deep links without duplicating it.
Keep all credentials out of the client, logs, and generated source files.
```

### Build a live odds store

```text
Using the Unabated streaming guides and API Reference, build a server-side
client for a Concierge API or Enterprise API key. Use https://data.unabated.com
and discover filter IDs,
create a subscription, connect to its signed URL, and maintain current
state according to the documented snapshot, ordering, and recovery rules.
Use event families available for our API tier. Redact signed URLs and keys
from logs. Preserve a returned deep link only while its selection points
remain unchanged; odds collection must also work without a link. For
Concierge, do not call /deeplink or bet-slip generation/status endpoints.
Close streams on shutdown. Confirm our API tier and data coverage before running.
```

### Generate a bet slip with Free API or Enterprise API

```text
Use a Free API or Enterprise API key; Concierge API does not include this workflow.
Use https://data.unabated.com. Use POST /api/v1/bet/generate with content.text, then poll the returned
requestId using GET /api/v1/bet/status/{guid}. Check both HTTP failures
and the body's processing status. Stop on Complete or Error, enforce
a maximum wait, and show matched-leg counts alongside returned links.
Never infer that all requested legs matched or that displayed prices
will remain unchanged when the user reaches the sportsbook.
```

## Useful completion checks

A working integration should demonstrate a successful response, a handled invalid-key or denied-feature response, controlled polling, and safe credential handling. For a Free API or Enterprise API link workflow, also demonstrate a real returned deep link. For a Free partner, verify click attribution on the key management page after opening the published link. For streaming, demonstrate cleanup and recovery using the documented state rules; a Concierge odds integration does not require a deep link or generated bet slip.
