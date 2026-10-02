# Market Updates

Subscribe to new market creation events. Currently only supports NEW market updates.

## Parameters

| Parameter | Type        | Description                                  | Required |
| --------- | ----------- | -------------------------------------------- | -------- |
| leagueIds | Array\[Int] | Array of league IDs to filter market updates | No       |

## Response Types

### MarketUpdate

| Field            | Type              | Description                         |
| ---------------- | ----------------- | ----------------------------------- |
| leagueId         | Int!              | League identifier                   |
| updateType       | MarketUpdateType! | Type of update (currently only NEW) |
| market           | Market!           | The new market data                 |
| messageTimestamp | AWSTimestamp      | When the message was generated      |
| messageId        | String            | For internal usage only             |
| correlationId    | String            | For internal usage only             |

### Market

| Field          | Type    | Description                                   |
| -------------- | ------- | --------------------------------------------- |
| id             | Long    | Unique market identifier                      |
| eventId        | Long    | Associated event identifier                   |
| marketTypeId   | Int     | Market type identifier                        |
| betTypeId      | Long    | Bet type identifier                           |
| teamId         | Long    | Team identifier for team-specific markets     |
| sideIndex      | Int     | Side index (0=Away/Over, 1=Home/Under)        |
| periodTypeId   | Int     | Period type identifier                        |
| personId       | Long    | Player identifier for player-specific markets |
| live           | Boolean | Whether this is a live market                 |
| seasonId       | Long    | Season identifier                             |
| sequenceNumber | Long    | Market sequence number                        |
| betSubType     | String  | Additional bet type context                   |
| sideName       | String  | Custom side name if applicable                |
| modifiedOn     | String  | Last modification timestamp                   |

### Example Subscription

```plaintext
subscription {
  marketUpdate(leagueIds: [3, 1]) {
    leagueId
    updateType
    market {
      id
      eventId
      betTypeId
      teamId
      personId
      live
      betSubType
      modifiedOn
    }
    messageTimestamp
  }
}
```
