# Market Sources

Retrieve a listing of market sources with applicable market data for the league and marketType specified.

<scalar-callout type="neutral" icon="">
GET https\://data.unabated.com/market/{league}/{marketType}/sources
</scalar-callout>
<scalar-callout type="info" icon="">
This endpoint returns only market sources which currently have odds available for the specified league and market type.
</scalar-callout>

## URL Parameters

| Parameter  | Type   | Description                                                                        |
| ---------- | ------ | ---------------------------------------------------------------------------------- |
| league     | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.) |
| marketType | String | Type of market (see odds)                                                          |

## Response Structure

The Market Sources endpoint provides information about sportsbooks and betting sources that have active odds for the specified league and market type combination. The response is a JSON array containing market source objects with details about each sportsbook including branding, status, and operational information.

### Response Structure

```plaintext
[
  {
    [...fields]
  }
]
```

### Response Fields

| Field           | Type    | Description                                                                     |
| --------------- | ------- | ------------------------------------------------------------------------------- |
| id              | Integer | Unique identifier for the market source                                         |
| name            | String  | Display name of the sportsbook                                                  |
| logoUrl         | String  | Full URL to sportsbook logo                                                     |
| thumbnailUrl    | String  | Full URL to sportsbook thumbnail in optimized WebP format for smaller previews. |
| siteUrl         | String  | Official sportsbook website URL.                                                |
| isActive        | Boolean | Whether the sportsbook is currently active                                      |
| statusId        | Integer | Overall status for standard markets                                             |
| propsStatusId   | Integer | Status specifically for prop bet markets                                        |
| futuresStatusId | Integer | Status specifically for futures markets                                         |

###
