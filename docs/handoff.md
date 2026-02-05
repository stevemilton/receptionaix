# ReceptionAI - Developer Handoff

**Date:** 2026-02-05
**Status:** All 9 build phases complete. Production hardening required.

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
  types/        Shared TypeScript interfaces (database + business models)
  shared/       API usage tracking utilities
```

### Data Flow: Incoming Call
```
Caller → Twilio → POST /api/twilio/incoming (Vercel)
                   ↓ Returns TwiML with Stream URL
         Twilio → WebSocket → relay server (Fly.io)
                               ↓ Fetches merchant config from Supabase
                               ↓ Opens WebSocket to Grok Realtime API
                               ↓ Converts audio: μ-law 8kHz ↔ PCM16 24kHz
                               ↓ Executes tool calls (booking, lookup, etc.)
                               ↓ On call end: POST transcript to Supabase
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Relay on Fly.io, not Vercel | Vercel doesn't support long-lived WebSockets |
| Firecrawl, not Puppeteer | Serverless-friendly, no headless browser required |
| μ-law ↔ PCM16 conversion in relay | Twilio sends 8kHz μ-law, Grok needs 24kHz PCM16 |
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

---

## What Doesn't Work Yet

### Google Calendar (Mock Only)
`checkAvailability` in `apps/relay/src/tool-handlers.ts:94` returns hardcoded slots. OAuth tokens are stored during onboarding but never used for real calendar queries. This is the biggest feature gap.

### Push Notifications (Half-Built)
Mobile app registers Expo push tokens and saves to `merchants.push_token`. No backend service exists to actually send notifications. The cron route at `apps/web/src/app/api/cron/notifications/route.ts` has the skeleton but needs the Expo Push API integration.

### Mobile Device Testing
The app has not been tested on physical iOS or Android devices. `app.json` still has a placeholder EAS project ID. Deeplink configuration is missing (needed for password reset email flow).

---

## Critical Security Issues to Fix First

These are blocking issues for production. See `docs/status.md` for the full list.

### 1. Merchant Impersonation (Privilege Escalation)
**File:** `apps/web/src/app/admin/(dashboard)/merchants/[id]/page.tsx:241-251`

The admin impersonation feature passes `?impersonate=<merchantId>` as a URL param. The dashboard layout at `apps/web/src/app/dashboard/layout.tsx` never checks if the current user is an admin. Any authenticated user who guesses a merchant ID can view their data.

**Fix approach:** In the dashboard layout, check for the `impersonate` query param. If present, verify the current user is an admin (query the admin users table or check a role claim). Reject with 403 if not authorized.

### 2. Relay Token Bypass (Authentication Bypass)
**File:** `apps/relay/src/media-stream-handler.ts:76-79`

When HMAC verification fails on the relay server, the code falls back to reading `merchantId` and `callerPhone` directly from Twilio's `customParameters`. An attacker can open a WebSocket to the relay with arbitrary parameters.

**Fix approach:** Remove the fallback entirely. If `session.merchantId` is empty after token verification, close the WebSocket with an error. The `callerPhone` should also come from the verified token, not from custom parameters.

### 3. WebSocket Resource Leaks
**Files:** `apps/relay/src/grok-client.ts:74-79`, `apps/relay/src/media-stream-handler.ts:64-66`

When the Grok WebSocket errors, the connection isn't explicitly closed. When the Twilio WebSocket errors, the Grok connection isn't cleaned up. Over time these leak file descriptors.

**Fix approach:** Add `ws.close()` in every error handler. Use a cleanup function that both the `close` and `error` handlers call.

---

## Environment Variables

All required env vars are listed in `.env.example`. The critical ones:

