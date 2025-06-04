import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';

dotenv.config({ path: '../../../.env' });

const host = process.env.REALTIME_API_HOST;
const token = process.env.REALTIME_API_KEY;
const region = process.env.REALTIME_API_REGION;

if (!host || !token || !region) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const endpoint = `wss://${host}/graphql/realtime`;

const header = Buffer.from(JSON.stringify({ host, Authorization: token })).toString('base64');
const payload = Buffer.from('{}').toString('base64');
const url = `${endpoint}?header=${encodeURIComponent(header)}&payload=${encodeURIComponent(payload)}`;

const ws = new WebSocket(url, 'graphql-ws');

const send = (data: any) => {
  ws.send(JSON.stringify(data));
};

ws.on('open', () => {
  console.log('WebSocket connected');

  send({
    type: 'connection_init',
    payload: {
      authorization: {
        host,
        Authorization: token,
      },
    },
  });
});

ws.on('message', (message) => {
  const parsed = JSON.parse(message.toString());

  switch (parsed.type) {
    case 'connection_ack': {
      console.log('Connection acknowledged');

      const subscriptionId = uuidv4();

      const subscriptionQuery = `
        subscription marketLineUpdate {
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
        }
      `;

      const startPayload = {
        id: subscriptionId,
        type: 'start',
        payload: {
          data: JSON.stringify({ query: subscriptionQuery }),
          extensions: {
            authorization: {
              host,
              Authorization: token,
              'x-amz-user-agent': 'aws-amplify/2.0.8',
            },
          },
        },
      };

      send(startPayload);
      break;
    }
    case 'ka':
      break; // keep-alive

    case 'start_ack':
      console.log('Subscription acknowledged');
      break;

    case 'data':
      const result = parsed.payload?.data?.marketLineUpdate;
      if (result) {
        console.log('Received update:', result);
      } else {
        console.log('Raw data:', parsed);
      }
      break;

    case 'error':
      console.error('Subscription error:', parsed);
      break;

    default:
      console.log('Unhandled message:', parsed);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('WebSocket closed');
});

setInterval(() => {
  console.log('...still listening.');
}, 30000);
