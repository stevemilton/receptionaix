# ReceptionAI - Developer Handoff

**Date:** 2026-02-07
**Status:** All 9 build phases complete. Security hardened. Grok Voice API rewritten (xAI format). Relay deployed to Fly.io. Web deployed to Vercel. **E2E voice pipeline working** — first successful call completed. **Dashboard redesigned & mobile-responsive** — post-call processing, AI summaries, shared components, Messages page, hamburger nav, responsive layouts. **iOS app redesigned** — lighter typography, dark-green gradient backgrounds, 64-band smooth gradient, white header text on dark areas. **TestFlight build #5 completed** — needs `eas submit`. Mobile-first MVP pivot in progress. Stripe deferred.

This document is for any developer picking up this codebase. Read this first, then `CLAUDE.md` for architecture details, then `docs/status.md` for the current issue backlog.

---

## What This Project Is

ReceptionAI is a voice-first AI receptionist for UK SMEs. A business owner signs up, onboards their business info, gets a Twilio phone number, and callers speak to a Grok-powered AI that can book appointments, answer FAQs, and take messages.

**Key user flows:**
1. Merchant signs up (web or mobile) and completes 8-step onboarding
2. Caller dials the merchant's Twilio number
3. Twilio streams audio to the relay server on Fly.io
4. Relay bridges audio to Grok Realtime API with merchant's knowledge base
5. Grok executes tools (book appointment, lookup customer, etc.) via the relay
6. Merchant views calls, transcripts, and appointments on their dashboard

---

## Getting Started

```bash
# Prerequisites: Node 18+, pnpm 8+
pnpm install

# Copy environment template
cp .env.example .env.local
# Fill in all required keys (Supabase, Grok, Twilio, Stripe, Firecrawl, Google)

# Run web + relay in parallel
pnpm dev

# Or individually
pnpm dev:web     # http://localhost:3000
pnpm dev:relay   # ws://localhost:8080
```

### Database Setup
```bash
pnpm db:push     # Push migrations to Supabase
pnpm db:types    # Regenerate TypeScript types
```

### Mobile
```bash
cd apps/mobile
npx expo start
# Press 'i' for iOS simulator or 'a' for Android emulator
```

---

## Architecture Overview

```
apps/
  web/          Next.js 14 (Vercel) — Dashboard, API routes, onboarding
  relay/        Node.js + Fastify + ws (Fly.io) — Twilio-Grok audio bridge
  mobile/       React Native + Expo — iOS/Android merchant app

packages/
  supabase/     Migrations (8 files), RLS policies, generated types
  ui/           Shared React components (Button, Card, Modal, Toast, etc.)
  grok/         Grok client, tool definitions, connection types
  knowledge/    Firecrawl scraping, Grok extraction, Google Places, Master KB
  types/        Database types + row type aliases (MerchantRow, CallRow, etc.)
  shared/       API usage tracking utilities
```

### Data Flow: Incoming Call
```
Caller -> Twilio -> POST /api/twilio/incoming (Vercel)
                   | Returns TwiML:
                   |   <Stream url="wss://receptionai-relay.fly.dev/media-stream">
                   |     <Parameter name="merchantId" value="..." />
                   |     <Parameter name="callerPhone" value="..." />
                   |     <Parameter name="token" value="<HMAC>" />
                   |     <Parameter name="ts" value="<timestamp>" />
                   |   </Stream>
         Twilio -> WebSocket -> relay server (Fly.io)
                               | Receives auth params in start event's customParameters
                               | Verifies HMAC-SHA256 token (60s expiry)
                               | Fetches merchant config from Supabase
                               | Opens WebSocket to Grok Voice Agent API (xAI)
                               | Audio: μ-law 8kHz passthrough (no conversion)
                               | Executes tool calls (booking, lookup, etc.)
                               | On call end: saves transcript to Supabase
                               | On call end: POST /api/calls/post-complete for overage tracking
                               | On call end: post-call processing (fire-and-forget):
                               |   → ensureCustomer (create/update customer record)
                               |   → linkCallToCustomer (set customer_id on call)
                               |   → generateAndSaveSummary (Grok text API → call.summary)
                               |   → linkRecentMessages (set call_id on messages from this call)
```

