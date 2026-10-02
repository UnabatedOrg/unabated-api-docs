# Agents welcome

These docs are built for humans and agents working together. Start with the successful request flow, discover current identifiers from the API, and read each endpoint's tier and feature requirements before making calls.

## Read the documentation

- [Quickstart](/start/quickstart): key setup, a first odds request, and the next action.
- [API Reference](/reference): methods, parameters, request bodies, and response schemas.
- [llms.txt](/llms.txt): a compact index of the documentation.
- [llms-full.txt](/llms-full.txt): documentation content for tools that prefer one text resource.

## OpenAPI specification

The [OpenAPI specification](https://data.unabated.com/swagger/v1/swagger.json) is machine-readable JSON describing routes, parameters, authentication, and response schemas. Tools can use it to inspect the contract or generate clients. You do not need to download it to follow the readable guides. Sandbox integrations can use the [sandbox specification](https://data-sandbox.unabated.com/swagger/v1/swagger.json).

## Integration rules for an agent

1. Confirm the environment and access tier. Keep credentials in an environment variable or secrets store; never request a key in an ordinary chat message.
2. Discover league names, bet type IDs, period types, and market source IDs from the [discovery endpoints](/guides/discovery). Do not copy a stale identifier list into application code.
3. Check HTTP status and, when present, `success` and `messages`. Do not treat an empty response as an authentication success test or a guarantee of sportsbook coverage.
4. Serialize Free odds requests through one scheduler per API key. The five-second interval is shared across odds endpoints; honor `Retry-After` after a `429`.
5. Read structured odds fields rather than parsing composite dictionary keys. Preserve IDs, prices, points, timestamps, and selection context.
6. For a Free partner, add the partner code to returned generic Gambly links and test from the partner's own platform. Do not guess a sportsbook destination or fabricate a selection URL.
7. Use SSE only with Concierge or Enterprise entitlement. Additional event families, including the NFL output model, require explicit feature access.
8. Use bounded retries and request timeouts. Report missing entitlement or unsupported scope rather than attempting to work around it.

## Example prompts

### Build a Free odds integration

```text
Build a server-side Unabated Free API integration using these docs.
Read UNABATED_API_KEY and UNABATED_PARTNER_CODE from the environment.
Use UNABATED_API_BASE_URL, defaulting to https://data.unabated.com.
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
client for an entitled Concierge or Enterprise key. Discover filter IDs,
create a subscription, connect to its signed URL, and maintain current
state according to the documented snapshot, ordering, and recovery rules.
Do not request features our key does not have. Redact signed URLs and keys
from logs, retain existing deep links across price-only updates, and close
streams on shutdown. Explain any entitlement assumptions before running.
```

### Generate a bet slip

```text
Use POST /api/v1/bet/generate with content.text, then poll the returned
requestId using GET /api/v1/bet/status/{guid}. Check both HTTP failures
and the body's processing status. Stop on Complete or Error, enforce
a maximum wait, and show matched-leg counts alongside returned links.
Never infer that all requested legs matched or that displayed prices
will remain unchanged when the user reaches the sportsbook.
```

## Useful completion checks

A working integration should demonstrate a successful response, a handled invalid-key or denied-feature response, controlled polling, a real returned deep link, and safe credential handling. For a Free partner, verify click attribution on the key management page after opening the published link. For streaming, demonstrate cleanup and recovery using the documented state rules.
