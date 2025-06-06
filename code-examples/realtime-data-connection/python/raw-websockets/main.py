# Raw WebSocket implementation for AWS AppSync with Lambda authorizer in Python
import asyncio
import websockets
import json
import base64
import os
import uuid
from dotenv import load_dotenv

load_dotenv("../../../../.env")

host = os.getenv("REALTIME_API_HOST")
token = os.getenv("REALTIME_API_KEY")
region = os.getenv("REALTIME_API_REGION")

if not host or not token or not region:
    print("Missing required environment variables.")
    exit(1)

endpoint = f"wss://{host}/graphql/realtime"
header = base64.b64encode(json.dumps({"host": host, "Authorization": token}).encode()).decode()
payload = base64.b64encode(b"{}" ).decode()
url = f"{endpoint}?header={header}&payload={payload}"

async def main():
    async with websockets.connect(url, subprotocols=['graphql-ws']) as ws:
        print("WebSocket connected")

        await ws.send(json.dumps({
            "type": "connection_init",
            "payload": {
                "authorization": {
                    "host": host,
                    "Authorization": token
                }
            }
        }))

        subscription_id = str(uuid.uuid4())
        subscription_query = """
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
        """

        start_payload = {
            "id": subscription_id,
            "type": "start",
            "payload": {
                "data": json.dumps({"query": subscription_query}),
                "extensions": {
                    "authorization": {
                        "host": host,
                        "Authorization": token,
                        "x-amz-user-agent": "aws-amplify/2.0.8"
                    }
                }
            }
        }

        while True:
            message = await ws.recv()
            parsed = json.loads(message)

            if parsed["type"] == "connection_ack":
                print("Connection acknowledged")
                await ws.send(json.dumps(start_payload))

            elif parsed["type"] == "start_ack":
                print("Subscription acknowledged")

            elif parsed["type"] == "ka":
                continue

            elif parsed["type"] == "data":
                result = parsed.get("payload", {}).get("data", {}).get("marketLineUpdate")
                if result:
                    print("Received update:", json.dumps(result, indent=2))
                else:
                    print("Raw data:", parsed)

            elif parsed["type"] == "error":
                print("Subscription error:", parsed)

            else:
                print("Unhandled message:", parsed)

try:
    asyncio.get_event_loop().run_until_complete(main())
except KeyboardInterrupt:
    print("Stopped by user")
