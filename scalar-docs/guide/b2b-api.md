# B2B API

Generate bet slips and article widgets from text, images, and media content.

These Data API routes expose Gambly B2B bet-slip generation and article/media-content widget generation through Unabated API-key authentication.

## Generate Bet Slips

Bet-slip generation is asynchronous. Submit a text prompt or image to `POST /api/v1/bet/generate`, then poll `GET /api/v1/bet/status/{guid}` with the returned `requestId`.

### Text Request

```plaintext
curl -X POST "https://data.unabated.com/api/v1/bet/generate" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $UNABATED_API_KEY" \
  -d '{
    "type": "text",
    "generateMobileLinks": true,
    "content": {
      "text": "MLB moneyline bet slip for Yankees to win"
    }
  }'
```

### Image URL Request

```plaintext
curl -X POST "https://data.unabated.com/api/v1/bet/generate" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $UNABATED_API_KEY" \
  -d '{
    "type": "image",
    "generateMobileLinks": true,
    "content": {
      "imageUrl": "https://example.com/betslip-image.jpg"
    }
  }'
```

Base64 image payloads also use `type: "image"` with `content.base64String`.

### Generate Response

```plaintext
{
  "status": "pending",
  "details": "text: MLB moneyline bet slip for Yankees to win",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Poll Status

```plaintext
curl -X GET "https://data.unabated.com/api/v1/bet/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "X-Api-Key: $UNABATED_API_KEY"
```

Status responses return `Processing`, `Complete`, or `Error`. Complete responses can include `betSlips`, `sharedBetSlipId`, and `shareUrl`. Each bet slip can include sportsbook name, `deepLink`, overall odds, leg counts, and leg-level odds/deeplink metadata.

## Generate Article Widgets From Media Content

Article-widget routes analyze an article URL, video URL, or raw article markdown and return matched betting offers for a publisher-owned widget.

**Recommended flow:**

1. Call `GET /api/v1/article-widgets/{partnerSlug}/books` to discover sportsbook IDs available to the partner.

2. Call `GET /api/v1/article-widgets/{partnerSlug}` with either `url` or `markdown`.

3. Use `requestedBookIds` to restrict returned books and `bookOrder` to control display order.

### Get Available Sportsbooks

```plaintext
curl -X GET "https://data.unabated.com/api/v1/article-widgets/demo-partner/books" \
  -H "X-Api-Key: $UNABATED_API_KEY"
```

### Generate From Article Or Video URL

```plaintext
curl --get "https://data.unabated.com/api/v1/article-widgets/demo-partner" \
  -H "X-Api-Key: $UNABATED_API_KEY" \
  --data-urlencode "url=https://example.com/mlb-preview-article" \
  --data-urlencode "maxBets=1" \
  --data-urlencode "leagueHint=MLB" \
  --data-urlencode "requestedBookIds=1,2" \
  --data-urlencode "bookOrder=1,2" \
  --data-urlencode "isMobileDevice=false"
```

### Generate From Markdown

```plaintext
curl --get "https://data.unabated.com/api/v1/article-widgets/demo-partner" \
  -H "X-Api-Key: $UNABATED_API_KEY" \
  --data-urlencode "markdown=Shohei Ohtani could hit a home run tonight." \
  --data-urlencode "maxBets=1" \
  --data-urlencode "leagueHint=MLB" \
  --data-urlencode "includeImplicitBets=false" \
  --data-urlencode "inlineWidgetCap=1"
```

### Common Query Parameters

| Parameter             | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `partnerSlug`         | Partner slug supplied during onboarding. Path parameter.                           |
| `url`                 | Article or video URL to analyze. Either `url` or `markdown` is required.           |
| `markdown`            | Raw article markdown to analyze. Either `markdown` or `url` is required.           |
| `maxBets`             | Maximum number of unique betting entities to return.                               |
| `leagueHint`          | Optional league hint such as `NFL`, `NBA`, `MLB`, or `Premier League`.             |
| `forceRefresh`        | Bypass cached results and request fresh analysis. Defaults to `false`.             |
| `skipCache`           | Skip cache lookup for this request. Defaults to `false`.                           |
| `isMobileDevice`      | Request mobile-optimized sportsbook deep links when possible. Defaults to `false`. |
| `requestedBookIds`    | Comma-separated sportsbook IDs to include. Use `/books` to discover IDs.           |
| `bookOrder`           | Comma-separated sportsbook IDs defining display order.                             |
| `includeImplicitBets` | Include bets inferred from article context. Defaults to `true`.                    |
| `inlineWidgetCap`     | Maximum number of inline widgets to generate from the content.                     |

Article-widget responses include partner metadata, matched `bets`, sportsbook odds/deeplinks, evidence snippets, cache metadata, and worker telemetry.

## Errors

```plaintext
{
  "error": "missing_content",
  "message": "Either 'url' or 'markdown' parameter is required.",
  "details": "You must provide either the 'url' query parameter with an article URL, or the 'markdown' parameter with article content.",
  "requestId": "0HMQ..."
}
```

Common status codes include `400` for invalid request or missing content, `401` for missing or invalid API key, `403` for missing feature permission or inactive partner, `404` for unknown partner, and `502` when the article processing worker is unavailable.
