# People

Retrieve a listing of people who have applicable market data for the league and marketType specified.

<scalar-callout type="neutral" icon="">
GET [https://data.unabated.com/market/{league}/{marketType}/people](https://data.unabated.com)
</scalar-callout>
<scalar-callout type="info" icon="">
This endpoint returns only players who currently have odds available for the specified league and market type. To retrieve all players for a league regardless of market availability, use the non-market-specific `/player/{league}` endpoint.
</scalar-callout>

## URL Parameters

| Parameter  | Type   | Description                                                                        |
| ---------- | ------ | ---------------------------------------------------------------------------------- |
| league     | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.) |
| marketType | String | Type of market (see odds)                                                          |

## Response Structure

The response is a flat JSON object where each key is a player ID and the value contains comprehensive player information.

```plaintext
{
  "{playerId}": {
    [...fields]
  }
}
```

### Response Fields

| Field        | Type    | Description                              |
| ------------ | ------- | ---------------------------------------- |
| id           | Integer | Unique identifier for the player         |
| headshotUrl  | String  | Relative path to player's headshot image |
| firstName    | String  | Player's first name                      |
| lastName     | String  | Player's last name                       |
| jerseyNumber | String  | Current jersey number                    |
| country      | String  | Birthplace and country code              |
| priorityType | Integer | Player priority level                    |
| height       | Integer | Height in inches                         |
| weight       | Integer | Weight in pounds                         |
| position     | String  | Player position abbreviation             |
| birthDate    | String  | Birth date in ISO 8601 format (UTC)      |
| leagueId     | Integer | League identifier                        |
