# Teams

Retrieve a listing of all available teams within a league.

<scalar-callout type="neutral" icon="">
GET `https://data.unbated.com/team/{league}`
</scalar-callout>

### URL Parameters

|                |        |                                                                                                                                                                              |
| -------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field          | Type   | Description                                                                                                                                                                  |
| `league`       | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.)                                                                                           |
| `changedSince` | String | The datetime after which changes or additions occurred to the teams (in UTC time, ISO 8601 format). Will only return those rows. If null/empty, then all teams are returned. |

### Response Fields

| Attribute                | Type            | Description                                                           |
| ------------------------ | --------------- | --------------------------------------------------------------------- |
| `name`                   | String or null  | The name of the team.                                                 |
| `abbreviation`           | String or null  | The abbreviation of the team name.                                    |
| `logoUrl`                | String or null  | URL to the logo image of the team.                                    |
| `leagueId`               | Integer         | The identifier of the league the team belongs to.                     |
| `divisionId`             | Integer or null | The identifier of the division the team belongs to, if any.           |
| `divisionAbbreviation`   | String or null  | The abbreviation of the division name, if any.                        |
| `conferenceAbbreviation` | String or null  | The abbreviation of the conference name, if any.                      |
| `partnerTeamData`        | Object or null  | Partner-specific team data with partner keys and associated team IDs. |
| `modifiedOn`             | String or null  | The last modification date and time in ISO 8601 format.               |
| `id`                     | Integer         | The unique identifier for the team.                                   |
