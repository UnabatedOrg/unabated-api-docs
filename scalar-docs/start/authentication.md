# Authenticate with your API key

**Available for: Free API · Concierge API · Enterprise API.** Endpoint and data availability depend on your API tier.

Send your API key in the `X-Api-Key` request header. Use HTTPS and keep the key in your server's environment or secrets store.

Set `UNABATED_API_BASE_URL` to `https://data.unabated.com` before running any example. Keep your API key private.

```bash
export UNABATED_API_BASE_URL="https://data.unabated.com"
read -r -s -p "API key: " UNABATED_API_KEY; printf '\n'
export UNABATED_API_KEY

curl --fail-with-body --connect-timeout 5 --max-time 20 \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  --header "Accept: application/json" \
  "${UNABATED_API_BASE_URL}/league"
```

The `read` example is for Bash and asks for the key without placing it in shell history. For deployed software, inject the environment variable from your secrets manager.

## API base URL

Use `https://data.unabated.com` as the base URL for REST requests and subscription creation. Manage your keys at [Manage API Keys](https://tools.unabated.com/api-keys).

The examples read `UNABATED_API_BASE_URL` from your application's configuration. Set it to the API base URL above; the signed streaming URL returned by the API uses the same origin.

## Get and manage keys

Free API content partners begin at [Free API signup](https://tools.unabated.com/free-api). Concierge API subscribers use the existing key management page. Enterprise API keys and dataset coverage follow your agreement.

Self-service key management supports up to two active keys. To rotate safely, generate a second key, deploy it to your integration, verify requests, and then revoke the old key. A revoked key no longer authorizes new requests.

<scalar-callout type="warning">
Do not put an API key in public browser JavaScript, a mobile application bundle, screenshots, source control, or an agent prompt. Have your backend make authenticated requests and return only the data your frontend needs. Avoid placing credentials in query strings, where URLs can appear in logs or browser history.
</scalar-callout>

## Signed stream URLs

For Concierge API or Enterprise API streaming, create a subscription with your API-key header. The response supplies a signed stream URL. Connect to that returned URL as described in the [streaming guide](https://docs.unabated.com/guides/streaming/lifecycle); treat the URL as a temporary credential and do not log or publish it.

A browser `EventSource` can open the signed URL without putting your API key in the browser. Your backend should create the subscription and deliver the signed URL only to an authorized client. The signed URL is not a permanent replacement for a key.

## Authentication and API tiers

A `401` means authentication failed or is required. A `403` means the requested endpoint or data is unavailable for your API tier or Enterprise API agreement. Check [access tiers](https://docs.unabated.com/start/access-tiers) and the endpoint's availability before trying again; changing transport or repeating the request does not change your tier.

For successful HTTP responses, also inspect the body: endpoints using the public response envelope can return `success: false` with explanatory `messages`. See [errors and limits](https://docs.unabated.com/guides/errors-and-limits).
