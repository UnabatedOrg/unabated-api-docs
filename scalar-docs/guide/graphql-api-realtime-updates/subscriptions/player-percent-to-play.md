# Player Percent to Play

<scalar-callout type="info" icon="">
Requires elevated access, inquire [here](mailto:dan@unbated.com).
</scalar-callout>

Player Percent to Play Subscription

Subscribe to real-time player percent-to-play updates for one or more leagues. Receive immediate notifications when player availability percentages are created or updated.

## Parameters

| Field       | Type              | Description                                                                                                                                              |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leagueIds` | array of integers | Optional. Array of league IDs to subscribe to (e.g., `[1, 3]` for NFL and NBA). If omitted, you will receive updates for all leagues you have access to. |

## Response Fields

| Field                 | Type   | Description                                                               |
| --------------------- | ------ | ------------------------------------------------------------------------- |
| `playerPercentToPlay` | object | The player percent-to-play item (see Player Percent to Play Fields below) |
| `messageTimestamp`    | string | Timestamp when the message was generated                                  |
| `messageId`           | string | Unique identifier for this message (for internal use)                     |
| `correlationId`       | string | Correlation identifier for message tracking (for internal use)            |

### Player Percent to Play Fields

| Field           | Type    | Description                                                  |
| --------------- | ------- | ------------------------------------------------------------ |
| `leagueId`      | int     | League identifier                                            |
| `person`        | object  | Player information (see Person Fields below)                 |
| `event`         | object  | Event information (see Event Fields below)                   |
| `team`          | object  | Team information (see Team Fields below)                     |
| `percentToPlay` | decimal | Percent chance the player will play in the next game (0-100) |
| `notes`         | string  | Additional notes or description                              |
| `meta`          | object  | Metadata about the item (see Meta Fields below)              |

### Person Fields

| Field       | Type   | Description       |
| ----------- | ------ | ----------------- |
| `id`        | long   | Player identifier |
| `firstName` | string | Player first name |
| `lastName`  | string | Player last name  |

### Event Fields

| Field        | Type     | Description                                        |
| ------------ | -------- | -------------------------------------------------- |
| `id`         | long     | Event identifier                                   |
| `name`       | string   | Event name                                         |
| `eventStart` | datetime | Event start time (UTC)                             |
| `statusId`   | int      | Event status ID (1=PREGAME, 2=LIVE, 3=FINAL, etc.) |

### Team Fields

| Field  | Type   | Description     |
| ------ | ------ | --------------- |
| `id`   | long   | Team identifier |
| `name` | string | Team name       |

### Meta Fields

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `createdAt` | datetime | Date the item was created (UTC)      |
| `updatedAt` | datetime | Date the item was last updated (UTC) |

## Example Subscription

Subscribe to NBA and NHL percent-to-play updates:

```plaintext
subscription {
  playerPercentToPlay(leagueIds: [3, 4]) {
    playerPercentToPlay {
      leagueId
      person {
        id
        firstName
        lastName
      }
      event {
        id
        name
        eventStart
        statusId
      }
      team {
        id
        name
      }
      percentToPlay
      notes
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
