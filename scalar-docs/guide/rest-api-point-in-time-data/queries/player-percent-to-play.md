# Player Percent to Play

<scalar-callout type="info" icon="">
Requires elevated access, inquire [here](mailto:dan@unabated.com).
</scalar-callout>

Get player percent-to-play data for a specific league with cursor-based pagination. Returns 50 items per page.

**Endpoint:**

`GET /player/{league}/percent-to-play`

## URL Parameters

| Field    | Type   | Description                                   |
| -------- | ------ | --------------------------------------------- |
| `league` | string | League identifier (e.g., "nfl", "nba", "mlb") |

## Query Parameters

| Field      | Type   | Description                                                                |
| ---------- | ------ | -------------------------------------------------------------------------- |
| `cursor`   | string | Cursor for pagination (opaque base64-encoded string). Omit for first page. |
| `order`    | string | Sort order: "desc" (default, newest first) or "asc" (oldest first)         |
| `personId` | long   | Optional. Filter by specific player ID                                     |
| `teamId`   | int    | Optional. Filter by specific team ID                                       |

### Response Fields

| Field        | Type    | Description                                       |
| ------------ | ------- | ------------------------------------------------- |
| `data`       | array   | Array of player percent-to-play items (see below) |
| `success`    | boolean | Indicates whether the operation was successful    |
| `messages`   | array   | Collection of messages (errors, warnings, info)   |
| `pagination` | object  | Pagination information (see below)                |

### Pagination Object

| Field            | Type   | Description                                                                     |
| ---------------- | ------ | ------------------------------------------------------------------------------- |
| `nextCursor`     | string | Cursor to use for fetching the next page. Empty string if no next page.         |
| `previousCursor` | string | Cursor to use for fetching the previous page. Empty string if no previous page. |

### Player Percent to Play Item Fields

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

## Pagination Example

To fetch the next page, use the

`nextCursor`

value from the response:

```plaintext
GET /player/nba/percent-to-play?cursor=eyJpZCI6MTIzNDUsImRpcmVjdGlvbiI6Im5leHQifQ==
```

## Filtering Example

To fetch percent-to-play data for a specific player:

```plaintext
GET /player/nba/percent-to-play?personId=12345
```

To fetch percent-to-play data for a specific team:

```plaintext
GET /player/nba/percent-to-play?teamId=200
```
