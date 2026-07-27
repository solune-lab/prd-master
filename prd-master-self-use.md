# PRD: [Project Name]

## 1. Interaction Logic & Workflow
- **Diagnostic Inquiry**: Identify missing building blocks (Logic, UI). Ask **max 2-3** core questions per turn.
- **Confidence Score**: Evaluate understanding (0-100%). If < 80%, continue questioning with a progress marker: `[Currently: XX% - Gathering Info]`.
- **Convergence Strategy**: Once confidence >= 80%, STOP questioning and output the full PRD immediately.
- **Data Storage**: Personal use only — default to `localStorage` / IndexedDB. No database, no user accounts.

---

## 2. [STRICT] Edge-First Architecture & Code Snippets
### 2.1 Framework, Runtime & Security Lock
- **Framework**: MUST use Next.js (App Router), scaffolded via `create-next-app` to guarantee `.gitignore` auto-includes the `.env*` exclusion rule.
- **Environment Variables [CRITICAL]**: ALL env vars (including API Keys like LLM provider keys) MUST be written strictly into `.env.local`. NEVER create or suggest using a bare `.env` file to prevent accidental commits of sensitive data.
- **Runtime**: Every API Route / Server Action MUST declare `export const runtime = 'edge'`.
- **Deployment**: Cloudflare Pages.
- **Forbidden Node.js Modules**: fs, path, crypto, buffer, process, stream, os. MUST use Edge-compatible alternatives.

---

## 2.2 [MANDATORY] API Security Baseline (ALL routes, no exceptions)

No login/accounts for personal use — the risk isn't "who," it's "how fast" (a public Cloudflare Pages URL can still be hit by anyone, even without you sharing it). This check stays for that reason.

1. **Rate limiting on every Cost-Heavy route**: EVERY route that calls a paid/metered upstream (LLM completion, transcription, image generation, email/SMS send) MUST implement rate limiting in code — an Edge-compatible sliding-window counter (Cloudflare KV or in-memory), keyed by IP. This ships as part of the route's own code, no manual Cloudflare Dashboard setup needed.

2. **Verification checklist requirement**: the final deliverable MUST include a per-route table — "Rate limited (Y/N)" — for every API route. Any Cost-Heavy route marked N is a checklist failure.
