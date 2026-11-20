# EA Market Hub: Milestone 1 foundation

Supabase-only architecture (Auth + Postgres with RLS). Next.js App Router + TypeScript.

> **Verification status (be honest with yourself)**
> - EXECUTED here: 17 logic checks (webhook signatures + replay window, FX conversion, merchant URL allow-list, file sniffing,
>   commission math/transitions, chatbot rules, Amazon response parser, rate limiter). They found and I fixed one real
>   security bug (URL allow-list accepted `jumia.evil.com`).
> - NOT executed (no packages / no Postgres / no network here): `npm install`, `next build`, vitest, Playwright, **both SQL migrations**,
>   every live API call (Supabase, Amazon, Resend, Anthropic, exchange rates). Expect to fix small errors. Run section 6.

## What is included
**Accounts & security:** Supabase Auth, roles (customer/affiliate/seller/support/admin) changed only by admin-only SQL functions, RLS on every table, append-only audit log, rate limits, security headers.
**Marketplace:** catalog, seller businesses, products with images (Supabase Storage, magic-byte checked), moderation, verification documents (private bucket, signed 5-min links, access audited), consent-based enquiries, in-app notifications + email outbox (Resend).
**Campaigns:** 3-step wizard (objective, targeting, commission %, budget cap, attribution window), activate/pause/end, budget enforcement.
**Affiliate engine:** unique links tied to campaigns, hashed-IP click log, signed partner webhooks (`docs/WEBHOOK.md`), idempotent conversions, attribution-window + budget checks, refunds/chargebacks reverse commissions, admin approval, manual payout workflow with payment reference.
**Currency:** daily USD-based rates (ExchangeRate-API open endpoint, attribution in footer), indicative conversions labelled as such, never guessed when a rate is missing.
**Merchants:** Amazon Creators API client (PA-API 5 is retired); Jumia = curated admin-entered affiliate links (no public catalog API found, no scraping).
**Chatbot:** rules first; optional Anthropic model grounded only in published listings, with daily spend cap, kill switch, token limit, timeout, usage log, AI label, human escalation.
**Support & privacy:** tickets, data export (JSON), deletion requests reviewed by an admin, retained-record rules explained.
**Tests:** `tests/*.test.ts` (vitest), `tests/e2e` (Playwright, public flows), `supabase/rls_negative_tests.sql`, `docs/MANUAL_TEST_PLAN.md`.

## Still genuinely missing / needs you
- **Credentials & approvals:** Amazon Associates (reported: 10 qualifying sales / 30 days for Creators API) and the exact Creators API path/response shapes must be checked against live docs; Jumia affiliate account; Resend sender domain; Anthropic key + current token prices.
- **Not automated:** Amazon conversion import (no webhook found; use Associates reports), real payout rails (mobile money/bank APIs: verify per-country providers first), logged-in e2e tests (manual plan provided), CAPTCHA/bot protection, a shared rate-limit store, DB backups schedule, legal review of policies, SEO landing pages per category/location, a Jumia/Amazon price-refresh job.
- Affiliates join any active campaign without per-campaign approval (the spec's optional approve/reject step is not built).

## 1. Install tools (once)
1. Node.js LTS: https://nodejs.org
2. Visual Studio Code: https://code.visualstudio.com
3. Git (optional): https://git-scm.com

## 2. Open in VS Code
1. Unzip `ea-platform.zip` (right-click, Extract All).
2. VS Code: **File > Open Folder** and choose the `ea-platform` folder.
3. **Terminal > New Terminal** (PowerShell).

## 3. Create the Supabase project
1. https://supabase.com, sign up, **New project** (free tier is fine). Save the database password somewhere private.
2. **SQL Editor > New query**: run `supabase/migrations/0001_schema.sql`, then a NEW query with `supabase/migrations/0002_features.sql`. If either errors, paste me the exact message.
   Then do the 3-step server-key setup at the bottom of 0002 (gives the app a narrow key for webhooks, FX and AI usage).
3. (Development only) run `supabase/seed.sql` for one sample product.
4. **Project Settings > API**: copy the **Project URL** and the **anon public** key.
5. **Authentication > URL Configuration**: Site URL `http://localhost:3000`, add Redirect URL `http://localhost:3000/auth/callback`.
6. Never use or share the `service_role` key. This app does not need it.

## 4. Configure environment
```powershell
Copy-Item .env.example .env.local
```
Open `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit this file (it's in `.gitignore`).

## 5. Run
```powershell
npm install
npm run dev
```
Open http://localhost:3000.

## 6. Verify (do all of these)
```powershell
npm test          # unit tests (vitest)
npx playwright install chromium ; npm run test:e2e   # browser tests
npm run typecheck # TypeScript
npm run build     # production build
npm audit         # dependency vulnerabilities
```
If `npm audit` or Next.js advisories flag the `next` version, run `npm install next@latest` and rebuild.
Then run `supabase/rls_negative_tests.sql` (instructions inside) and **Supabase Dashboard > Advisors > Security Advisor**.

## 7. Make yourself the first admin
Sign up in the app and verify your email, then in Supabase **SQL Editor**:
```sql
update profiles set role = 'admin' where email = 'YOUR_EMAIL_HERE';
```
(The SQL editor runs as a trusted owner, which is the only way to create the first admin.)
Then enable MFA on that Supabase account and use a strong, unique password.

## 8. Try the flows
1. Second account: Dashboard > request **seller**. Admin: /admin > approve.
2. Seller: create business, add product. Admin: verify business, publish product.
3. Product page: send an enquiry (consent box). Seller dashboard shows it.
4. Third account: request **affiliate**, approve, then generate a link for a product that has an `external_url`.

## Daily rate refresh
Admin page has a **Refresh exchange rates** button. For automation, call `POST /api/fx/refresh` with `Authorization: Bearer <CRON_SECRET>` once a day (Vercel Cron or a GitHub Action).

## Project map
```
supabase/migrations/0001_schema.sql   tables, RLS, trusted functions
supabase/seed.sql                     dev-only sample
supabase/rls_negative_tests.sql       manual attack tests
src/middleware.ts                     session refresh
src/lib/auth.ts                       getCurrentUser, requireRole
src/lib/commission.ts                 money math + allowed transitions
src/lib/chatbot.ts                    rules-based answers
src/lib/providers/                    Amazon/Jumia adapters (setup-required)
src/lib/legal.ts                      draft policy text (needs legal review)
src/app/                              pages, server actions, route handlers
tests/                                vitest unit tests
```

## Known limitations / production notes
- `src/lib/rateLimit.ts` is in-memory: use a shared store (e.g. Upstash Redis) before deploying to serverless.
- Add Cloudflare Turnstile or similar to sign-up and lead forms before launch.
- CSP uses `'unsafe-inline'` for scripts/styles (Next.js default). Tighten with nonces later.
- Policies are templates. Have a lawyer review them for each country.
- Do not claim an Amazon/Jumia partnership until verified.
- Back up: Supabase Dashboard > Database > Backups (paid plans) or `pg_dump` with your connection string.
- Deploy: Vercel, set the same env vars, update Supabase Site URL/redirect URLs to your domain.
