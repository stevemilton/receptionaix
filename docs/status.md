# ReceptionAI - Project Status

**Last updated:** 2026-02-06
**Phase:** MVP Deployment — External hosting, mobile-first pivot

---

## Build Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Foundation | Monorepo, Supabase, Auth, RLS | Complete |
| 2. UI Components | Design system, shared components | Complete |
| 3. Knowledge Base | Firecrawl, Places API, Grok extraction | Complete |
| 4. Onboarding | 8-step merchant onboarding wizard | Complete |
| 5. Voice Agent | Relay server, Grok integration, tools | Complete |
| 6. Dashboard | Merchant dashboard, calls, settings | Complete |
| 7. Admin | Enterprise admin panel, impersonation | Complete |
| 8. Billing | Stripe, RevenueCat, usage tracking | Complete (Stripe deferred for MVP) |
| 9. Mobile | Expo app, auth, push, subscriptions | Complete (untested on device) |
| 10. Deployment | External hosting, Grok API fix | **In Progress** |

---

## Security Hardening Progress

Nine hardening batches have been completed across commits `97440b7` through current:

### Batch 1: Critical Vulnerabilities (commit `97440b7`)
- [x] **Merchant impersonation** — Dashboard layout validates admin role before honoring `?impersonate=` param
- [x] **Relay token bypass** — Removed unverified `customParameters` fallback; connection rejected if HMAC fails
- [x] **callerPhone attribution** — Included in HMAC payload, extracted from verified token

### Batch 2: Env Validation, Tool Params, Timeouts (commit `7c4e61d`)
- [x] Env var validation — Routes fail closed if `CRON_SECRET`, `RELAY_SERVICE_KEY`, etc. are unset
- [x] Runtime param validation on relay tool handlers (zod-style checks)
- [x] Request timeouts on all external fetch() calls (Firecrawl, xAI, Google)

### Batch 3: WebSocket Leaks, SQL Injection, Webhook Validation, Input Checks (commit `5199862`)
- [x] Grok WebSocket properly closed on error; Twilio error handler cleans up Grok connection
- [x] SQL filter interpolation in admin merchant search replaced with parameterized query
- [x] Stripe webhook metadata validated against existing merchant before update
- [x] Input validation added to `/api/knowledge/search`, `/api/knowledge/generate`, `/api/stripe/checkout`, `/api/onboarding/complete`

### Batch 4: Audio Fallback, Anon Key Leak, Admin Bypass, Master KB Injection (commit `fd85042`)
- [x] Silent audio conversion fallback replaced with proper error propagation
- [x] Supabase anon key fallback removed from `packages/shared/src/api-usage.ts`
- [x] Admin dev bypass requires explicit `ADMIN_DEV_BYPASS=true` (not just absence of check)
- [x] Master KB contribution sanitized and validated

### Batch 5: OAuth Encryption, Rate Limiting, Extractor Cap, RevenueCat Webhook (commit `1917c54`)
- [x] Google Calendar OAuth tokens encrypted at rest in DB
- [x] Rate limiting on Twilio provisioning endpoint
- [x] Extractor output capped to prevent oversized responses
- [x] RevenueCat webhook signature verification hardened

### Batch 6: Low-Priority Cleanup (commit `b5478ec`)
- [x] Inconsistent password requirements unified (8 chars everywhere)
- [x] Email format validation added to mobile signup
- [x] Deprecated `extractKnowledgeWithGrok` removed
- [x] Global debug flag properly scoped per-connection
- [x] Toast IDs use crypto-safe random generation

### Batch 7: CSRF Protection (commit `cc09ae0`)
- [x] Origin header validation on all cookie-auth state-changing routes
- [x] Protected routes: signout, stripe/checkout, stripe/portal, onboarding/complete, twilio/provision
- [x] Lazy-init Supabase clients in service-role routes (prevents build-time crash)

### Batch 8: Type System Cleanup (commit `d294feb`)
- [x] Deleted orphaned `models.ts` (153 lines of dead code, imported by zero files)
- [x] Added row type aliases (`MerchantRow`, `CallRow`, etc.) derived from Database type
- [x] Consolidated duplicate `MerchantConfig` in relay
- [x] Standardized service-role routes to use `createAdminClient()`
- [x] Fixed `api-auth.ts` return type to reduce inline `as any` casts

### Batch 9: Type System Regeneration & Column Alignment (2026-02-06)
- [x] Regenerated `packages/types/src/database.ts` via `supabase gen types typescript`
- [x] Added missing columns to types: `billing_period_start`, `stripe_overage_item_id`, `website` (from unapplied migration 007)
- [x] Fixed column name mismatches vs live DB:
  - `subscription_status` → `plan_status` (~17 files)
  - `subscription_tier` → `plan_tier` (~10 files)
  - `subscription_ends_at` → `trial_ends_at` (~12 files)
  - `calls.status` → `calls.outcome` (6 files across web, mobile, relay)
- [x] Removed ~30 `as any` casts from Supabase queries (admin, dashboard, API routes)
- [x] Fixed nullable type safety across all dashboard and admin pages
- [x] Upgraded `@supabase/ssr` from `0.1.0` → `0.8.0` (required for `supabase-js@2.91.1` type compatibility)
- [x] Updated `api-auth.ts` return type from `AnySupabaseClient` to `TypedSupabaseClient`
- [x] Added build-safe placeholder env vars for SSG in Supabase client creation

---

## Deployment Progress (2026-02-06)