| Variable | Used By | Notes |
|----------|---------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Web API, Relay | Bypasses RLS. Never expose to client. |
| `GROK_API_KEY` | Relay | xAI API key for voice |
| `TWILIO_AUTH_TOKEN` | Web API | Used for signature verification |
| `STRIPE_WEBHOOK_SECRET` | Web API | Validates Stripe webhooks |
| `RELAY_SERVICE_KEY` | Web API, Relay | Shared secret for relay ↔ web API calls |
| `CRON_SECRET` | Web API | Vercel Cron job authorization |
| `ADMIN_DEV_BYPASS` | Web API | Set to `true` ONLY in local dev |

**Important:** Several API routes silently skip auth if env vars are missing (e.g., `CRON_SECRET`, `RELAY_SERVICE_KEY`, `TWILIO_AUTH_TOKEN`). Validate all required env vars at startup before deploying.

---

## Testing Notes

- No test suite exists yet. The `pnpm test` command is defined but has no test runner configured.
- Voice testing requires Twilio test credentials and a running relay server.
- A mock Grok client exists at `apps/relay/src/mock-grok-client.ts` for local development.
- Admin panel has a dev bypass (`ADMIN_DEV_BYPASS=true`) that skips authentication entirely. Never deploy with this enabled.

---

## Deployment

### Web → Vercel
Auto-deploys from `main`. Environment variables configured in Vercel dashboard.

### Relay → Fly.io
```bash
cd apps/relay
fly secrets set GROK_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx RELAY_SERVICE_KEY=xxx
fly deploy
```

### Database → Supabase
```bash
pnpm db:push   # Apply migrations
pnpm db:types  # Regenerate types (commit the output)
```

### Mobile → EAS Build
```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
eas submit      # Submit to App Store / Play Store
```

---

## Recommended Work Order

If picking this up for production hardening:

1. **Fix the 3 critical security issues** (impersonation, relay bypass, resource leaks)
2. **Add env var validation** — fail fast at startup if required vars are missing
3. **Add runtime validation** to relay tool handlers and knowledge extractor (consider zod)
4. **Add request timeouts** to all external fetch() calls
5. **Regenerate Supabase types** to eliminate `any` casting across 10+ files
6. **Integrate real Google Calendar** — replace mock slots in tool-handlers.ts
7. **Build push notification backend** — Expo Push API integration
8. **Add rate limiting** to Twilio provisioning and knowledge search endpoints
9. **Set up a test suite** — at minimum, integration tests for API routes and relay
10. **Test mobile on devices** — update app.json, add deeplinks, run on simulators

---

## File Reference (Most Important Files)

| File | What It Does | Watch Out For |
|------|--------------|---------------|
| `apps/relay/src/server.ts` | Fastify + WS entry point, HMAC verification | callerPhone hardcoded empty (line 56) |
| `apps/relay/src/media-stream-handler.ts` | Twilio ↔ Grok bridge | Unverified param fallback (line 76-79) |
| `apps/relay/src/grok-client.ts` | Grok WebSocket management | No cleanup on error (line 74-79) |
| `apps/relay/src/tool-handlers.ts` | Executes 5 reception tools | No runtime param validation |
| `apps/relay/src/audio-utils.ts` | μ-law ↔ PCM16 conversion | Naive resampling, silent error fallback |
| `apps/web/src/app/api/twilio/incoming/route.ts` | Incoming call webhook | Signature verification bypassed in dev |
| `apps/web/src/app/api/stripe/webhook/route.ts` | Subscription lifecycle | Metadata not validated against user |
| `apps/web/src/app/admin/(dashboard)/layout.tsx` | Admin auth guard | Dev bypass if env vars wrong |
| `apps/web/src/app/dashboard/layout.tsx` | Dashboard auth guard | No impersonation validation |
| `packages/knowledge/src/extractor.ts` | Claude-based KB extraction | Unsafe JSON parsing, no schema validation |
| `packages/types/src/database.ts` | Supabase table types | Overuse of Record<string, unknown> |
| `packages/types/src/models.ts` | Business model types | Overlaps with database.ts, inconsistent |
