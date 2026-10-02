# Market Source Updates

Subscribe to updates about sportsbook/market source information including status changes and metadata updates.

## Parameters

None - receives updates for all market sources.

## Response Types

### MarketSourceUpdate

| Field            | Type         | Description                    |
| ---------------- | ------------ | ------------------------------ |
| marketSource     | MarketSource | Updated market source data     |
| messageTimestamp | AWSTimestamp | When the message was generated |
| messageId        | String       | For internal usage only        |
| correlationId    | String       | For internal usage only        |

### MarketSource

| Field           | Type    | Description                         |
| --------------- | ------- | ----------------------------------- |
| id              | Long    | Unique market source identifier     |
| name            | String  | Display name of the sportsbook      |
| logoUrl         | String  | URL to sportsbook logo              |
| thumbnailUrl    | String  | URL to sportsbook thumbnail         |
| siteUrl         | String  | Official sportsbook website         |
| isActive        | Boolean | Whether the sportsbook is active    |
| statusId        | Int     | Overall status for standard markets |
| propsStatusId   | Int     | Status for props markets            |
| futuresStatusId | Int     | Status for futures markets          |
| modifiedOn      | String  | Last modification timestamp         |

## Example Subscription

```plaintext
subscription {
  marketSourceUpdate {
    marketSource {
      id
      name
      isActive
      statusId
      propsStatusId
      futuresStatusId
      modifiedOn
    }
    messageTimestamp
  }
}
```
