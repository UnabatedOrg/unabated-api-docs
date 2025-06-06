import * as dotenv from 'dotenv';
import gql from 'graphql-tag';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';

dotenv.config({
    path: '../../../../.env'
});

if (
    !process.env.REALTIME_API_HOST
    || !process.env.REALTIME_API_REGION
    || !process.env.REALTIME_API_KEY
) {
    console.error('Missing required environment variables for Realtime API connection.');
    process.exit(1);
}

const realtimeGqlUrl = `https://${process.env.REALTIME_API_HOST}/graphql`;

const client = new AWSAppSyncClient({
  url: realtimeGqlUrl,
  region: process.env.REALTIME_API_REGION!,
  auth: {
    type: AUTH_TYPE.AWS_LAMBDA,
    token: process.env.REALTIME_API_KEY!,
  },
  disableOffline: true,
});

(async () => {
  console.log(`Starting websocket subscriber...`);
  
  const subscription = client
    .subscribe({
      query: gql`subscription marketLineUpdate {
        marketLineUpdate {
          leagueId
          marketSourceGroup
          messageId
          messageTimestamp
          correlationId
          marketLines {
            marketId
            marketLineId
            marketSourceId
            points
            price
            sourcePrice
            sourceFormat
            statusId
            sequenceNumber
            edge
            bestAltPoints
            bestAltPrice
            bestAltEdge
            disabled
            marketLineKey
            modifiedOn
            alternateLines {
                marketId
                marketLineId
                marketSourceId
                points
                price
                sourcePrice
                sourceFormat
                alternateNumber
                statusId
                sequenceNumber
                edge
                disabled
                modifiedOn
            }
          }
        }
      }`
    })
    .subscribe({
      next: (data: any) => {
        const message = data.data.marketLineUpdate;

        console.log(message);
      },
      error: (err: any) => {
        const errorRecord = {
          timestamp: new Date().toISOString(),
          error: err.toString(),
          details: err
        };

        console.log(errorRecord);
      },
      complete: () => {
        console.log(`[${new Date().toISOString()}] subscription closing...`);
      },
    });

  // Keep process alive and update heartbeat
  setInterval(() => {
    console.log('...still listening.')
  }, 30000);
})();