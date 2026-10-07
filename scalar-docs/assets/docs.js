(() => {
  'use strict';
  const commonPrompt = 'Read the access tiers and endpoint contracts first. Use https://data.unabated.com and keep my API key in a server-side environment variable. Discover current league, market, sportsbook, and bet type IDs. Handle 401, 403, 429, and temporary unavailability separately. Keep API keys out of client code and logs.';
  const streamingPrompt = 'Create a filtered SSE subscription and open its returned signed streamUrl. Treat signed URLs as private and never log them. Buffer incoming updates while loading the latest REST odds snapshot, then reconcile by stable IDs and ordering fields before applying buffered updates. On disconnect, reconnect with bounded backoff; create a new subscription if the signed URL has expired. Restore current state from a fresh snapshot while buffering stream updates, then resume processing. Bound buffers and timeouts, repair uncertain continuity with REST, and close the stream on shutdown. Do not assume durable replay.';
  const prompts = {
    free: 'Build a server-side Unabated Free API integration. ' + commonPrompt + ' Poll REST odds no more than once every five seconds per API key across all odds endpoints. Append my public utm_campaign partner code exactly once to every published Gambly deep link. Include a way to test a real link and confirm a tracked click. Free API does not include SSE.',
    concierge: 'Build a server-side Unabated Concierge API integration for NFL, NBA, MLB, NHL, or WNBA. ' + commonPrompt + ' ' + streamingPrompt + ' Use the documented Concierge API data coverage. Concierge API does not include GET /deeplink, POST /api/v1/bet/generate, or GET /api/v1/bet/status/{guid}; do not call these operations or require a deep link to collect odds.',
    enterprise: 'Build a server-side Unabated Enterprise API integration. ' + commonPrompt + ' ' + streamingPrompt + ' Check the available tiers on each endpoint and use the leagues, sportsbooks, and additional data features provisioned for our integration.'
  };
  const tierNames = { free: 'Free API', concierge: 'Concierge API', enterprise: 'Enterprise API' };
  const origin = 'https://data.unabated.com';
  const account = 'https://tools.unabated.com/api-keys';
  const samples = {
    curl: `curl --fail-with-body --max-time 20 \\\n  "\${UNABATED_API_BASE_URL:-${origin}}/market/nfl/straight/odds?betTypeId=1" \\\n  -H "X-Api-Key: $UNABATED_API_KEY"`,
    javascript: `// Server-side JavaScript · Node.js 20+\nconst base = process.env.UNABATED_API_BASE_URL || '${origin}';\nconst key = process.env.UNABATED_API_KEY;\nif (!key) throw new Error('Set UNABATED_API_KEY first');\nconst response = await fetch(\n  base + '/market/nfl/straight/odds?betTypeId=1',\n  { headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(20000) }\n);\nif (!response.ok) {\n  throw new Error('HTTP ' + response.status +\n    '; Retry-After: ' + (response.headers.get('Retry-After') || 'none'));\n}\nconst payload = await response.json();\nif (!payload.success) throw new Error('Request was not successful');\nconsole.log(payload.data?.odds ?? {});`,
    python: `# Python 3 · pip install requests\nimport os\nimport requests\n\nbase = os.getenv('UNABATED_API_BASE_URL', '${origin}')\nresponse = requests.get(\n    base + '/market/nfl/straight/odds',\n    params={'betTypeId': 1},\n    headers={'X-Api-Key': os.environ['UNABATED_API_KEY']},\n    timeout=20,\n)\nresponse.raise_for_status()\npayload = response.json()\nif not payload.get('success'):\n    raise RuntimeError('Request was not successful')\nprint((payload.get('data') or {}).get('odds') or {})`
  };
  const notes = {
    free: 'Free odds are delayed by at least 15 seconds. Make one odds request every five seconds per API key, shared across all odds endpoints.',
    concierge: 'Concierge provides real-time odds and live streaming for NFL, NBA, MLB, NHL, and WNBA. Standard deep-link generation and bet-slip generation/status are not included.',
    enterprise: 'Enterprise supports additional data features. Check each endpoint for available tiers.'
  };
  const onboard = {
    free: 'Complete your content partner profile, then generate a key in your account. Already a Concierge subscriber? Your API key management is available in the same place.',
    concierge: 'Generate or manage your Concierge API keys in your account. Concierge access takes precedence while your subscription is active.',
    enterprise: 'Use the provisioned key and scope agreed for your Enterprise integration. Confirm the enabled leagues, books, and features before requesting data.'
  };
  let language = 'curl';
  let tier = 'free';
  function render(root) {
    root.querySelectorAll('[data-ua-language]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.uaLanguage === language)));
    root.querySelectorAll('[data-ua-tier]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.uaTier === tier)));
    root.querySelectorAll('[data-ua-copy-prompt]').forEach(el => el.setAttribute('aria-label', 'Copy a ' + tierNames[tier] + ' starter prompt'));
    const code = root.querySelector('[data-ua-request-code] code');
    if (code) code.textContent = samples[language];
    const note = root.querySelector('[data-ua-tier-note]');
    if (note) note.textContent = notes[tier];
    const onboarding = root.querySelector('[data-ua-onboarding]');
    if (onboarding) onboarding.textContent = onboard[tier];
    const partnerStep = root.querySelector('[data-ua-partner-step]');
    if (partnerStep) partnerStep.hidden = tier !== 'free';
    const streamStepNumber = root.querySelector('.ua-stream-step .ua-step-number');
    if (streamStepNumber) streamStepNumber.textContent = tier === 'free' ? '4' : '3';
    const setup = root.querySelector('[data-ua-setup]');
    if (setup) setup.textContent = language === 'python' ? 'Install requests with pip install requests, then set UNABATED_API_KEY. This example uses https://data.unabated.com.' : language === 'javascript' ? 'Run this on your server with Node.js 20+ and UNABATED_API_KEY set. This example uses https://data.unabated.com.' : 'Set UNABATED_API_KEY before running the command. This example uses https://data.unabated.com.';
    root.querySelectorAll('[data-ua-account-link]').forEach(el => el.href = account);
  }
  async function copy(button, text, root) {
    const status = root.querySelector('[data-ua-copy-status]');
    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = 'Copied to clipboard.';
      button.dataset.originalLabel ||= button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { if (button.isConnected) button.textContent = button.dataset.originalLabel; }, 1800);
    } catch {
      if (status) status.textContent = 'Clipboard access is unavailable. Select the text and copy it manually.';
    }
  }
  function initialize() {
    document.querySelectorAll('[data-ua-quickstart]').forEach(root => {
      if (!root.dataset.uaInitialized) {
        root.dataset.uaInitialized = 'true';
        root.addEventListener('click', event => {
          const button = event.target.closest('button');
          if (!button || !root.contains(button)) return;
          if (button.dataset.uaLanguage) { language = button.dataset.uaLanguage; render(root); }
          if (button.dataset.uaTier) { tier = button.dataset.uaTier; render(root); }
          if (button.hasAttribute('data-ua-copy-code')) copy(button, button.closest('.ua-code').querySelector('pre').textContent, root);
          if (button.hasAttribute('data-ua-copy-prompt')) copy(button, 'Read https://docs.unabated.com/llms.txt. ' + prompts[tier], root);
        });
        render(root);
      }
    });
    // Multi-page Scalar Docs does not forward modelsSectionLabel. This is the
    // response schema index, distinct from the NFL model endpoint.
    if (location.pathname.startsWith('/reference')) {
      document.querySelectorAll('aside.t-doc__sidebar button[aria-expanded] > div').forEach(el => {
        if (el.classList.contains('group/button-label') && el.textContent.trim() === 'Models') {
          el.textContent = 'Schemas';
        }
      });
    }
  }
  initialize();
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
  new MutationObserver(initialize).observe(document.documentElement, { childList: true, subtree: true });
})();
