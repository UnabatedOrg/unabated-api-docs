# Odds

Retrieve a listing of current odds data for the specific league and market type.

<scalar-callout type="neutral" icon="">
[https://data.unabated.com/market/{league}/{marketType}/odds](https://data.unabated.com)
</scalar-callout>

### URL Parameters

| Parameter  | Type   | Description                                                                        |
| ---------- | ------ | ---------------------------------------------------------------------------------- |
| league     | String | The league for which to retrieve data. Short name format (e.g. `mlb`, `nfl`, etc.) |
| marketType | String | Type of market (see below)                                                         |

#### Market Types

* **straight** - Standard game markets (moneyline, spread, totals)

* **futures** - Season-long betting markets (championships, awards)

* **props** - Proposition bets (player props, team props, game props)

## Response Structure

The Unabated API returns odds data in a hierarchical JSON structure organized by league, period type, and game state. This structure provides comprehensive betting market information including event details, team information, and market source lines.

<scalar-callout type="warning" icon="">
Objet keys throughout this structure are for navigational purposes only, and can be directly keyed into via the `marketLineKey `property of our websocket payloads.\
\
These keys are _not_ meant to be parsed for data consumption.\
\
**If you are looking for a unique key for a particular market line, you want to be using the&#x20;**`marketLineId`**&#x20;which is guaranteed to be unique for the given market and market source.**
</scalar-callout>

```plaintext
{
  "odds": {
    "{leagueCode}": {
      "leagueId": integer,
      "periodTypes": {
        "{periodTypeName}": {
          "periodTypeId": integer,
          "{gameState}": {
            "{marketKey}": { /* Market Group Object */ }
          }
        }
      }
    }
  },
  "lastUpdated": timestamp
}
```

#### Root Fields

| Field       | Type    | Description                                      |
| ----------- | ------- | ------------------------------------------------ |
| odds        | Object  | Contains all odds data organized by league       |
| lastUpdated | Integer | Unix timestamp of when the data was last updated |

### League Structure

Each league is identified by its short code (e.g., "nba", "nfl", "mlb") and contains:

| Field       | Type    | Description                            |
| ----------- | ------- | -------------------------------------- |
| leagueId    | Integer | Unique identifier for the league       |
| periodTypes | Object  | Period types available for this league |

### Period Types Structure

Period types are organized by name (e.g., "game", "firstHalf") and contain:

| Field        | Type    | Description                           |
| ------------ | ------- | ------------------------------------- |
| periodTypeId | Integer | Unique identifier for the period type |
| {gameState}  | Object  | Game state containers (pregame, live) |

### Game States

* **pregame** - Markets for games that haven't started

* **live** - Markets for games currently in progress

### Market Key

Market keys follow this standardized format:

```plaintext
eid{eventId}:bt{betTypeId}:bst{betSubType}:pt{periodTypeId}:pid{personId}:tid{teamId}:sid{sideIndex}:{gameState}
```

**Examples:**

* `eid940356:bt72:bst0:pt1:pregame` - Pregame full game market for event 940356

* `eid940356:bt104:bst1:pt2:live` - Live first half market for event 940356

#### Market Key Components

| Component | Description              | Example   |
| --------- | ------------------------ | --------- |
| eid       | Event ID                 | eid940356 |
| bt        | Bet Type ID              | bt72      |
| bst       | Bet Sub Type (0 if none) | bst0      |
| pt        | Period Type ID           | pt1       |
| gameState | pregame or live          | pregame   |
| pid       | Person Id (0 if none)    | pid41840  |
| tid       | Team Id (0 if none)      | tid4883   |

### Market Group Object

Each market group contains comprehensive information about a specific betting market:

#### Core Market Fields

| Field          | Type    | Description                                                     |
| -------------- | ------- | --------------------------------------------------------------- |
| eventId        | Integer | Unique identifier for the event                                 |
| isLive         | Boolean | Whether the market is currently live                            |
| eventStart     | String  | Event start time in ISO 8601 format (UTC)                       |
| eventEnd       | String  | Event end time in ISO 8601 format (UTC)                         |
| statusId       | Integer | Current event status (see Event Status reference)               |
| betTypeId      | Integer | Type of bet (see Bet Types reference)                           |
| betSubType     | String  | Additional bet type context if applicable                       |
| gameClock      | String  | Current game clock display                                      |
| overtimeNumber | Integer | Number of overtime periods (0 if none)                          |
| eventName      | String  | Full display name of the event                                  |
| playerPosition | String  | Player position for player props (empty for non-player markets) |
| tournamentName | String  | Tournament name if applicable                                   |

### Event Teams Structure

The `eventTeams` object contains team information organized by side index:

```plaintext
"eventTeams": {
  "0": {
    "teamId": 75,
    "rotationNumber": 501,
    "sideIndex": 0,
    "score": 0
  },
  "1": {
    "teamId": 84,
    "rotationNumber": 502,
    "sideIndex": 1,
    "score": 0
  }
}
```

##### Event Team Fields

| Field          | Type    | Description                    |
| -------------- | ------- | ------------------------------ |
| teamId         | Integer | Unique identifier for the team |
| rotationNumber | Integer | Sportsbook rotation number     |
| sideIndex      | Integer | 0 = Away/Over, 1 = Home/Under  |
| score          | Integer | Current score (0 for pregame)  |

### Sides Structure

The `sides `object contains market lines organized by side keys:

#### Side Key Format

Side keys follow this pattern:

```plaintext
si{sideIndex}:tid{teamId}
```

**Examples:**

* `si0:tid75` - Away team (side 0) with team ID 75

* `si1:tid84` - Home team (side 1) with team ID 84

For player props, the format includes player ID:

```plaintext
si{sideIndex}:pid{playerId}
```

#### Side Object Structure

Each side contains market participant information and market source lines:

```plaintext
"si0:tid75": {
  "sideIndex": 0,
  "sideName": "",
  "teamId": 75,
  "personId": null,
  "marketSourceLines": {
    "{marketSourceId}": { /* Market Source Line Object */ }
  }
}
```

##### Side Fields

| Field             | Type          | Description                          |
| ----------------- | ------------- | ------------------------------------ |
| sideIndex         | Integer       | 0 = Away/Over, 1 = Home/Under        |
| sideName          | String        | Custom side name (empty if standard) |
| teamId            | Integer\|null | Team ID for team-based markets       |
| personId          | Integer\|null | Player ID for player-based markets   |
| marketSourceLines | Object        | Market lines from different sources  |

### Market Source Lines

Market source lines contain odds data from specific books or sources:

#### Market Source Line Object

```plaintext
"91": {
  "marketId": 43907422,
  "marketLineId": 3181318560,
  "marketSourceId": 91,
  "points": 230.5,
  "price": -110,
  "sourcePrice": -110,
  "sourceFormat": 1,
  "statusId": 1,
  "sequenceNumber": 1749141120194,
  "edge": -0.0642,
  "bestAltPrice": -110,
  "bestAltPoints": 230.5,
  "bestAltEdge": -0.0842,
  "disabled": false,
  "marketLineKey": "",
  "modifiedOn": "2025-06-05T16:32:07.592989Z",
  "alternateLines": [ /* Array of alternate line objects */ ]
}
```

##### Market Source Line Fields

| Field          | Type         | Description                                                  |
| -------------- | ------------ | ------------------------------------------------------------ |
| marketId       | Integer      | Unique market identifier                                     |
| marketLineId   | Integer      | Unique market line identifier                                |
| marketSourceId | Integer      | Source/sportsbook identifier                                 |
| points         | Number\|null | Point spread or total (null for moneyline)                   |
| price          | Integer      | Price in American odds format                                |
| sourcePrice    | Number       | Original price from the source                               |
| sourceFormat   | Integer      | Price format (1=American, 2=Decimal)                         |
| statusId       | Integer      | Status of the market line (see Market Line Status reference) |
| sequenceNumber | Integer      | Update sequence for ordering                                 |
| edge           | Number       | Calculated edge value                                        |
| bestAltPrice   | Integer      | Best available alternate price                               |
| bestAltPoints  | Number       | Points for best alternate price                              |
| bestAltEdge    | Number       | Edge for best alternate price                                |
| disabled       | Boolean      | Whether the line is disabled                                 |
| marketLineKey  | String       | Additional line identifier                                   |
| modifiedOn     | String       | Last modification time (ISO 8601)                            |

#### Alternate Lines

Alternate lines provide additional betting options with different points/prices:

```plaintext
"alternateLines": [
  {
    "marketId": 43907422,
    "marketLineId": 3181318560,
    "marketSourceId": 91,
    "alternateNumber": 1,
    "points": 231.5,
    "price": -120,
    "sourcePrice": -120,
    "statusId": 1,
    "sequenceNumber": 1749141120194,
    "edge": -0.0842,
    "modifiedOn": "2025-06-05T16:32:07.592989Z"
  }
]
```

##### Alternate Line Fields

| Field           | Type    | Description                       |
| --------------- | ------- | --------------------------------- |
| alternateNumber | Integer | Sequence number for the alternate |
| points          | Number  | Alternate point value             |
| price           | Integer | Price for alternate line          |
| edge            | Number  | Calculated edge for alternate     |
| (other fields)  | Various | Same as main market source line   |

### Data Navigation Examples

#### Accessing a Specific Market Line

To access odds for a specific sportsbook on a particular side:

```plaintext
const nbaOdds = response.odds.nba;
const gameMarkets = nbaOdds.periodTypes.game.pregame;
const market = gameMarkets['eid940356:bt72:bst0:pt1:pregame'];
const awaySide = market.sides['si0:tid75'];
const draftkingsLine = awaySide.marketSourceLines['91'];
```

#### Iterating Through All Markets

```plaintext
// Iterate through leagues
for (const [leagueCode, leagueData] of Object.entries(response.odds)) {
  // Iterate through period types
  for (const [periodName, periodData] of Object.entries(leagueData.periodTypes)) {
    // Iterate through game states (pregame/live)
    for (const [gameState, markets] of Object.entries(periodData)) {
      if (gameState === 'periodTypeId') continue; // Skip metadata
      
      // Iterate through markets
      for (const [marketKey, marketData] of Object.entries(markets)) {
        // Process market data
        console.log(`Market: ${marketKey}`);
        console.log(`Event: ${marketData.eventName}`);
      }
    }
  }
}
```
