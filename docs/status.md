# ReceptionAI - Project Status

**Last updated:** 2026-02-05
**Phase:** Post Phase 9 — All core features implemented, pre-production hardening required

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

## Current Focus: Security Hardening & Production Readiness

A full codebase review was completed on 2026-02-05. The findings below must be addressed before production deployment.

---

## Critical Issues (Must Fix Before Any Deployment)

### 1. Unprotected Merchant Impersonation
- **Location:** `apps/web/src/app/admin/(dashboard)/merchants/[id]/page.tsx:241-251`
- **Problem:** `?impersonate=<merchantId>` query param passed to dashboard without authorization validation. Any user who knows a merchant ID can access their data.
- **Fix:** Validate that the current user has admin role before honoring the impersonate param in the dashboard layout.

### 2. Relay Falls Back to Unverified Parameters
- **Location:** `apps/relay/src/media-stream-handler.ts:76-79`
- **Problem:** When HMAC token verification fails, code falls back to unverified `customParameters` from Twilio. Attacker can inject arbitrary `merchantId` and `callerPhone`.
- **Fix:** Reject the connection entirely if token verification fails. Remove the fallback.

### 3. callerPhone Hardcoded to Empty String
- **Location:** `apps/relay/src/server.ts:56`
- **Problem:** Token verification extracts `merchantId` but returns `callerPhone: ''`. Caller attribution is unreliable for all calls.
- **Fix:** Include `callerPhone` in the HMAC payload and extract it from the verified token.

---

## High Priority Issues

### 4. Stripe Webhook Metadata Not Validated
- **Location:** `apps/web/src/app/api/stripe/webhook/route.ts:81-129`
- **Problem:** `session.metadata.user_id` used to update merchant records without verifying ownership.
- **Risk:** Subscription fraud if metadata is manipulated.

### 5. WebSocket Resource Leaks in Relay
- **Grok WS not closed on error:** `apps/relay/src/grok-client.ts:74-79`
- **Twilio error handler doesn't close Grok:** `apps/relay/src/media-stream-handler.ts:64-66`
- **Impact:** Abandoned connections accumulate, exhausting memory and file descriptors over time.

### 6. Env Var Validation Missing
- **Locations:** `apps/web/src/app/api/cron/notifications/route.ts:17-22`, `apps/web/src/app/api/calls/post-complete/route.ts:17-23`
- **Problem:** If `CRON_SECRET` or `RELAY_SERVICE_KEY` are unset, auth checks behave unpredictably instead of failing closed.

### 7. SQL Filter Interpolation in Admin Search
- **Location:** `apps/web/src/app/admin/(dashboard)/merchants/page.tsx:37-39`
- **Problem:** User input directly interpolated into Supabase `.or()` filter string.

### 8. Missing Input Validation Across API Routes
- `/api/knowledge/search` — no length/pattern validation on query
- `/api/knowledge/generate` — no validation on businessName, websiteUrl
- `/api/stripe/checkout` — no validation on tierId
- `/api/onboarding/complete` — no sanitization of FAQs/services

---

## Medium Priority Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Unencrypted OAuth tokens | `apps/web/src/app/api/google/callback/route.ts:74-87` | Google Calendar tokens stored as plaintext JSON in DB |
| Silent audio conversion fallback | `apps/relay/src/audio-utils.ts:94-97` | Returns wrong-format audio on error instead of failing |
| Naive audio resampling | `apps/relay/src/audio-utils.ts:77-84, 117-124` | No anti-aliasing filter; audible artifacts |
| Tool params not validated | `apps/relay/src/tool-handlers.ts:109-114` | `as` type assertion without runtime checks |
| Master KB no error handling | `packages/knowledge/src/master-kb.ts:60-93` | DB errors and "not found" both return null silently |
| Supabase client anon fallback | `packages/shared/src/api-usage.ts:29-38` | Falls back to anon key if service role key missing |
| No rate limiting | `apps/web/src/app/api/twilio/provision/route.ts` | Unlimited phone provisioning for authenticated users |
| No request timeouts | All external fetch() calls | Hang indefinitely if external service stalls |
| RevenueCat not synced to DB | `apps/mobile/src/lib/revenuecat.ts` | Backend can't verify mobile subscription state |
| Fire-and-forget POST no timeout | `apps/relay/src/media-stream-handler.ts:144-172` | Pending fetch promises accumulate if endpoint stalls |
| Unsafe JSON parsing | `packages/knowledge/src/extractor.ts:126-150` | No schema validation on Claude API response |
| Dev admin bypass risk | `apps/web/src/app/admin/(dashboard)/layout.tsx:12-21` | If deployed with wrong env vars, admin auth bypassed |

---

## Low Priority Issues

| Issue | Location |
|-------|----------|
| Widespread `any` type casting (10+ files) | Multiple Supabase query sites |
| No CSRF protection on web routes | All state-changing API routes |
| Inconsistent password requirements (6 vs 8 chars) | Mobile SignUp vs ChangePassword screens |
| No email format validation in mobile signup | `apps/mobile/src/screens/auth/SignUpScreen.tsx` |
| Incomplete notification tap handler | `apps/mobile/src/App.tsx:36-41` |
| Deprecated `extractKnowledgeWithGrok` still exported | `packages/knowledge/src/extractor.ts:113-121` |
| Dual type systems (database.ts vs models.ts) | `packages/types/src/` |
| Global debug flag never reset | `apps/relay/src/grok-client.ts:307-314` |
| Toast IDs use Math.random() | `packages/ui/src/Toast.tsx:36` |

---

## Known Feature Gaps

### Google Calendar Integration
- OAuth tokens stored during onboarding
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
- Stripe webhook signature verification via SDK
- Secure token storage on mobile (expo-secure-store)
- Good navigation architecture in mobile (three-state auth flow)
- Well-defined tool system for Grok voice agent
- Comprehensive onboarding flow with 8 steps
- Master KB system for cross-merchant learning
