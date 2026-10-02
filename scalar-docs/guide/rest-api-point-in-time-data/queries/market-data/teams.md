# Teams

Retrieve a listing of teams with applicable market data for the league and marketType specified.

<scalar-callout type="info" icon="">
This endpoint returns only teams who currently tie to odds available for the specified league and market type. To retrieve all teams for a league regardless of market availability, use the non-market-specific `/team/{league}` endpoint.
</scalar-callout>

## URL Parameters

| Parameter  | Type   | Description                                                                        |
| ---------- | ------ | ---------------------------------------------------------------------------------- |
| league     | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.) |
| marketType | String | Type of market (see odds)                                                          |

## Response Structure

The response is a flat JSON object where each key is a team ID and the value contains comprehensive team information including branding assets.

```plaintext
{
  "{teamId}": {
    [...fields]
  }
}
```

### Response Fields

| Field        | Type    | Description                    |
| ------------ | ------- | ------------------------------ |
| id           | Integer | Unique identifier for the team |
| name         | String  | Team name                      |
| abbreviation | String  | Team abbreviation              |
| logoUrl      | String  | Full URL to team logo          |
| leagueId     | Integer | League identifier              |
