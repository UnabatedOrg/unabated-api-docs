# Tournaments

Retrieve a list of all tournaments for a specific league.

<scalar-callout type="neutral" icon="">
GET `https://data.unabated.com/tournament/{league}`
</scalar-callout>

### URL Parameters

|          |        |                                                                                             |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| Field    | Type   | Description                                                                                 |
| `league` | String | The league for which to retrieve tournament data. Short name format (e.g.`mlb`,`nfl`, etc.) |

### Response Fields 

|               |                 |                                                              |
| ------------- | --------------- | ------------------------------------------------------------ |
| Attribute     | Type            | Description                                                  |
| `id`          | Integer         | The unique identifier for the tournament.                    |
| `name`        | String or null  | The name of the tournament.                                  |
| `leagueId`    | Integer         | The identifier of the league the tournament belongs to.      |
| `seasonId`    | Integer or null | The identifier of the season associated with the tournament. |
| `surfaceType` | String or null  | The type of surface for the tournament, if applicable.       |
| `bestOf`      | Integer or null | The number of matches/games in a series, if applicable.      |
| `modifiedOn`  | String or null  | The last modification date and time in ISO 8601 format.      |
