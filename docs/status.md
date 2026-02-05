# ReceptionAI - Project Status

**Last updated:** 2026-02-05
**Phase:** Post Phase 9 — Security hardening substantially complete, pre-production polish remaining

---

## Build Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Foundation | Monorepo, Supabase, Auth, RLS | Complete |
| 2. UI Components | Design system, shared components | Complete |
| 3. Knowledge Base | Firecrawl, Places API, Claude extraction | Complete |
| 4. Onboarding | 8-step merchant onboarding wizard | Complete |
| 5. Voice Agent | Relay server, Grok integration, tools | Complete |
| 6. Dashboard | Merchant dashboard, calls, settings | Complete |
| 7. Admin | Enterprise admin panel, impersonation | Complete |
| 8. Billing | Stripe, RevenueCat, usage tracking | Complete |
| 9. Mobile | Expo app, auth, push, subscriptions | Complete (untested on device) |

---

## Security Hardening Progress

Six hardening batches have been completed across commits `97440b7` through `d294feb`:

### Batch 1: Critical Vulnerabilities (commit `97440b7`)
- [x] **Merchant impersonation** — Dashboard layout validates admin role before honoring `?impersonate=` param
- [x] **Relay token bypass** — Removed unverified `customParameters` fallback; connection rejected if HMAC fails
- [x] **callerPhone attribution** — Included in HMAC payload, extracted from verified token

### Batch 2: Env Validation, Tool Params, Timeouts (commit `7c4e61d`)
- [x] Env var validation — Routes fail closed if `CRON_SECRET`, `RELAY_SERVICE_KEY`, etc. are unset
- [x] Runtime param validation on relay tool handlers (zod-style checks)
- [x] Request timeouts on all external fetch() calls (Firecrawl, Anthropic, Google)

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

---

## Remaining Issues

### Type System — `as any` Casts (~35 occurrences)
- **Root cause:** Hand-written `packages/types/src/database.ts` lacks the `Relationships`, `CompositeTypes`, and other structures that `@supabase/supabase-js` v2.91 requires for typed PostgREST queries. All queries return `never` without `as any`.
- **Fix:** Regenerate `database.ts` via `supabase gen types typescript` against the live project. This will resolve all ~35 occurrences in one shot.
- **Workaround in place:** `api-auth.ts` returns `AnySupabaseClient` (typed as `any`), and service-role routes use `any`-typed lazy-init variables. The pattern is consistent and documented.

### Missing Tables in `database.ts`
- `api_usage_daily`, `notification_log`, `business_types`, `master_*` tables are referenced in code but not defined in the hand-written type file. These will also be resolved by `supabase gen types`.

### Mobile `as any` Casts (2 occurrences)
- `apps/mobile/src/screens/settings/KnowledgeBaseScreen.tsx` — Same root cause as web. Will be fixed when `database.ts` is regenerated.

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

---

## What's Working Well

- Clean monorepo structure with proper package separation
- RLS consistently enforced in Supabase queries
- Twilio signature verification with constant-time comparison
- Stripe webhook signature verification via SDK + metadata validation
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
