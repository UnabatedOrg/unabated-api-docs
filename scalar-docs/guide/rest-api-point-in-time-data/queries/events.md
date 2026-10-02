# Events

Retrieve a listing of all all scheduled, cancelled, postponed, and delayed events, that are within our “markets window”.

<scalar-callout type="neutral" icon="">
`GET https://data.unabated.com/event/{league}/upcoming`
</scalar-callout>

### URL Parameters

|                |        |                                                                                                                                                                                |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Field          | Type   | Description                                                                                                                                                                    |
| `league`       | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.)                                                                                             |
| `changedSince` | String | The datetime after which changes or additions occurred to the events (in UTC time, ISO 8601 format). Will only return those rows. If null/empty, then all events are returned. |

### Response Fields

|                    |                 |                                                                                                                                                                                                   |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attribute          | Type            | Description                                                                                                                                                                                       |
| `eventId`          | Integer         | The unique static key of the event/game.                                                                                                                                                          |
| `name`             | String or null  | The name of the event.                                                                                                                                                                            |
| `eventStart`       | String          | The scheduled start time of the game in ISO 8601 format (in UTC).                                                                                                                                 |
| `eventEnd`         | String or null  | The end time of the event in ISO 8601 format (in UTC), if any. For future use.                                                                                                                    |
| `statusId`         | Integer         | See `event status` static lookup data.                                                                                                                                                            |
| `leagueId`         | Integer         | The identifier of the league the event belongs to.                                                                                                                                                |
| `seasonId`         | Integer or null | The identifier of the season.                                                                                                                                                                     |
| `seasonPartId`     | Integer or null | The identifier of the part of the season.                                                                                                                                                         |
| `tournamentId`     | Integer or null | The identifier of the tournament, if any.                                                                                                                                                         |
| `gameClock`        | String or null  | Contains a description of the game state. Typically the game clock. Example: 12:45 1H                                                                                                             |
| `periodTypeId`     | Integer or null | Period Type (see Period Types table for valid values) that the game is currently in.                                                                                                              |
| `overtimeNumber`   | Integer or null | A number indicating how many overtime periods the game went to. Examples: An MLB game that goes to the 12th inning will have the number 12. A CFB game which goes into 3 overtimes will have a 3. |
| `eventTeams`       | Array           | An array of team objects participating in the event. Each object has fields including id, rotationNumber, and score.                                                                              |
| `partnerEventData` | Object or null  | Partner-specific event data with partner keys and associated event IDs.                                                                                                                           |
| `modifiedOn`       | String or null  | The last modification date and time in ISO 8601 format.                                                                                                                                           |

### Event Team Fields

|                  |                 |                                                                                    |
| ---------------- | --------------- | ---------------------------------------------------------------------------------- |
| Attribute        | Type            | Description                                                                        |
| `teamId`         | Integer         | The identifier of the team.                                                        |
| `rotationNumber` | Integer or null | The rotation number assigned to the team, if any.                                  |
| `score`          | Integer or null | The current score for the team, if available.                                      |
| `sideIndex`      | Integer or null | The side of the event for this team when known. 0 = Away or Over 1 = Home or Under |
| `name`           | String or null  | The display name of the team, if available.                                        |
