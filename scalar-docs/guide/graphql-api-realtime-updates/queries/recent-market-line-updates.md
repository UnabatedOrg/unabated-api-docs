# Recent Market Line Updates

Retrieve market line updates that occurred after a specified timestamp. This is primarily used in conjunction with the `latestTimestamp` field off the RESTful point-in-time market data pull, and will fill the gap of any missed messages between when your web socket connection begins.

<scalar-callout type="info" icon="">
This call will go at max 1 minute into the past.
</scalar-callout>

## Parameters

| Parameter          | Type                      | Description                                                                                                                                        | Required |
| ------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| marketSourceGroups | Array\[MarketSourceGroup] | Filter by market source groups: STANDARD, FANDUEL, MARKET\_MAKERS, SPORTTRADE. If omitted, returns updates for all groups your API key can access. | No       |
| leagueIds          | Array\[Int]               | Filter by league IDs. If omitted, returns updates for all leagues your API key can access.                                                         | No       |
| since              | AWSTimestamp              | Unix timestamp (in milliseconds). Returns only updates that occurred after this time.                                                              | No       |

## Response Types

### MarketLineUpdate

Each `MarketLineUpdate` contains the same structure as the subscription response:

| Field             | Type               | Description                                                          |
| ----------------- | ------------------ | -------------------------------------------------------------------- |
| marketSourceGroup | MarketSourceGroup! | The source group for these updates                                   |
| marketTypeId      | Int                | Market type identifier                                               |
| leagueId          | Int!               | League identifier                                                    |
| marketLines       | \[MarketLine]!     | See the `Market Line Updates` subscription for full payload details. |
| messageTimestamp  | AWSTimestamp       | When the original update occurred                                    |
| messageId         | String             | Internal use only                                                    |
| correlationId     | String             | Internal use only                                                    |

## Example Query

```plaintext
query GetRecentMarketLineUpdates {
  marketLineUpdates(
    leagueIds: [3]
    marketSourceGroups: [STANDARD, FANDUEL]
    since: 1734567890000
  ) {
    leagueId
    marketSourceGroup
    marketTypeId
    marketLines {
      marketLineId
      marketSourceId
      points
      price
      edge
      marketLineKey
      modifiedOn
    }
    messageTimestamp
    messageId
  }
}
```