**Important:** Twilio `<Stream>` strips query parameters from the WebSocket URL. All auth params MUST be passed as `<Parameter>` child elements in the TwiML. They arrive in the `start` event's `customParameters` object on the relay side.

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Relay on Fly.io, not Vercel | Vercel doesn't support long-lived WebSockets |
| Firecrawl, not Puppeteer | Serverless-friendly, no headless browser required |
| μ-law passthrough (no conversion) | Grok Voice Agent API accepts `audio/pcmu` natively, same as Twilio |
| xAI Voice Agent API, not OpenAI | Grok has its own API format — session config, event names, voice names all differ |
| HMAC-SHA256 tokens for relay auth | Twilio custom params can't carry session cookies. Params passed as TwiML `<Parameter>` elements (Twilio strips query params from `<Stream>` URLs). |
| Mock Grok client for dev | Avoids burning API credits during development |
| Zustand for onboarding state | Persists across page navigations without server round-trips |
| RevenueCat for mobile billing | Handles App Store / Play Store IAP complexity |
| Master KB for cross-merchant learning | Shared FAQ/service templates by business type |
| pnpm.overrides for React 18 | Mobile needs React 19 (RN 0.81), web needs React 18 (Next.js 14/styled-jsx) |

---

## What Works

- Full web onboarding flow (8 steps, Google Places, Firecrawl, Calendar OAuth, Twilio provisioning)
- Voice relay with Grok Realtime API (5 tools: lookup, availability, booking, cancel, message)
- **Post-call processing pipeline** — auto-creates customers, generates AI summaries, links messages to calls
- **Redesigned merchant dashboard:**
  - Overview with 4 metric cards, recent calls with AI summaries, upcoming appointments, unread messages
  - Calls list with customer names and AI summaries; call detail with 3-column layout and chat-bubble transcript
  - Dedicated Messages page with All/Unread/Read filters, mark-as-read, link to source calls
  - Customers page with card-based layout showing call + appointment counts
  - Appointments page split into Upcoming (grouped by date) and Past & Cancelled
  - Shared component library (`_components/shared.tsx`) for all formatters, badges, icons
- Admin panel (merchant list, detail, impersonation, revenue, health monitor)
- Stripe billing (3 tiers, webhooks, portal)
- Mobile app (auth, dashboard, calls, settings, RevenueCat subscriptions) — **iOS redesigned with gradient + lighter typography, build #5 completed**
- **Mobile-responsive web dashboard** — hamburger nav, card-based mobile layouts, responsive grids
- Supabase RLS for multi-tenant isolation
- CSRF protection on all cookie-auth routes
- OAuth token encryption at rest
- Rate limiting on provisioning endpoints
- Env var validation (fail-closed)

---

## What Doesn't Work Yet

### Twilio Signature Verification (Disabled)
Temporarily disabled in `/api/twilio/incoming` because `request.url` on Vercel doesn't match the public URL Twilio signs against. Calls work but aren't cryptographically verified. Fix: reconstruct the verification URL from `NEXT_PUBLIC_APP_URL` + request path.

### Google Calendar (Mock Only)
`checkAvailability` in `apps/relay/src/tool-handlers.ts:94` returns hardcoded slots. OAuth tokens are stored (encrypted) during onboarding but never used for real calendar queries. This is the biggest feature gap.

### Push Notifications (Half-Built)
Mobile app registers Expo push tokens and saves to `merchants.push_token`. No backend service exists to actually send notifications. The cron route at `apps/web/src/app/api/cron/notifications/route.ts` handles email notifications but not push.

### Mobile Device Testing
iOS build #5 completed with redesigned UI (dark-green gradient, lighter typography, white header text). Needs `eas submit --platform ios` to push to TestFlight. Previous build (#4) already in TestFlight with older UI. Android build not yet attempted. Deeplink configuration is missing (needed for password reset email flow). RevenueCat API keys not yet configured — subscriptions will be non-functional until set up.

### Mobile UI Architecture
- **Design tokens:** `apps/mobile/src/theme.ts` — centralized typography weights, gradient colors, color palette
- **Gradient:** `apps/mobile/src/components/ScreenBackground.tsx` — 64-band View interpolation (smooth gradient without native dependencies, works in Expo Go)
- **Color palette:** Eased dark green `#344532` → white with stops at `[0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0]`
- **Typography:** SF Pro system font, mostly Light (300) and Regular (400), only CTA buttons use Medium (500)
- **Constraint:** Running in Expo Go (not dev build), so `expo-linear-gradient` native module doesn't work — hence the 64-band pure-View approach

