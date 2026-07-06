# PRD: [Project Name]

## 1. Interaction Logic & Workflow
- **Diagnostic Inquiry**: Identify missing building blocks (Logic, UI, Monetization). Ask **max 2-3** core questions per turn.
- **Confidence Score**: Evaluate understanding (0-100%). If < 80%, continue questioning with a progress marker: `[Currently: XX% - Gathering Info]`.
- **Convergence Strategy**: Once confidence >= 80%, STOP questioning and output the full PRD immediately.
- **Glue Code Priority**: Default to Supabase and Stripe.

---

## 2. [STRICT] Edge-First Architecture & Code Snippets
### 2.1 Framework, Runtime & Security Lock
- **Framework**: MUST use Next.js (App Router), scaffolded via `create-next-app` to guarantee `.gitignore` auto-includes the `.env*` exclusion rule.
- **Environment Variables [CRITICAL]**: ALL env vars (including API Keys like Stripe, Supabase, Turnstile) MUST be written strictly into `.env.local`. NEVER create or suggest using a bare `.env` file to prevent accidental commits of sensitive data.
- **Runtime**: Every API Route / Server Action MUST declare `export const runtime = 'edge'`.
- **Deployment**: Cloudflare Pages.
- **Forbidden Node.js Modules**: fs, path, crypto, buffer, process, stream, os. MUST use Edge-compatible alternatives (e.g., `jose` for Auth, `Stripe.createFetchHttpClient()`).

### 2.2 Required Edge-Compatible Implementations (Stripe & Turnstile)
```ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-12-18.acacia',
});

// Cloudflare Turnstile Verification
async function verifyTurnstile(token: string, ip: string) {
  const formData = new FormData();
  formData.append('secret', process.env.TURNSTILE_SECRET_KEY!);
  formData.append('response', token);
  formData.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: formData
  });
  return (await res.json()).success;
}
```

---

## 2.3 [MANDATORY] API Security Baseline (ALL routes, no exceptions)

A route existing without these two checks is a spec violation, not something to fill in later.

1. **Auth check on every non-public route**: EVERY API Route / Server Action that touches user data, calls a paid upstream API (LLM, transcription, etc.), or performs a state-changing action MUST start with a Supabase `auth.getUser()` check and return `401 Unauthorized` immediately if there is no user. Explicitly list which routes are intentionally public — anything not on that list defaults to auth-required.

```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

2. **Rate limiting on every Cost-Heavy route**: EVERY route that calls a paid/metered upstream (LLM completion, transcription, image generation, email/SMS send) MUST be rate-limited independently of the auth check — auth answers "who," rate limiting answers "how fast," and an authenticated user's account can still be scripted/abused. Implement via Cloudflare Rate Limiting Rules (edge, per-IP) and/or a per-user counter (e.g. Upstash Ratelimit or a Supabase-backed sliding window) keyed by `user.id`.

3. **Turnstile scope**: if Turnstile is used at all, it must cover every Cost-Heavy Public Entry (any route reachable without login that triggers paid upstream calls) — not just the login/signup form.

4. **Verification checklist requirement**: the final deliverable MUST include a per-route table — "Auth check (Y/N)" and "Rate limited (Y/N)" — for every API route. Any Cost-Heavy route marked N on either column is a checklist failure.
