# Full Lifecycle Data Example

## Prep

A full coded example can be found in `index.ts`.  CURLs are being shown here for tech agnostic demonstration.

API URLs and keys can be obtained by speaking with your Unabated rep.

## Steps

### Pull the full set of initial data from the Unabated Data API

```
  curl -X GET <data_api_url>/market/nba/props/odds?x-api-key=<api_key>
  	-H "Content-Type: application/json"
```

### Handle the full snapshot response

The point in time snapshot will be in the `odds` container, store or process in any manner necessary for your application.

Note the `lastUpdated` timestamp, as this will be your key for catching any updates between this snapshot and when your websocket handlers kick in.

```
{
    "data": {
        "odds": {...}
        "lastUpdated": 1749217763072
    }
}
```

### Start the websocket via one of the methods found in `realtime-data-connection`

If your processing requires mapping market updates back into the snapshot document, you will find the full path to correct location in the `marketLineKey` property.

### Fill the gap

It's possible that your processor may have missed updates between the snapshot and the realtime alerts starting.  We provide a GQL endpoint that will give you all updates from a given timestamp.

Data is returned in the same format as the websocket messages.

*** Ensure that you call this endpoint with the same filters that you used for your websocket initialization, else you will get mismatched records ***


```

 curl -X POST <realtime_api_url>/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: <api_key>" \
  -d '{
    "query": "query MarketLineUpdates {
        marketLineUpdates(leagueIds: [3], since: 1749217763072) {
            <same fields from your socket subscription>
        }
    }"
  }'

```

Do not depend on polling this endpoint.  The `since` parameter is treated with a max of one minute prior, and is only intended for filling the gap in booting up the websocket handler.

### Continue processing realtime updates as they stream in

Now you are up-to-date and can apply updates as they stream in through the socket handler.