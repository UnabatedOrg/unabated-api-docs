# Gambly B2B Bet Slip and Article Widget API

These Data API routes expose Gambly B2B bet-slip generation and article/media-content widget generation through Unabated API-key authentication.

Use the production Data API host for production traffic:

```text
https://data.unabated.com
```

When testing in sandbox, use the same paths against the sandbox Data API host supplied for your account.

## Authentication

Send your Unabated API key in the `X-Api-Key` header:

```http
X-Api-Key: <api_key>
```

The bet-slip routes require `api:gambly_bet_slips`. The article-widget routes require `api:gambly_article_widgets`.

## Generate Bet Slips

Bet-slip generation is asynchronous. Submit a prompt or image to `POST /api/v1/bet/generate`, then poll `GET /api/v1/bet/status/{guid}` with the returned `requestId`.

Complete responses can include sportsbook-specific bet slips, matched odds, leg-level details, sportsbook deep links, `sharedBetSlipId`, and `shareUrl`.

### Submit Text Content

```bash
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

### Submit Image Content

Use `type: "image"` with either a public image URL:

```bash
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

Or provide a base64 image payload:

```json
{
  "type": "image",
  "generateMobileLinks": true,
  "content": {
    "base64String": "data:image/png;base64,<base64-image-data>",
    "compression": null
  }
}
```

### Generate Response

```json
{
  "status": "pending",
  "details": "text: MLB moneyline bet slip for Yankees to win",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Use `requestId` as the `guid` path value when polling status.

### Poll Status

```bash
curl -X GET "https://data.unabated.com/api/v1/bet/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "X-Api-Key: $UNABATED_API_KEY"
```

While the request is still being processed, `status` will be `Processing`. When finished, `status` will be `Complete` or `Error`.

```json
{
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "Complete",
  "details": "Bet slip generated",
  "sharedBetSlipId": "shared_123",
  "shareUrl": "https://example.com/shared/shared_123",
  "betSlips": [
    {
      "book": "Example Sportsbook",
      "deepLink": "https://example.com/deeplink",
      "overallOdds": 145,
      "legsRequested": 1,
      "legsMatched": 1,
      "betslipBets": [
        {
          "id": "offer_123",
          "event": "New York Yankees at Boston Red Sox",
          "betType": "Moneyline",
          "periodType": "Game",
          "isLive": false,
          "odds": {
            "type": "moneyline",
            "value": "+145",
            "points": null
          },
          "deepLink": {
            "sportsbook": "Example Sportsbook",
            "url": "https://example.com/deeplink"
          },
          "metadata": {
            "league": "MLB",
            "timestamp": "2026-06-29T23:05:00Z"
          }
        }
      ]
    }
  ]
}
```

## Generate Article Widgets From Media Content

Article-widget routes analyze media content, such as an article URL, video URL, or raw article markdown, and return matched betting offers that can be embedded in a publisher-owned widget.

The recommended flow is:

1. Call `GET /api/v1/article-widgets/{partnerSlug}/books` to discover sportsbook IDs available to the partner.
2. Call `GET /api/v1/article-widgets/{partnerSlug}` with either `url` or `markdown`.
3. Use `requestedBookIds` to restrict returned books and `bookOrder` to control display order.

### Get Available Sportsbooks

```bash
curl -X GET "https://data.unabated.com/api/v1/article-widgets/demo-partner/books" \
  -H "X-Api-Key: $UNABATED_API_KEY"
```

```json
{
  "partner": {
    "id": 123,
    "slug": "demo-partner",
    "displayName": "Demo Partner",
    "status": "active",
    "allowCreate": true
  },
  "books": [
    {
      "id": 1,
      "name": "Example Sportsbook",
      "logoUrl": "https://example.com/logo.png",
      "priority": 1,
      "allowed": true,
      "siteUrl": "https://example.com",
      "thumbnailUrl": "https://example.com/thumb.png"
    }
  ],
  "requestId": "0HMQ..."
}
```

### Generate From Article Or Video URL

```bash
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

```bash
curl --get "https://data.unabated.com/api/v1/article-widgets/demo-partner" \
  -H "X-Api-Key: $UNABATED_API_KEY" \
  --data-urlencode "markdown=Shohei Ohtani could hit a home run tonight." \
  --data-urlencode "maxBets=1" \
  --data-urlencode "leagueHint=MLB" \
  --data-urlencode "includeImplicitBets=false" \
  --data-urlencode "inlineWidgetCap=1"
```

### Article Widget Query Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `partnerSlug` | Yes | Partner slug supplied during onboarding. This is a path parameter. |
| `url` | One of `url` or `markdown` | Article or video URL to analyze. |
| `markdown` | One of `url` or `markdown` | Raw article markdown to analyze instead of fetching a URL. |
| `maxBets` | No | Maximum number of unique betting entities to return. |
| `leagueHint` | No | Optional league hint such as `NFL`, `NBA`, `MLB`, or `Premier League`. |
| `forceRefresh` | No | Bypass cached results and request fresh analysis. Defaults to `false`. |
| `skipCache` | No | Skip cache lookup for this request. Defaults to `false`. |
| `isMobileDevice` | No | Request mobile-optimized sportsbook deep links when possible. Defaults to `false`. |
| `requestedBookIds` | No | Comma-separated sportsbook IDs to include. Use the `/books` endpoint to get available IDs. |
| `bookOrder` | No | Comma-separated sportsbook IDs defining the preferred display order. |
| `includeImplicitBets` | No | Include bets inferred from article context. Defaults to `true`. |
| `inlineWidgetCap` | No | Maximum number of inline widgets to generate from the content. |

### Article Widget Response

```json
{
  "partner": {
    "id": 123,
    "slug": "demo-partner",
    "displayName": "Demo Partner",
    "status": "active",
    "allowCreate": true
  },
  "bets": [
    {
      "betOffer": {
        "id": 987654,
        "price": 145,
        "points": 0.5,
        "leagueId": 1,
        "leagueName": "MLB",
        "bookId": 1,
        "isLiveBet": false,
        "book": {
          "id": 1,
          "name": "Example Sportsbook"
        },
        "event": {
          "id": 456,
          "name": "New York Yankees at Boston Red Sox",
          "eventStart": "2026-06-29T23:05:00Z"
        }
      },
      "deeplink": {
        "id": "deeplink_123",
        "url": "https://example.com/deeplink",
        "deeplinkStatus": "success",
        "message": null
      },
      "evidence": [
        "Shohei Ohtani could hit a home run tonight."
      ],
      "matchConfidence": 0.87,
      "isDirectMatch": true
    }
  ],
  "metadata": {
    "articleUrl": "https://example.com/mlb-preview-article",
    "leagueHint": "MLB",
    "requestedMaxBets": 1,
    "matchedCount": 1,
    "cacheHit": false,
    "workerResultType": "success",
    "inlineWidgetCap": 1,
    "includeImplicitBets": false,
    "bookOrder": [1, 2]
  },
  "telemetry": {
    "cacheStatus": "miss",
    "workerStatusCode": 200,
    "workerLatencyMs": 412
  }
}
```

## Errors

Errors use a standard JSON shape:

```json
{
  "error": "missing_content",
  "message": "Either 'url' or 'markdown' parameter is required.",
  "details": "You must provide either the 'url' query parameter with an article URL, or the 'markdown' parameter with article content.",
  "requestId": "0HMQ..."
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Invalid request parameters, missing content, or invalid partner slug. |
| `401` | Missing or invalid API key. |
| `403` | API key lacks the required feature permission, or the partner is inactive or unauthorized. |
| `404` | Partner was not found. |
| `502` | Article processing worker is unavailable. |
