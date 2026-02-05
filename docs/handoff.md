# ReceptionAI - Developer Handoff

**Date:** 2026-02-05
**Status:** All 9 build phases complete. Security hardening substantially complete. Type regeneration and feature gaps remain.

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
  knowledge/    Firecrawl scraping, Claude extraction, Google Places, Master KB
  types/        Database types + row type aliases (MerchantRow, CallRow, etc.)
  shared/       API usage tracking utilities
```

### Data Flow: Incoming Call
```
Caller -> Twilio -> POST /api/twilio/incoming (Vercel)
                   | Returns TwiML with Stream URL
         Twilio -> WebSocket -> relay server (Fly.io)
                               | Fetches merchant config from Supabase
                               | Opens WebSocket to Grok Realtime API
                               | Converts audio: u-law 8kHz <-> PCM16 24kHz
                               | Executes tool calls (booking, lookup, etc.)
                               | On call end: POST transcript to Supabase
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Relay on Fly.io, not Vercel | Vercel doesn't support long-lived WebSockets |
| Firecrawl, not Puppeteer | Serverless-friendly, no headless browser required |
| u-law <-> PCM16 conversion in relay | Twilio sends 8kHz u-law, Grok needs 24kHz PCM16 |
| HMAC-SHA256 tokens for relay auth | Twilio custom params can't carry session cookies |
| Mock Grok client for dev | Avoids burning API credits during development |
| Zustand for onboarding state | Persists across page navigations without server round-trips |
| RevenueCat for mobile billing | Handles App Store / Play Store IAP complexity |
| Master KB for cross-merchant learning | Shared FAQ/service templates by business type |

---

## What Works

- Full web onboarding flow (8 steps, Google Places, Firecrawl, Calendar OAuth, Twilio provisioning)
- Voice relay with Grok Realtime API (5 tools: lookup, availability, booking, cancel, message)
- Merchant dashboard (calls, transcripts, appointments, KB editor, settings, usage)
- Admin panel (merchant list, detail, impersonation, revenue, health monitor)
- Stripe billing (3 tiers, webhooks, portal)
- Mobile app (auth, dashboard, calls, settings, RevenueCat subscriptions)
- Supabase RLS for multi-tenant isolation
- CSRF protection on all cookie-auth routes
- OAuth token encryption at rest
- Rate limiting on provisioning endpoints
- Env var validation (fail-closed)

---

## What Doesn't Work Yet

### Google Calendar (Mock Only)
`checkAvailability` in `apps/relay/src/tool-handlers.ts:94` returns hardcoded slots. OAuth tokens are stored (encrypted) during onboarding but never used for real calendar queries. This is the biggest feature gap.

### Push Notifications (Half-Built)
Mobile app registers Expo push tokens and saves to `merchants.push_token`. No backend service exists to actually send notifications. The cron route at `apps/web/src/app/api/cron/notifications/route.ts` handles email notifications but not push.

### Mobile Device Testing
The app has not been tested on physical iOS or Android devices. `app.json` still has a placeholder EAS project ID. Deeplink configuration is missing (needed for password reset email flow).

---

## Security Status

Eight hardening batches have been completed. See `docs/status.md` for the detailed checklist.

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
- ~35 `as any` casts on Supabase queries — caused by hand-written `database.ts` that doesn't match `supabase-js` v2.91's PostgREST type requirements. Fix: run `supabase gen types typescript` against the live project.

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

### Web -> Vercel
Auto-deploys from `main`. Environment variables configured in Vercel dashboard.

### Relay -> Fly.io
```bash
cd apps/relay
fly secrets set GROK_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx RELAY_SERVICE_KEY=xxx
fly deploy
```

### Database -> Supabase
```bash
pnpm db:push   # Apply migrations
pnpm db:types  # Regenerate types (commit the output)
```

### Mobile -> EAS Build
```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
eas submit      # Submit to App Store / Play Store
```

---

## Recommended Work Order

If picking this up for production deployment:

1. **Regenerate Supabase types** — `supabase gen types typescript` to eliminate all ~35 `as any` casts
2. **Integrate real Google Calendar** — replace mock slots in tool-handlers.ts
3. **Build push notification backend** — Expo Push API integration
4. **Set up a test suite** — at minimum, integration tests for API routes and relay
5. **Test mobile on devices** — update app.json, add deeplinks, run on simulators
6. **Configure production deployment** — Vercel env vars, Fly.io secrets, Supabase project

---

## File Reference (Most Important Files)

| File | What It Does |
|------|--------------|
| `apps/relay/src/server.ts` | Fastify + WS entry point, HMAC verification |
| `apps/relay/src/media-stream-handler.ts` | Twilio <-> Grok bridge with audio conversion |
| `apps/relay/src/grok-client.ts` | Grok WebSocket management, session config |
| `apps/relay/src/tool-handlers.ts` | Executes 5 reception tools with param validation |
| `apps/relay/src/audio-utils.ts` | u-law <-> PCM16 codec conversion |
| `apps/web/src/app/api/twilio/incoming/route.ts` | Incoming call webhook (returns TwiML) |
| `apps/web/src/app/api/stripe/webhook/route.ts` | Subscription lifecycle with metadata validation |
| `apps/web/src/app/admin/(dashboard)/layout.tsx` | Admin auth guard |
| `apps/web/src/app/dashboard/layout.tsx` | Dashboard auth guard with impersonation validation |
| `apps/web/src/lib/supabase/admin.ts` | Service-role Supabase client (typed with Database) |
| `apps/web/src/lib/supabase/api-auth.ts` | Dual auth (cookie + Bearer token) for web/mobile |
| `apps/web/src/lib/csrf.ts` | CSRF origin validation utility |
| `packages/knowledge/src/extractor.ts` | Claude-based KB extraction with output capping |
| `packages/types/src/index.ts` | Row type aliases (MerchantRow, CallRow, etc.) |
| `packages/types/src/database.ts` | Supabase table types (hand-written, needs regeneration) |
