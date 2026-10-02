# Publish and test tracked deep links

**Available for: Free API · Enterprise API.** Standard deep links cover the sportsbooks available for your API tier. Concierge API does not include `GET /deeplink` or the bet-slip generation and status workflow. Partner attribution is required to receive credit for Free API content partner traffic.

A deep link opens a sportsbook with a specific selection or bet slip. Use the link returned by the API; do not construct a sportsbook's private URL format yourself. Destination availability and prices can change before a user opens the link.

<scalar-callout type="warning">
**ATTENTION: YOU MUST ADD YOUR PARTNER CODE TO MAINTAIN YOUR FREE API ACCESS. BE SURE TO TEST YOUR DEEP LINKS FROM YOUR SITE.**

Generic Gambly links in Free odds responses do not contain your partner code. Add your tracking suffix before publishing. Untagged clicks do not count toward your partner traffic.
</scalar-callout>

## Your first tracked link

1. Request an [odds board](/guides/odds) and choose an available line with a `deepLink`.
2. Copy your partner code or exact tracking suffix from [Manage API Keys](https://tools.unabated.com/api-keys).
3. Append that suffix to the generic returned link before publishing it on your site, social platform, or other distribution channel.
4. Open the published link from your platform, then check lifetime clicks and last-click time on the key management page.

Standard generic odds links have no query parameters. Your copied suffix is:

```text
?utm_campaign=YOUR_PARTNER_CODE
```

### Example

These are structural examples, not active selections. Replace the placeholders with the real link and code from your account.

```text
API returns:
https://www.gambly.com/deeplink/odds/<book-id>/<market-line-id>/<points-or-_>

You publish:
https://www.gambly.com/deeplink/odds/<book-id>/<market-line-id>/<points-or-_>?utm_campaign=YOUR_PARTNER_CODE
```

Keep the full returned path unchanged. The final segment identifies the selected points; `_` represents a selection without points. Do not change that segment to a different line or reuse it for an alternate.

## Add attribution in code

For a reusable integration, use URL parsing so repeated processing replaces the existing campaign value rather than duplicating it. These helpers are intended for the **generic Gambly odds links** returned to Free callers. They do not add tracking to unrelated sportsbook URLs.

<scalar-tabs>
<scalar-tab title="JavaScript">

```javascript
function trackedOddsLink(returnedLink, partnerCode) {
  if (!partnerCode) throw new Error('A partner code is required');
  const url = new URL(returnedLink);
  const allowedOrigins = new Set(['https://www.gambly.com']);
  if (!allowedOrigins.has(url.origin) || !url.pathname.startsWith('/deeplink/odds/')) {
    throw new Error('Expected a generic Gambly odds link from the API');
  }
  url.searchParams.set('utm_campaign', partnerCode);
  return url.toString();
}

// Use an actual line.deepLink from your odds response.
const publishUrl = trackedOddsLink(line.deepLink, process.env.UNABATED_PARTNER_CODE);
```

</scalar-tab>
<scalar-tab title="Python">

```python
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

def tracked_odds_link(returned_link, partner_code):
    if not partner_code:
        raise ValueError('A partner code is required')
    url = urlsplit(returned_link)
    allowed_hosts = {'www.gambly.com'}
    if url.scheme != 'https' or url.netloc not in allowed_hosts or not url.path.startswith('/deeplink/odds/'):
        raise ValueError('Expected a generic Gambly odds link from the API')
    query = [(key, value) for key, value in parse_qsl(url.query, keep_blank_values=True)
             if key != 'utm_campaign']
    query.append(('utm_campaign', partner_code))
    return urlunsplit((url.scheme, url.netloc, url.path, urlencode(query), url.fragment))

# Use an actual line['deepLink'] from your odds response.
publish_url = tracked_odds_link(line['deepLink'], partner_code)
```

</scalar-tab>
</scalar-tabs>

Use the code exactly as shown in key management. It is a public tracking identifier, not your API key. Your API key must never appear in a published link.

## Generate a standard deep link from line IDs

`GET /deeplink` is available to Free API and Enterprise API, not Concierge API. It accepts comma-separated market line IDs and an optional matching list of points. Use IDs and points from your current odds response.

Set `UNABATED_API_BASE_URL` explicitly to the [API base URL](/start/authentication#api-base-url), `https://data.unabated.com`. The example stops if it is missing.

```bash
# These variables must come from real selections in your response.
curl --fail-with-body --connect-timeout 5 --max-time 20 --get \
  --header "X-Api-Key: ${UNABATED_API_KEY}" \
  --data-urlencode "ids=${UNABATED_MARKET_LINE_IDS}" \
  --data-urlencode "points=${UNABATED_SELECTION_POINTS}" \
  "${UNABATED_API_BASE_URL:?Set UNABATED_API_BASE_URL to https://data.unabated.com}/deeplink"
```

Use `_` for a selection without points when supplying a list of point values. If `points` is supplied, its item count must match `ids`. For Free callers, the operation supports at most 20 selections, all from the same included sportsbook, and returns a generic Gambly URL in `data.url` and `data.individualUrls`. Add your partner code before publishing that URL.

Invalid IDs or mismatched lists can produce `400`; a missing selection can produce `404`; a Concierge API key or a book outside Free API coverage can produce `403`. Same-game parlay pricing and generation are available for Enterprise API.

## Generated bet-slip links

The [bet-slip generation workflow](/guides/bet-slips), available to Free API and Enterprise API, returns its own links. For Free content partner requests, generation carries your partner attribution into those links. Publish the returned bet-slip URLs as provided. The manual suffix step above applies to generic `/deeplink/odds/` URLs from odds or standard deep-link responses.

## Verify from your site

The key management page includes a live-link tester for real DraftKings and FanDuel examples when available. Its example links already contain your code. Use the lifetime tracker to check the integration: open a link, refresh the tracker, and confirm the count increases and the local last-click time changes.

Also test a link **published from your actual platform**, not only the tester. A template, redirect, link shortener, or publishing tool may alter the URL. Inspect the final published link to confirm your `utm_campaign` survives that path.

Lifetime clicks are a practical integration check. Affiliate reporting uses its own reporting pipeline and can update later; a reporting delay does not mean you should repeatedly create new partner codes or change your links.
