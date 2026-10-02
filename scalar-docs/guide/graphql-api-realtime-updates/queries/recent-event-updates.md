# Recent Event Updates

Retrieve event updates that occurred after a specified timestamp. This is primarily used in conjunction with the `latestTimestamp` field off the RESTful point-in-time market data pull, and will fill the gap of any missed messages between when your web socket connection begins.

## Parameters

| Parameter | Type         | Description                                                                                | Required |
| --------- | ------------ | ------------------------------------------------------------------------------------------ | -------- |
| leagueIds | Array\[Int]  | Filter by league IDs. If omitted, returns updates for all leagues your API key can access. | No       |
| since     | AWSTimestamp | Unix timestamp (in milliseconds). Returns only updates that occurred after this time.      | No       |

## Response Types

### EventUpdate

Each `EventUpdate` contains the same structure as the subscription payload:

| Field            | Type         | Description                                                                         |
| ---------------- | ------------ | ----------------------------------------------------------------------------------- |
| leagueId         | Int!         | League identifier                                                                   |
| event            | Event!       | Complete event data. See the `Event Updates` subscription for full payload details. |
| messageTimestamp | AWSTimestamp | When the original update occurred                                                   |
| messageId        | String       | Internal use only                                                                   |
| correlationId    | String       | Internal use only                                                                   |

## Example Query

```plaintext
query GetRecentEventUpdates {
  eventUpdates(
    leagueIds: [3, 1]
    since: 1734567890000
  ) {
    leagueId
    event {
      eventId
      statusId
      statusName
      gameClock
      eventTeams {
        teamId
        score
        sideIndex
      }
    }
    messageTimestamp
  }
}
```
