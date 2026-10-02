# Choose your API access

Build with REST odds, sportsbook deep links, and generated bet slips. Add live streaming or contracted datasets when your project needs them. These guides serve humans and agents alike; each endpoint identifies its available tiers and any additional entitlement.

| Capability | Free API | Concierge API | Enterprise API |
| --- | --- | --- | --- |
| REST odds | Included, delayed by at least 15 seconds | Live data | As contracted |
| Sports | Supported sports with available included-book data | NFL, NBA, MLB, NHL, WNBA | As contracted |
| Sportsbooks | Included provider set | All books within the five supported leagues | As contracted |
| Odds polling | One request every five seconds per key, shared across odds endpoints | Subject to your access policy | Subject to your access policy |
| Standard deep links | Included | With the deep-link feature entitlement | With the deep-link feature entitlement |
| Bet-slip generation and status | Included | With the bet-slip feature entitlement | With the bet-slip feature entitlement |
| Server-Sent Events (SSE) | Not included | Included for entitled events and data | With entitlement |
| NBA news, projections, additional datasets | Not included | Requires the relevant feature entitlement | Requires the relevant feature entitlement |
| NFL in-game output model | Not included | Not included by default | Requires explicit model entitlement |

Tier availability describes the product scope. A key must also have the endpoint's feature permission, and results remain within its league and sportsbook scope. An empty board can mean there are no available offers within that scope; a discovery result does not promise that every book offers every market.

## Free API: become a content partner

Start at [Free API signup](https://tools.unabated.com/free-api). Sign in or create an Unabated account, enter your partner name and unique partner code, and tell us at least one place where you plan to share sportsbook links. Then agree to the content partner terms and generate a key.

<scalar-callout type="warning">
Free access is provided to drive sportsbook traffic through Gambly deep links. Add your partner code to every generic deep link you publish, and test the links from your own site or platform. Untagged clicks cannot be credited to you. Access may be revoked at Unabated/Gambly's discretion when the partner conditions are not met.
</scalar-callout>

The included providers are DraftKings, FanDuel, MGM, Caesars, theScoreBet, PrizePicks, DraftKings Pick6, Fanatics, Novig, Underdog, ProphetX, Kalshi, Underdog Prediction Markets, and Polymarket. Use the [market source discovery endpoint](/guides/discovery) to find the IDs and current availability for the league and market you need.

Free odds have a minimum delay of 15 seconds. Snapshot publication, transport, and unchanged markets can make a response older; this is not a promise that every line is exactly 15 seconds old. Polling faster does not make the data fresher.

## Concierge API: live professional sports

Manage keys at [Manage API Keys](https://tools.unabated.com/api-keys). Concierge API access covers NFL, NBA, MLB, NHL, and WNBA, including all books within that scope and live streaming for entitled event families.

Concierge takes precedence while active. If you started as a Free content partner and later upgrade, your partner information remains; your effective API scope follows Concierge. If Concierge ends, an existing Free enrollment can provide Free access again.

## Enterprise API: match the data to your integration

Enterprise access is provisioned according to your agreement. Leagues, books, streams, and additional features are explicitly entitled. The NFL in-game output model requires its own entitlement; an API key does not receive it merely because it can stream ordinary odds.

Contact your Unabated representative to confirm the required datasets and permissions before building against an additional feature.

## Next steps

- [Make your first request](/start/quickstart).
- [Keep your key secure](/start/authentication).
- [Publish and test a tracked link](/guides/deep-links).
- [Connect an entitled live stream](/guides/streaming/lifecycle).
