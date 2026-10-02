(() => {
  'use strict';
  const prompt = 'Build a server-side integration using the current Unabated documentation. Read /llms.txt, the access tiers, and the endpoint contract first. Use an environment variable for my API key. Discover current league, market, sportsbook, and bet type IDs. For Free access, request odds no more than once every five seconds per key across odds endpoints and append my public utm_campaign partner code exactly once to every published Gambly deep link. Handle 401, 403, 429, and temporary unavailability separately. Do not assume SSE or model access. Include a way to test a real link and confirm a tracked click.';
  const sandbox = location.hostname === 'docs-sandbox.unabated.com' || location.hostname === 'unabated-sandbox.apidocumentation.com' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const origin = sandbox ? 'https://data-sandbox.unabated.com' : 'https://data.unabated.com';
  const account = sandbox ? 'https://becoming-tools.unabated.com/api-keys' : 'https://tools.unabated.com/api-keys';
  const samples = {
    curl: `curl --fail-with-body --max-time 20 \\\n  "\${UNABATED_API_BASE_URL:-${origin}}/market/nfl/straight/odds?betTypeId=1" \\\n  -H "X-Api-Key: $UNABATED_API_KEY"`,
    javascript: `// Server-side JavaScript · Node.js 20+\nconst base = process.env.UNABATED_API_BASE_URL || '${origin}';\nconst key = process.env.UNABATED_API_KEY;\nif (!key) throw new Error('Set UNABATED_API_KEY first');\nconst response = await fetch(\n  base + '/market/nfl/straight/odds?betTypeId=1',\n  { headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(20000) }\n);\nif (!response.ok) {\n  throw new Error('HTTP ' + response.status +\n    '; Retry-After: ' + (response.headers.get('Retry-After') || 'none'));\n}\nconst payload = await response.json();\nif (!payload.success) throw new Error('Request was not successful');\nconsole.log(payload.data?.odds ?? {});`,
    python: `# Python 3 · pip install requests\nimport os\nimport requests\n\nbase = os.getenv('UNABATED_API_BASE_URL', '${origin}')\nresponse = requests.get(\n    base + '/market/nfl/straight/odds',\n    params={'betTypeId': 1},\n    headers={'X-Api-Key': os.environ['UNABATED_API_KEY']},\n    timeout=20,\n)\nresponse.raise_for_status()\npayload = response.json()\nif not payload.get('success'):\n    raise RuntimeError('Request was not successful')\nprint((payload.get('data') or {}).get('odds') or {})`
  };
  const notes = {
    free: 'Free odds are delayed by at least 15 seconds. Make one odds request every five seconds per API key, shared across all odds endpoints.',
    concierge: 'Concierge provides real-time odds and entitled streaming for NFL, NBA, MLB, NHL, and WNBA. Additional data features require their own permissions.',
    enterprise: 'Enterprise league, book, and feature access depends on your contract and explicit entitlements. NFL in-game models are never included by default for API users.'
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
    if (setup) setup.textContent = language === 'python' ? 'Install requests with pip install requests, then set UNABATED_API_KEY. Override UNABATED_API_BASE_URL when using a different environment.' : language === 'javascript' ? 'Run this on your server with Node.js 20+ and UNABATED_API_KEY set. Override UNABATED_API_BASE_URL when using a different environment.' : 'Set UNABATED_API_KEY before running the command. The default shown here matches this documentation environment.';
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
          if (button.hasAttribute('data-ua-copy-prompt')) copy(button, 'Read ' + location.origin + '/llms.txt. ' + prompt, root);
        });
        render(root);
      }
    });
    // Keep account links correct after client-side navigation.
    document.querySelectorAll('a[href="https://tools.unabated.com/api-keys"]').forEach(el => { if (sandbox) el.href = account; });
    // Multi-page Scalar Docs does not forward modelsSectionLabel. This is the
    // response schema index, distinct from the entitled NFL model endpoint.
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