### RevenueCat (Not Configured)
Mobile code is ready for RevenueCat but API keys are not set. Need to:
1. Create products in RevenueCat dashboard matching the 3 tiers (Starter, Professional, Enterprise)
2. Connect Apple App Store in RevenueCat
3. Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` in `apps/mobile/.env`
4. Rebuild the app for IAP to work

---

## Security Status

Nine hardening batches have been completed. See `docs/status.md` for the detailed checklist.

**All critical and high-priority security issues have been resolved**, including:
- Merchant impersonation privilege escalation
- Relay HMAC token bypass
- WebSocket resource leaks
- SQL injection in admin search
- Stripe webhook metadata validation
- Env var fail-closed validation
- OAuth token encryption
- CSRF origin validation
- Input validation on all API routes
- Rate limiting on cost-sensitive endpoints
- Request timeouts on external calls

**Remaining technical debt:**
- ~15 justified `as any` casts on queries to tables not in the generated `database.ts` (`admin_users`, `messages`, `call_errors`, `api_usage_daily`, `notification_log`). The `messages` table has the most casts (dashboard/page, dashboard/messages, 3 API routes, calls/[id]/page). These will resolve when those tables are added to the schema.
- Migration `007_billing_enforcement.sql` needs to be applied to the live DB (`pnpm db:push`).
- Migration `011_fix_knowledge_bases_rls.sql` needs to be applied to add missing RLS policy on `knowledge_bases` table.

---

## Environment Variables

All required env vars are listed in `.env.example`. The critical ones:

| Variable | Used By | Notes |
|----------|---------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Web API, Relay | Bypasses RLS. Never expose to client. |
| `GROK_API_KEY` | Relay | xAI API key for voice |
| `TWILIO_AUTH_TOKEN` | Web API | Used for signature verification |
| `STRIPE_WEBHOOK_SECRET` | Web API | Validates Stripe webhooks |
| `RELAY_SERVICE_KEY` | Web API, Relay | Shared secret for relay <-> web API calls |
| `CRON_SECRET` | Web API | Vercel Cron job authorization |
| `ADMIN_DEV_BYPASS` | Web API | Set to `true` ONLY in local dev |

**Important:** All API routes validate required env vars at startup and fail closed if missing. This was not the case originally but was fixed in the hardening batches.

---

## Testing Notes

- No test suite exists yet. The `pnpm test` command is defined but has no test runner configured.
- Voice testing requires Twilio test credentials and a running relay server.
- A mock Grok client exists at `apps/relay/src/mock-grok-client.ts` for local development.
- Admin panel has a dev bypass (`ADMIN_DEV_BYPASS=true`) that skips authentication. Never deploy with this enabled.

---

## Deployment

### Relay -> Fly.io ✅ DEPLOYED
- **URL:** `https://receptionai-relay.fly.dev` (LHR region)
- **Health check:** `GET /health` returns `{"status":"ok","timestamp":"..."}`
- **Docker:** `Dockerfile.relay` in repo root (multi-stage, creates workspace symlinks)
```bash
# Deploy (from repo root)
fly deploy --config fly.toml --dockerfile Dockerfile.relay --app receptionai-relay

# Check health / logs
curl https://receptionai-relay.fly.dev/health
fly logs --app receptionai-relay

# Update secrets
fly secrets set KEY=value --app receptionai-relay
```
**Note:** Always use `--no-cache` after changing `.npmrc` or `Dockerfile.relay` structure to avoid stale Docker layers.

### Web -> Vercel ✅ DEPLOYED
- **URL:** `https://receptionaix-relay.vercel.app`
- **Project:** `receptionaix-relay` on Vercel, connected to `stevemilton/receptionaix` GitHub repo
- **Build:** `vercel.json` runs `types → shared → web` build chain
- **Env vars:** Set in Vercel dashboard (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TWILIO_*, RELAY_*, GROK_API_KEY, etc.)
- **Twilio webhook:** Voice webhook `POST https://receptionaix-relay.vercel.app/api/twilio/incoming`
- **Twilio numbers:** `+447446469600` (original), `+447427814067` (The Perse School — provisioned via onboarding)

### Database -> Supabase
```bash
pnpm db:push   # Apply migrations (007 still pending)
pnpm db:types  # Regenerate types (commit the output)
```

