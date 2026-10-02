<div class="ua-quickstart" data-ua-quickstart>
<div class="ua-eyebrow">Start building <span>›</span> Quickstart</div>
<h1>Your first odds request.<br>Your first tracked deep link.</h1>
<p class="ua-intro">Build with Unabated market data in a few clear steps. For developers, content partners, and the agents helping them.</p>

<div class="ua-agent">
<span class="ua-icon" aria-hidden="true">✦</span>
<div><h3>Agents welcome.</h3><p>Read the tier rules and start with a runnable example. These same guides are available in Markdown, alongside a machine-readable OpenAPI contract.</p><div class="ua-inline-links"><button type="button" class="ua-textlink" data-ua-copy-prompt>Copy a starter prompt <span aria-hidden="true">▢</span></button><a href="/llms.txt">Markdown index ↗</a><a href="/start/agents">Build with an agent →</a></div></div>
</div>

<div class="ua-tierbar" aria-label="Access tier guidance"><span>Show guidance for</span><button type="button" data-ua-tier="free" aria-pressed="true">Free API</button><button type="button" data-ua-tier="concierge" aria-pressed="false">Concierge API</button><button type="button" data-ua-tier="enterprise" aria-pressed="false">Enterprise API</button></div>

<div class="ua-step"><span class="ua-step-number" aria-hidden="true">1</span><div><h2>Get your API key</h2><p data-ua-onboarding>Complete your content partner profile, then generate a key in your account. Already a Concierge subscriber? Your API key management is available in the same place.</p><a class="ua-textlink" href="https://tools.unabated.com/api-keys" data-ua-account-link>Open API key management ↗</a><p class="ua-small">Keep the key on your application's server. Set <code>UNABATED_API_KEY</code> in your environment; never put it in a public page or repository.</p></div></div>

<div class="ua-step"><span class="ua-step-number" aria-hidden="true">2</span><div><h2>Request an odds snapshot</h2><p>This example requests NFL moneyline odds. <a href="/guides/discovery">Discover current leagues and bet types</a> to request another market. Read the returned snapshot from <code>data.odds</code>.</p>
<div class="ua-code"><div class="ua-code-top"><div class="ua-tabs" aria-label="Request language"><button type="button" data-ua-language="curl" aria-pressed="true">cURL</button><button type="button" data-ua-language="javascript" aria-pressed="false">JavaScript</button><button type="button" data-ua-language="python" aria-pressed="false">Python</button></div><button type="button" class="ua-copy" data-ua-copy-code>Copy</button></div><pre data-ua-request-code aria-live="polite"><code>curl --fail-with-body --max-time 20 \
  "${UNABATED_API_BASE_URL:-https://data.unabated.com}/market/nfl/straight/odds?betTypeId=1" \
  -H "X-Api-Key: $UNABATED_API_KEY"</code></pre></div>
<p class="ua-small" data-ua-setup>Set your key before running the command. Use the sandbox base URL when testing a sandbox key.</p>
<div class="ua-note"><span class="ua-icon" aria-hidden="true">◷</span><p data-ua-tier-note aria-live="polite">Free odds are delayed by at least 15 seconds. Make one odds request every five seconds per API key, shared across all odds endpoints.</p></div>
<details class="ua-response"><summary>What a successful response looks like</summary><pre><code>{
  "success": true,
  "data": {
    "odds": { "…": "league, event, market, and selection data" },
    "lastUpdated": "…"
  },
  "messages": []
}</code></pre><p>This is an abbreviated shape, not a fixture to copy into your integration. Follow the <a href="/guides/response-concepts">response hierarchy</a> to reach available selections. Lines depend on the sport, book, market, and your access scope.</p></details>
</div></div>

<div class="ua-step" data-ua-partner-step><span class="ua-step-number" aria-hidden="true">3</span><div><h2>Publish a link with your partner code</h2><p>Choose a real Gambly deep link from the response and add the tracking suffix shown on your API keys page before publishing it.</p><div class="ua-code"><div class="ua-code-top"><span>JavaScript · attach attribution once</span><button type="button" class="ua-copy" data-ua-copy-code>Copy</button></div><pre><code>const url = new URL(deepLink);
url.searchParams.set("utm_campaign", partnerCode);
const publishedLink = url.toString();</code></pre></div><div class="ua-note ua-warn"><span class="ua-icon" aria-hidden="true">⚠</span><p><strong>Free partners: add your tracking code.</strong> Untagged clicks do not count toward your traffic. Test the link from your site or platform, then confirm the lifetime count and last-click time in your account.</p></div><a class="ua-textlink" href="/guides/deep-links">See the complete deep-link workflow →</a></div></div>

<div class="ua-step ua-stream-step"><span class="ua-step-number" aria-hidden="true">4</span><div><h2>Add live updates when your key is entitled</h2><p>Concierge and Enterprise integrations can create a filtered subscription, then open its signed SSE URL. Free API access uses REST polling. Feature and league entitlements still apply.</p><a class="ua-textlink" href="/guides/streaming/lifecycle">Read the streaming lifecycle guide →</a></div></div>

<div class="ua-next"><span>Next: understand the odds response</span><a href="/guides/odds">Explore odds and markets →</a></div>
<p class="ua-small">Selecting a tier above changes the guidance shown here. It does not change your account permissions. <a href="/start/access-tiers">Compare access tiers</a>.</p>
<div class="ua-copy-status" role="status" aria-live="polite" data-ua-copy-status></div>
</div>
