# Player News

<scalar-callout type="info" icon="">
Requires elevated access, inquire [here](mailto:dan@unabated.com).
</scalar-callout>

Get player news items for a specific league with cursor-based pagination. Returns 25 items per page.

**Endpoint:**

`GET /player/{league}/news`

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

| Field        | Type    | Description                                     |
| ------------ | ------- | ----------------------------------------------- |
| `data`       | array   | Array of player news items (see below)          |
| `success`    | boolean | Indicates whether the operation was successful  |
| `messages`   | array   | Collection of messages (errors, warnings, info) |
| `pagination` | object  | Pagination information (see below)              |

### Pagination Object

| Field            | Type   | Description                                                                     |
| ---------------- | ------ | ------------------------------------------------------------------------------- |
| `nextCursor`     | string | Cursor to use for fetching the next page. Empty string if no next page.         |
| `previousCursor` | string | Cursor to use for fetching the previous page. Empty string if no previous page. |

### Player News Item Fields

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

## Pagination Example

To fetch the next page, use the

`nextCursor`

value from the response:

```plaintext
GET /player/nfl/news?cursor=eyJpZCI6MTIzNDUsImRpcmVjdGlvbiI6Im5leHQifQ==
```

## Filtering Example

To fetch news for a specific player:

```plaintext
GET /player/nfl/news?personId=67890
```

To fetch news for a specific team:

```plaintext
GET /player/nfl/news?teamId=100
```
