# Player News

<scalar-callout type="info" icon="">
Requires elevated access, inquire [here](mailto:dan@unabated.com).
</scalar-callout>

Player News Subscription

Subscribe to real-time player news updates for one or more leagues. Receive immediate notifications when new player news items are published or existing items are updated.

## Parameters

| Field       | Type              | Description                                                                                                                                              |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leagueIds` | array of integers | Optional. Array of league IDs to subscribe to (e.g., `[1, 3]` for NFL and NBA). If omitted, you will receive updates for all leagues you have access to. |

## Response Types

| Field              | Type   | Description                                                    |
| ------------------ | ------ | -------------------------------------------------------------- |
| `playerNews`       | object | The player news item (see Player News Fields below)            |
| `messageTimestamp` | string | Timestamp when the message was generated                       |
| `messageId`        | string | Unique identifier for this message (for internal use)          |
| `correlationId`    | string | Correlation identifier for message tracking (for internal use) |

### Player News Fields

| Field      | Type   | Description                                             |
| ---------- | ------ | ------------------------------------------------------- |
| `id`       | long   | Unique identifier for the news item                     |
| `leagueId` | int    | League identifier                                       |
| `person`   | object | Player information (see Person Fields below)            |
| `team`     | object | Team information (see Team Fields below)                |
| `headline` | string | News headline                                           |
| `notes`    | string | Additional notes or description                         |
| `status`   | string | Player status (e.g., "OUT", "QUESTIONABLE", "PROBABLE") |
| `injury`   | object | Injury information (see Injury Fields below)            |
| `meta`     | object | Metadata about the news item (see Meta Fields below)    |

### Person Fields

| Field       | Type   | Description       |
| ----------- | ------ | ----------------- |
| `id`        | long   | Player identifier |
| `firstName` | string | Player first name |
| `lastName`  | string | Player last name  |

### Team Fields

| Field  | Type   | Description     |
| ------ | ------ | --------------- |
| `id`   | long   | Team identifier |
| `name` | string | Team name       |

### Injury Fields

| Field  | Type   | Description                              |
| ------ | ------ | ---------------------------------------- |
| `id`   | int    | Injury type identifier                   |
| `name` | string | Injury type name (e.g., "Knee", "Ankle") |

### Meta Fields

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `createdAt` | datetime | Date the item was created (UTC)      |
| `updatedAt` | datetime | Date the item was last updated (UTC) |

## Example Subscription

Subscribe to NFL and NBA player news:

```plaintext
subscription {
  playerNews(leagueIds: [1, 3]) {
    playerNews {
      id
      leagueId
      person {
        id
        firstName
        lastName
      }
      team {
        id
        name
      }
      headline
      notes
      status
      injury {
        id
        name
      }
      meta {
        createdAt
        updatedAt
      }
    }
    messageTimestamp
    messageId
    correlationId
  }
}
```
