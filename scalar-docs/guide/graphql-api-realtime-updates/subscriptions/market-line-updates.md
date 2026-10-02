# Market Line Updates

Subscribe to real-time market line updates including odds changes, new lines, and line removals.

## Parameters

| Parameter          | Type                      | Description                                                                                         | Required |
| ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| marketSourceGroups | Array\[MarketSourceGroup] | Array of market source groups to include: STANDARD, FANDUEL, MARKET\_MAKERS, SPORTTRADE             | No       |
| leagueIds          | Array\[Int]               | Array of league IDs to filter updates                                                               | No       |
| marketTypeIds      | Array\[Int]               | Array of market type IDs to filter updates (1=Game Odds, 2=Team Futures, 3=Props, 4=Player Futures) | No       |

## Response Types

### MarketLineUpdate

| Field             | Type               | Description                        |
| ----------------- | ------------------ | ---------------------------------- |
| marketSourceGroup | MarketSourceGroup! | The source group for these updates |
| marketTypeId      | Int                | Market type identifier             |
| leagueId          | Int!               | League identifier                  |
| marketLines       | \[MarketLine]!     | Array of updated market lines      |
| messageTimestamp  | AWSTimestamp       | When the message was generated     |
| messageId         | String             | For internal usage only            |
| correlationId     | String             | For internal usage only            |

### MarketLine

| Field          | Type                   | Description                                                                                         |
| -------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| marketId       | Long                   | Unique market identifier                                                                            |
| marketLineId   | Long                   | Unique market line identifier                                                                       |
| marketSourceId | Long                   | Source/sportsbook identifier                                                                        |
| points         | Float                  | Point spread or total value                                                                         |
| price          | Int                    | Price in American odds format                                                                       |
| sourcePrice    | Float                  | Original price from the source                                                                      |
| sourceFormat   | Int                    | Price format (1=American, 2=Decimal)                                                                |
| statusId       | Int                    | Status of the market line                                                                           |
| sequenceNumber | Long                   | Update sequence number                                                                              |
| edge           | Float                  | Calculated edge value                                                                               |
| disabled       | Boolean                | Whether the line is disabled                                                                        |
| bestAltPrice   | Int                    | Best available alternate price                                                                      |
| bestAltPoints  | Float                  | Points for best alternate price                                                                     |
| bestAltEdge    | Float                  | Edge for best alternate price                                                                       |
| alternateLines | \[AlternateMarketLine] | Array of alternate lines                                                                            |
| marketLineKey  | String                 | JSON path key for mapping to snapshot data. **NOT TO BE USED TO PARSE DATA OR AS YOUR UNIQUE KEY.** |
| modifiedOn     | String                 | Last modification timestamp                                                                         |
| market         | Market                 | Associated market information                                                                       |

## Example Subscription

```plaintext
subscription {
  marketLineUpdate(
    leagueIds: [3]
    marketSourceGroups: [STANDARD]
    marketTypeIds: [1, 3]
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
  }
}
```
