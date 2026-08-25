# Browser Operator Lab

A local-first, approval-first browser agent prototype for LOCAL AI OS.

It combines:

- Playwright 1.62.1 for real Chromium automation;
- a local Ollama model for one-step-at-a-time planning;
- bounded page snapshots instead of unrestricted DOM/runtime access;
- explicit approval before consequential actions;
- an isolated browser context with no reused personal profile;
- a hard step limit and fail-closed unsupported actions.

## Why this exists

Agentic browsers are a major 2026 product category, but a useful local version should not turn an LLM into an unrestricted authenticated browser. This lab keeps the execution surface small enough to inspect and evolve safely.

This is an executable MVP, not a claim of production autonomy.

## Requirements

- Node.js 20+
- Ollama running locally
- an installed Ollama model, for example `qwen3:8b`

Install:

```bash
cd labs/browser-operator
npm install
npx playwright install chromium
```

Run:

```bash
npm start -- "Open the official Playwright docs and find the Chromium install command"
```

Alternative model:

```bash
npm start -- --model qwen3:14b "Compare the public pricing pages for two products"
```

Headless mode:

```bash
npm start -- --headless "Find the current title of example.com"
```

## Approval boundary

The operator automatically executes ordinary low-risk browsing such as navigation, search input, ordinary links and waiting.

It asks for one-time approval before interactions that look like:

- login/sign-in;
- send/submit/publish/post;
- buy/order/pay/checkout;
- delete/remove;
- book/reserve/confirm;
- password, payment-card, account-number, passport, token, secret or API-key fields.

Unsupported navigation schemes such as `file:` and `javascript:` are denied.

The current MVP intentionally does **not** support file uploads, browser-profile reuse, CAPTCHA bypass, permission bypass, arbitrary JavaScript execution, developer-tools execution or silent consequential actions.

## Model contract

The model receives only:

- the user task;
- a short recent action history;
- the current page title and URL;
- up to 12,000 characters of visible page text;
- up to 80 visible interactive elements with temporary IDs.

Page content is explicitly marked as untrusted input in the model policy. The model can return only one of the small action vocabulary:

`goto`, `click`, `fill`, `press`, `wait`, `back`, `done`.

## Verification

```bash
npm install --ignore-scripts
npm run check
```

`npm run check` performs JavaScript syntax checks and Node's built-in policy regression tests. Browser installation is intentionally separate because Playwright browser binaries are platform-specific.

## Next product gates

Before treating Browser Operator as a product capability rather than a lab:

1. run representative task benchmarks against exact local model identities;
2. measure task success, steps, owner approvals and false approvals;
3. add structured trace artifacts and screenshot evidence without leaking private page data;
4. harden prompt-injection resistance with adversarial page fixtures;
5. add domain allow/deny policy and per-task data-handling scope;
6. prove recovery from stale elements, navigation failures and model-invalid actions;
7. only then expose it through a public product surface.
