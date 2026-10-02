# Event Updates

Subscribe to real-time event updates including game state changes, scores, and timing information.

## Parameters

| Parameter | Type        | Description                                                                                                    | Required |
| --------- | ----------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| leagueIds | Array\[Int] | Array of league IDs to filter events. If omitted, receives updates for all leagues your API key has access to. | No       |

## Response Types

### EventUpdate

| Field            | Type         | Description                     |
| ---------------- | ------------ | ------------------------------- |
| leagueId         | Int!         | League identifier for the event |
| event            | Event!       | Complete event data object      |
| messageTimestamp | AWSTimestamp | When the message was generated  |
| messageId        | String       | For internal usage only         |
| correlationId    | String       | For internal usage only         |

### Event

| Field            | Type             | Description                                             |
| ---------------- | ---------------- | ------------------------------------------------------- |
| eventId          | Long             | Unique event identifier                                 |
| leagueId         | Int!             | League identifier                                       |
| statusId         | Int              | Event status code (1=Pre-game, 2=Live, 3=Final, etc.)   |
| statusName       | String           | Human-readable event status                             |
| seasonId         | Long             | Season identifier                                       |
| seasonPartId     | Long             | Season part identifier (regular season, playoffs, etc.) |
| eventStart       | String           | Event start time in ISO 8601 format                     |
| eventEnd         | String           | Event end time in ISO 8601 format                       |
| gameClock        | String           | Current game clock display                              |
| periodTypeId     | Int              | Current period type identifier                          |
| periodTypeName   | String           | Human-readable period type name                         |
| overtimeNumber   | Int              | Number of overtime periods                              |
| tournamentId     | Long             | Tournament identifier if applicable                     |
| name             | String           | Full event name                                         |
| eventTeams       | \[EventTeam]     | Array of participating teams                            |
| partnerEventData | PartnerEventData | Partner-specific event data                             |
| modifiedOn       | String           | Last modification timestamp                             |

## Example Subscription

```plaintext
subscription {
  eventUpdate(leagueIds: [3, 1]) {
    leagueId
    event {
      eventId
      statusId
      statusName
      eventStart
      gameClock
      name
      eventTeams {
        teamId
        score
        sideIndex
        name
      }
    }
    messageTimestamp
  }
}
```
