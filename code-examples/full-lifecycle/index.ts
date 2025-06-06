import WebSocket from "ws";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";
import { set } from "lodash";

dotenv.config({ path: "../../.env" });

const realtimeHost = process.env.REALTIME_API_HOST;
const apiKey = process.env.REALTIME_API_KEY;
const region = process.env.REALTIME_API_REGION;
const dataApiUrl = process.env.DATA_API_URL;

if (!realtimeHost || !apiKey || !region || !dataApiUrl) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const realtimeApiUrl = `https://${realtimeHost}/graphql`;
const websocketEndpoint = `wss://${realtimeHost}/graphql/realtime`;

let snapshotData: Record<string, any> = {};
let lastUpdated: number = 0;

const handleMarketLineUpdates = (marketLines: any[] = []) => {
  for (const line of marketLines) {
    set(snapshotData, line.marketLineKey, line);
  }
};

// Starts GraphQL WebSocket connection
const startWebSocket = (onUpdate: (lines: any[]) => void) => {
  const header = Buffer.from(JSON.stringify({
    host: realtimeHost,
    Authorization: apiKey,
  })).toString("base64");

  const ws = new WebSocket(
    `${websocketEndpoint}?header=${encodeURIComponent(header)}&payload=${encodeURIComponent(Buffer.from("{}").toString("base64"))}`,
    "graphql-ws"
  );

  ws.on("open", () => {
    console.log("WebSocket connected");
    ws.send(JSON.stringify({
      type: "connection_init",
      payload: {
        authorization: {
          host: realtimeHost,
          Authorization: apiKey,
        },
      },
    }));
  });

  ws.on("message", async (raw) => {
    const message = JSON.parse(raw.toString());

    switch (message.type) {
      case "connection_ack":
        console.log("Connection acknowledged");

        const subscriptionId = uuidv4();
        const subscriptionQuery = `
          subscription marketLineUpdate {
            marketLineUpdate(leagueIds: [3]) {
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

        ws.send(JSON.stringify({
          id: subscriptionId,
          type: "start",
          payload: {
            data: JSON.stringify({ query: subscriptionQuery }),
            extensions: {
              authorization: {
                host: realtimeHost,
                Authorization: apiKey,
                "x-amz-user-agent": "aws-amplify/2.0.8",
              },
            },
          },
        }));

        // Fill the gap after the subscription starts
        await fillGap(lastUpdated);
        break;

      case "start_ack":
        console.log("Subscription acknowledged");
        break;

      case "ka":
        break; // keep-alive

      case "data":
        const update = message.payload?.data?.marketLineUpdate;
        if (update?.marketLines) {
          onUpdate(update.marketLines);
        }
        break;

      case "error":
        console.error("WebSocket error:", message);
        break;

      default:
        console.log("Unhandled WebSocket message:", message);
    }
  });

  ws.on("error", (err) => console.error("WebSocket error:", err));
  ws.on("close", () => console.log("WebSocket closed"));
};

// Fill the gap with a GraphQL POST request using the lastUpdated timestamp
const fillGap = async (since: number) => {
  console.log(`Filling gap with updates since ${since}...`);

  const query = `
    query MarketLineUpdates {
      marketLineUpdates(leagueIds: [3], since: ${since}) {
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

  const res = await fetch(realtimeApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query }),
  });

  const body = await res.json();
  const updates = body?.data?.marketLineUpdates ?? [];

  for (const update of updates) {
    handleMarketLineUpdates(update.marketLines ?? []);
  }

  console.log(`Gap fill complete (${updates.length} updates applied).`);
};

// Entry point
const run = async () => {
  console.log("Fetching initial snapshot...");

  const res = await fetch(`${dataApiUrl}/market/nba/props/odds`, {
    headers: { "x-api-key": apiKey },
  });

  const body = await res.json();
  snapshotData = body?.data?.odds ?? {};
  lastUpdated = body?.data?.lastUpdated ?? Date.now();

  console.log(`Snapshot complete. Last updated at: ${lastUpdated}`);

  // Start socket and begin processing updates
  startWebSocket(handleMarketLineUpdates);

  // Keep process alive
  setInterval(() => console.log("...still listening"), 30_000);
};

run();
