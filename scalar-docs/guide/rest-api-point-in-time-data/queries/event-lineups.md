# Event Lineups

Get starting lineups for events in a specific league. Optionally filter by date (defaults to today).

**Endpoint:**

`GET /event/{league}/lineup/{date?}`

## URL Parameters

| Field    | Type   | Description                                                                                  |
| -------- | ------ | -------------------------------------------------------------------------------------------- |
| `league` | string | League identifier (e.g., "nfl", "nba", "mlb")                                                |
| `date`   | string | Optional. Date in YYYY-MM-DD format (e.g., "2025-10-15"). Defaults to today if not provided. |

### Response Fields

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
