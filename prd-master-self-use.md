# PRD: [Project Name]

## 1. Interaction Logic & Workflow
- **Diagnostic Inquiry**: Identify missing building blocks (Logic, UI). Ask **max 2-3** core questions per turn.
- **Confidence Score**: Evaluate understanding (0-100%). If < 80%, continue questioning with a progress marker: `[Currently: XX% - Gathering Info]`.
- **Convergence Strategy**: Once confidence >= 80%, STOP questioning and output the full PRD immediately.
- **Data Storage**: Personal use only — default to `localStorage` / IndexedDB. No database, no user accounts.
- **Import/Export**: Tool MUST ship with built-in JSON export (download all local data as a single `.json` file) and JSON import (restore/merge from a previously exported file) — this is the only backup/migration path since there is no backend database.

---

## 2. [STRICT] Edge-First Architecture & Code Snippets
### 2.1 Framework, Runtime & Security Lock
- **Framework**: MUST use Next.js (App Router), scaffolded via `create-next-app` to guarantee `.gitignore` auto-includes the `.env*` exclusion rule.
- **Environment Variables [CRITICAL]**: ALL env vars (including API Keys like LLM provider keys) MUST be written strictly into `.env.local`. NEVER create or suggest using a bare `.env` file to prevent accidental commits of sensitive data.
- **`NEXT_PUBLIC_` Prefix — FORBIDDEN [CRITICAL]**: any var prefixed `NEXT_PUBLIC_` is inlined into the client bundle and becomes publicly readable by anyone who opens the deployed page. A personal tool has no backend services requiring a public key, so there is NO legitimate use of this prefix here — treat it as banned outright. Every API key MUST be unprefixed and read ONLY inside an API Route (`export const runtime = 'edge'`), never in a Client Component. If a Client Component appears to need the key, the fix is to move that upstream call into an API Route and have the component call your own route — never to add the prefix.
- **Deploy-Time Env Injection [CRITICAL]**: `.env.local` is git-ignored and is therefore NEVER uploaded to Cloudflare — it exists for local development only. Every var the tool needs at runtime MUST also be entered into the Cloudflare Pages project's own Environment Variables settings, or the deployed tool will read `undefined` for every key and every API route will fail at runtime while local development still passes. The PRD MUST list the required env var names so this step can be completed.
- **Runtime**: Every API Route / Server Action MUST declare `export const runtime = 'edge'`.
- **Deployment**: Cloudflare Pages, via the `@cloudflare/next-on-pages` adapter. A plain `next build` does NOT deploy to Pages — the adapter is mandatory, not optional:
  - `package.json` devDependencies MUST include `@cloudflare/next-on-pages` and `wrangler`.
  - `package.json` scripts MUST include `"pages:build": "npx @cloudflare/next-on-pages"`.
  - Pages project settings MUST be: build command `npx @cloudflare/next-on-pages`, build output directory `.vercel/output/static`, compatibility flags `["nodejs_compat"]`, and an explicit `compatibility_date`.
- **Forbidden Node.js Modules**: fs, path, crypto, buffer, process, stream, os. MUST use Edge-compatible alternatives.

---

## 2.2 [MANDATORY] API Security Baseline (ALL routes, no exceptions)

No login/accounts for personal use — the risk isn't "who," it's "how fast" (a public Cloudflare Pages URL can still be hit by anyone, even without you sharing it). This check stays for that reason.

1. **Rate limiting on every Cost-Heavy route**: EVERY route that calls a paid/metered upstream (LLM completion, transcription, image generation, email/SMS send) MUST implement rate limiting in code — an Edge-compatible sliding-window counter backed by **Cloudflare KV** (or Durable Objects), keyed by IP. This ships as part of the route's own code, no manual Cloudflare Dashboard setup needed.

   **In-memory counters do NOT count as rate limiting on Cloudflare.** Each request may run in a fresh, isolated Worker instance and instances are evicted at any time, so an in-process `Map`/variable counter resets constantly and blocks nobody — it produces the appearance of protection with none of the effect, which is worse than shipping without it. In-memory is acceptable ONLY as a local-development stub, and only if the PRD says so explicitly and still specifies the KV implementation for production.

2. **Verification checklist requirement**: the final deliverable MUST include a per-route table — "Rate limited (Y/N)" — for every API route. Any Cost-Heavy route marked N is a checklist failure.

---

## 3. FINAL SELF-CHECK (run this silently before emitting a single character — do not skip)

Verify each item below is actually present in the PRD you are about to output. If any item is missing, add it now before responding:

1. Does every API Route code block include `export const runtime = 'edge';`?
2. Does §2.1 specify `@cloudflare/next-on-pages` as the Pages adapter, including the build command, the `.vercel/output/static` output directory, and the `nodejs_compat` compatibility flag?
3. Is every API key unprefixed and read only inside an API Route, with zero `NEXT_PUBLIC_` secrets anywhere?
4. Does the PRD list every required env var name AND state that they must be re-entered in the Cloudflare Pages project settings, because `.env.local` is never deployed?
5. Is every Cost-Heavy route rate-limited via Cloudflare KV (never an in-memory counter), and does §2.2's per-route table cover every route?
6. Does the tool ship the mandatory JSON export AND JSON import, given there is no backend database to fall back on?

Missing any of the above is a spec violation — fix it before output, not after.
