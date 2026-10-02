# Event Lineup

Subscribe to real-time event lineup updates for one or more leagues. Receive immediate notifications when starting lineups are projected, confirmed, or updated.

## Parameters

| Field       | Type              | Description                                                                                                                                              |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leagueIds` | array of integers | Optional. Array of league IDs to subscribe to (e.g., `[1, 3]` for NFL and NBA). If omitted, you will receive updates for all leagues you have access to. |

## Response Types

| Field              | Type   | Description                                                    |
| ------------------ | ------ | -------------------------------------------------------------- |
| `eventLineup`      | object | The event lineup data (see Event Lineup Fields below)          |
| `messageTimestamp` | string | Timestamp when the message was generated                       |
| `messageId`        | string | Unique identifier for this message (for internal use)          |
| `correlationId`    | string | Correlation identifier for message tracking (for internal use) |

### Event Lineup Fields

| Field      | Type   | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| `leagueId` | int    | League identifier                                    |
| `date`     | string | Date for the lineup in YYYY-MM-DD format             |
| `event`    | object | Event information (see Event Fields below)           |
| `teams`    | array  | Array of team lineups (see Team Lineup Fields below) |
| `meta`     | object | Metadata about the lineup (see Meta Fields below)    |

### Event Fields

| Field        | Type     | Description                                        |
| ------------ | -------- | -------------------------------------------------- |
| `id`         | long     | Event identifier                                   |
| `name`       | string   | Event name                                         |
| `eventStart` | datetime | Event start time (UTC)                             |
| `statusId`   | int      | Event status ID (1=PREGAME, 2=LIVE, 3=FINAL, etc.) |

### Team Lineup Fields

| Field          | Type     | Description                                          |
| -------------- | -------- | ---------------------------------------------------- |
| `side`         | string   | Side of the event: "AWAY" or "HOME"                  |
| `team`         | object   | Team information (see Team Fields below)             |
| `lineupStatus` | string   | Lineup status: "PROJECTED" or "CONFIRMED"            |
| `confirmedAt`  | datetime | When the lineup was confirmed (null if projected)    |
| `starters`     | array    | Array of starting players (see Starter Fields below) |

### Team Fields

| Field  | Type   | Description     |
| ------ | ------ | --------------- |
| `id`   | long   | Team identifier |
| `name` | string | Team name       |

### Starter Fields

| Field      | Type   | Description                                                 |
| ---------- | ------ | ----------------------------------------------------------- |
| `position` | string | Player position (e.g., "PG", "SG", "SF", "PF", "C" for NBA) |
| `player`   | object | Player information (see Player Fields below)                |

### Player Fields

| Field       | Type   | Description       |
| ----------- | ------ | ----------------- |
| `id`        | long   | Player identifier |
| `firstName` | string | Player first name |
| `lastName`  | string | Player last name  |

### Meta Fields

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `createdAt` | datetime | Date the item was created (UTC)      |
| `updatedAt` | datetime | Date the item was last updated (UTC) |

## Example Subscription

Subscribe to NBA lineup updates:

```plaintext
subscription {
  eventLineup(leagueIds: [3]) {
    eventLineup {
      leagueId
      date
      event {
        id
        name
        eventStart
        statusId
      }
      teams {
        side
        team {
          id
          name
        }
        lineupStatus
        confirmedAt
        starters {
          position
          player {
            id
            firstName
            lastName
          }
        }
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