### Grok Voice API Rewrite (commit `bac184a`)
The relay server was using **OpenAI Realtime API format** which is incompatible with xAI's Grok Voice Agent API. Complete rewrite of `grok-client.ts`:
- [x] Session config uses xAI nested `audio.input.format` / `audio.output.format` structure
- [x] Voice names changed from OpenAI (`alloy`, `echo`) to xAI (`Ara`, `Rex`, `Sal`, `Eve`, `Leo`)
- [x] Event names fixed: `response.output_audio.delta` (was `response.audio.delta`)
- [x] Transcript event: `response.output_audio_transcript.delta` (was `response.audio_transcript.delta`)
- [x] Audio conversion removed — Grok supports `audio/pcmu` (μ-law 8kHz) natively, same as Twilio
- [x] Removed OpenAI-specific fields (`modalities`, `tool_choice`, `temperature`, `OpenAI-Beta` header)

### Infrastructure Deployment
- [x] **Relay (Fly.io):** Deployed and healthy at `https://receptionai-relay.fly.dev` (LHR region)
  - Docker build fixed: `.npmrc` added for `shamefully-hoist=true`, workspace symlinks recreated in runner stage
  - `packages/shared` converted from source-based to compiled package with proper ESM exports
  - Secrets set: `GROK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RELAY_SERVICE_KEY`
- [x] **Web (Vercel):** Deployed at `https://receptionaix-relay.vercel.app` — env vars set, Supabase connected
- [x] **Twilio webhook:** `+447446469600` pointed to `https://receptionaix-relay.vercel.app/api/twilio/incoming`
- [x] **Google redirect URI:** Updated in `.env.local` to `https://receptionaix-relay.vercel.app/api/google/callback` (needs updating in Google Cloud Console)
- [ ] **Mobile (EAS):** Ready for build once EAS project ID configured

### Build Pipeline Fixes
- [x] React 18/19 conflict resolved via `pnpm.overrides` in root `package.json`
- [x] `packages/shared` now compiles to `dist/` with proper `.js` ESM import extensions
- [x] `Dockerfile.relay` creates workspace package symlinks (`@receptionalx/grok`, `shared`, `types`)
- [x] `vercel.json` runs shared build before web build

---

## Remaining Issues

### Justified `as any` Casts (~12 remaining)
These casts are **intentional** — they query tables that exist in the live DB but are not included in the generated `database.ts` types. They will resolve when these tables are added to the DB schema or the types are extended.

| Table | Used In |
|-------|---------|
| `admin_users` | admin/login, dashboard/layout, admin/layout |
| `messages` | dashboard/page |
| `call_errors` | admin/health |
| `api_usage_daily` | admin/page |
| `notification_log` | cron/notifications |

Additionally, 3 `.rpc()` calls retain `as any` because `Functions` is empty in the generated types (the RPC function `get_merchant_call_count` exists in the DB but isn't exposed in the generated types).

### Unapplied Migration
- Migration `007_billing_enforcement.sql` adds `billing_period_start` and `stripe_overage_item_id` columns. These were added to `database.ts` manually but the migration has **not been applied to the live Supabase DB**. Run `pnpm db:push` to apply.

### `styled-jsx` Build Warning
- 404/500 error pages fail during SSG due to a React version conflict in `styled-jsx`. This is a pre-existing dependency issue unrelated to the type system work. All actual app routes build correctly.

---

## Known Feature Gaps

### Google Calendar Integration
- OAuth tokens stored (encrypted) during onboarding
- `checkAvailability` returns **mock slots** (see `apps/relay/src/tool-handlers.ts:94`)
- TODO: Integrate with Google Calendar API for real availability

### Push Notification Backend
- Mobile app registers push tokens with Expo
- Tokens stored in `merchants.push_token`
- TODO: Backend service to send notifications via Expo Push API

### Mobile Testing
- iOS simulator and Android emulator testing not yet completed
- `app.json` still has placeholder EAS project ID
- No deeplink configuration for password reset flow
- RevenueCat subscription status not synced back to Supabase

### Stripe Billing (Deferred)
- Stripe keys commented out for MVP phase
- All billing code is built and functional
- Will re-enable after voice pipeline is proven

---

## What's Working Well

- Clean monorepo structure with proper package separation
- **Relay server deployed and healthy** on Fly.io (LHR)
- **Grok Voice Agent API** correctly integrated (xAI format, μ-law passthrough)
- RLS consistently enforced in Supabase queries
- Twilio signature verification with constant-time comparison
- HMAC-SHA256 relay authentication with callerPhone in payload
- Google OAuth tokens encrypted at rest
- CSRF origin validation on all cookie-auth routes
- Secure token storage on mobile (expo-secure-store)
- Good navigation architecture in mobile (three-state auth flow)
- Well-defined tool system for Grok voice agent with runtime param validation
- Comprehensive onboarding flow with 8 steps
- Master KB system for cross-merchant learning
- Env var validation — routes fail closed if secrets are unset
- Request timeouts on all external API calls
- Rate limiting on cost-sensitive endpoints
- Docker build pipeline working with pnpm workspace symlinks

---

## Next Steps (Priority Order)

1. ~~**Connect Vercel**~~ ✅ Deployed at `https://receptionaix-relay.vercel.app`
2. ~~**Configure Twilio**~~ ✅ Webhook pointed to `https://receptionaix-relay.vercel.app/api/twilio/incoming`
3. **Test E2E call** — Dial `+447446469600` → verify Grok responds → check transcript in Supabase
4. **Update Google Cloud Console** — Add `https://receptionaix-relay.vercel.app/api/google/callback` as authorized redirect URI
5. **EAS build** — Create Expo project, update `app.json`, build iOS/Android
6. **Google Calendar** — Replace mock slots with real availability queries
7. **Push notifications** — Expo Push API backend integration
