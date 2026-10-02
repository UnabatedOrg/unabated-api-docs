# Getting Started

### Overview

The Unabated API provides programmatic access to all of Unabated’s Game Odds and Props market, game state, and scoring data. Some key features and points of the API are:

1. A “snapshot” endpoint to retrieve the current lines for all markets across all sports that Unabated offers. This includes all sportsbook, team, and player metadata.

2. A realtime push notification via GraphQL websockets to provide updates to game odds that you are interested in.

3. No additional data latency beyond that which we have on our backend as we pull information from sportsbooks. These latency categories are specified in the sportsbook metadata, and can also be seen in our Game Odds and Props Odds UI as colored dots in the grid headers:

   1. Green = Real-time

   2. Yellow = Under 30 seconds

   3. Orange = Over 30 seconds

4. There are no call limits or API throttling, but you should not call these endpoints more than 1 time per second as there will be no change in information during that time and would just be wasted compute time on our servers and your client.

## Use Cases

If you want to stay on top of every market movement, you would use a combination of the Snapshot Endpoint and Realtime Websocket Notifications described in the section below.\
\
Or, if you are just interested in taking occasional snapshots of the markets you can simplify your implementation by just calling the Snapshot Endpoint.\
\
If you want to get the data more frequently than every 60 seconds, then for performance reasons you should use the Snapshot Endpoint to get initial data, coupled with Realtime web socket Notifications to receive ongoing changes.\
\
You can also use the Snapshot Endpoint as a refresh point for example in a case where your processing was interrupted, and you need to get back to the current market state.

## Implementation

See the REST API and GraphQL API sections in the left bar for further details on each implementation method.

#### Full Lifecycle Subscriptions

To get an initial set of odds and keep it updated on an ongoing basis:

1. Call the **Snapshot Endpoint** to get an initial full snapshot of odds for all events currently on the calendar for that day and several upcoming days.

2. Start your web socket subscription to receive ongoing updates.

3. Backfill any odds updates that occurred between steps 1 & 2

   1. Immediately call the `marketLineUpdated` GraphQL query on the **Realtime Notification Endpoint**

   2. Use the same `leagueIds` and `marketSourceGroups` that you used when subscribing to the web socket updates in #2.

   3. Use the `lastUpdated` value from the snapshot response as your value for the `since` parameter. History maxes out at 1 minute, regardless of what you pass here. To receive all updates for the past minute, you can leave this field blank.

   4. The response of this call will be such that you can replay them through the same web socket data handler you hooked up for #2.