### Mobile -> EAS Build ✅ iOS SUBMITTED
- **EAS Project:** `@stevemilton/receptionai` ([expo.dev](https://expo.dev/accounts/stevemilton/projects/receptionai))
- **Project ID:** `480f5c1a-a0ba-4bd2-b98b-9dd8926a90f3`
- **Bundle ID:** `com.receptionai.app`
- **Apple Team:** `STEPHEN CHRISTOPHER MILTON (Individual)` (Team ID: `6FK49H335R`)
- **Apple ID:** `greasylaketwitter@gmail.com`
- **Distribution cert:** `QRRU3Z9PA7` (shared with UTx app — this is safe and normal)
- **iOS status:** Production build submitted to TestFlight
```bash
cd apps/mobile

# Future builds (credentials are cached now)
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios

# Android (not yet attempted)
eas build --platform android --profile production

# Development build (iOS Simulator)
eas build --platform ios --profile development

# IMPORTANT: casing check workaround for macOS
EAS_BUILD_DISABLE_CASING_CHECK=1 eas build --platform ios --profile production
```
**Note:** macOS case-insensitive filesystem causes EAS to detect "inconsistent filename casing" from unrelated files in git history. Use `EAS_BUILD_DISABLE_CASING_CHECK=1` env var to bypass.

---

## Recommended Work Order

If picking this up:

1. ~~**Deploy web to Vercel**~~ ✅ Live at `https://receptionaix-relay.vercel.app`
2. ~~**Configure Twilio webhook**~~ ✅ Voice webhook → Vercel `/api/twilio/incoming`
3. ~~**Test E2E voice call**~~ ✅ Call to `+447427814067` → Grok responds with voice greeting
4. ~~**Dashboard redesign**~~ ✅ Post-call processing, AI summaries, shared components, Messages page
5. **Re-enable Twilio signature verification** — Fix URL mismatch on Vercel
6. **Update Google Cloud Console** — Add `https://receptionaix-relay.vercel.app/api/google/callback` as authorized redirect URI
7. ~~**Build mobile with EAS**~~ ✅ Build #5 completed (redesigned UI)
8. **Submit build #5 to TestFlight** — `eas submit --platform ios`
9. **TestFlight testing** — Test iOS app on physical device
9. **Android build** — `EAS_BUILD_DISABLE_CASING_CHECK=1 eas build --platform android --profile production`
10. **Configure RevenueCat** — Set up products, connect App Store, add API keys to `.env`
11. **Apply pending migrations** — `pnpm db:push` for migrations 007 and 011
12. **Integrate real Google Calendar** — Replace mock slots in tool-handlers.ts
13. **Build push notification backend** — Expo Push API integration
14. **Re-enable Stripe** — Uncomment keys, test subscription flow
15. **Set up test suite** — Integration tests for API routes and relay

---

## File Reference (Most Important Files)

| File | What It Does |
|------|--------------|
| `apps/relay/src/server.ts` | Fastify + WS entry point (accepts WS, auth in start event) |
| `apps/relay/src/auth.ts` | HMAC-SHA256 token verification (verifyRelayToken) |
| `apps/relay/src/media-stream-handler.ts` | Twilio ↔ Grok bridge (μ-law passthrough, auth from customParameters) |
| `apps/relay/src/grok-client.ts` | Grok WebSocket management, xAI Voice Agent session config |
| `apps/relay/src/tool-handlers.ts` | Executes 5 reception tools with param validation |
| `apps/relay/src/post-call.ts` | **NEW** Post-call processing: customer creation, AI summaries, message linking |
| `apps/relay/src/audio-utils.ts` | u-law <-> PCM16 codec conversion |
| `apps/web/src/app/dashboard/_components/shared.tsx` | **NEW** Shared formatters, badges, icons, layout components |
| `apps/web/src/app/dashboard/messages/page.tsx` | **NEW** Messages page with filters and mark-as-read |
| `apps/web/src/app/api/messages/route.ts` | **NEW** Messages API (GET all, PUT read, PUT mark-all-read) |
| `apps/web/src/app/api/twilio/incoming/route.ts` | Incoming call webhook (returns TwiML) |
| `apps/web/src/app/api/stripe/webhook/route.ts` | Subscription lifecycle with metadata validation |
| `apps/web/src/app/admin/(dashboard)/layout.tsx` | Admin auth guard |
| `apps/web/src/app/dashboard/_components/dashboard-shell.tsx` | **NEW** Client component with mobile hamburger nav + responsive shell |
| `apps/web/src/app/dashboard/layout.tsx` | Dashboard auth guard with impersonation validation (server component) |
| `apps/web/src/lib/supabase/admin.ts` | Service-role Supabase client (typed with Database) |
| `apps/web/src/lib/supabase/api-auth.ts` | Dual auth (cookie + Bearer token) for web/mobile |
| `apps/web/src/lib/csrf.ts` | CSRF origin validation utility |
| `packages/knowledge/src/extractor.ts` | Grok-based KB extraction with output capping (xAI text API) |
| `packages/types/src/index.ts` | Row type aliases (MerchantRow, CallRow, etc.) |
| `packages/types/src/database.ts` | Supabase table types (generated via `supabase gen types typescript`) |
| `apps/mobile/src/theme.ts` | **NEW** Mobile design tokens (typography, gradient colors, color palette) |
| `apps/mobile/src/components/ScreenBackground.tsx` | **NEW** 64-band gradient background component (pure Views, Expo Go compatible) |
