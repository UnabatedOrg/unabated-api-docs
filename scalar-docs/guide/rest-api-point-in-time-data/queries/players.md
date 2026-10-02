# Players

Retrieve a list of all players in a specific league.

<scalar-callout type="neutral" icon="">
`GET https://data.unabated.com/player/{league}`
</scalar-callout>

### URL Parameters

|                |        |                                                                                                                                                                                  |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field          | Type   | Description                                                                                                                                                                      |
| `league`       | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.)                                                                                               |
| `changedSince` | String | The datetime after which changes or additions occurred to the players (in UTC time, ISO 8601 format). Will only return those rows. If null/empty, then all players are returned. |

### Response Fields

|                     |                 |                                                                           |
| ------------------- | --------------- | ------------------------------------------------------------------------- |
| Attribute           | Type            | Description                                                               |
| `headshotUrl`       | String or null  | URL to the player's headshot image, if available.                         |
| `firstName`         | String or null  | The first name of the player.                                             |
| `lastName`          | String or null  | The last name of the player.                                              |
| `preferredName`     | String or null  | The preferred name of the player, if available.                           |
| `jerseyNumber`      | Integer or null | The jersey number of the player, if available.                            |
| `country`           | String or null  | The country of the player.                                                |
| `priorityType`      | String or null  | The priority level of the player (e.g., "low").                           |
| `height`            | Integer or null | The height of the player in inches.                                       |
| `weight`            | Integer or null | The weight of the player in pounds.                                       |
| `position`          | String or null  | The position of the player, if available.                                 |
| `birthDate`         | String or null  | The birth date of the player.                                             |
| `leagueId`          | Integer         | The identifier of the league the player belongs to.                       |
| `teamId`            | Integer or null | The identifier of the team the player belongs to, if any.                 |
| `partnerPlayerData` | Object or null  | Partner-specific player data with partner keys and associated player IDs. |
| `modifiedOn`        | String or null  | The last modification date and time in ISO 8601 format.                   |
| `id`                | Integer         | The unique identifier for the player.                                     |
