# ReceptionAI - Project Status

**Last updated:** 2026-02-06 (night)
**Phase:** MVP Live — E2E voice pipeline working, dashboard redesigned & mobile-responsive, iOS build submitted to TestFlight

---

## Build Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Foundation | Monorepo, Supabase, Auth, RLS | Complete |
| 2. UI Components | Design system, shared components | Complete |
| 3. Knowledge Base | Firecrawl, Places API, Grok extraction | Complete |
| 4. Onboarding | 8-step merchant onboarding wizard | Complete |
| 5. Voice Agent | Relay server, Grok integration, tools | Complete |
| 6. Dashboard | Merchant dashboard, calls, settings | **Redesigned** ✅ |
| 7. Admin | Enterprise admin panel, impersonation | Complete |
| 8. Billing | Stripe, RevenueCat, usage tracking | Complete (Stripe deferred for MVP) |
| 9. Mobile | Expo app, auth, push, subscriptions | **iOS build submitted** ✅ |
| 10. Deployment | External hosting, Grok API fix | **Complete** ✅ |

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
  - Secrets set: `GROK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RELAY_SERVICE_KEY`
- [x] **Web (Vercel):** Deployed at `https://receptionaix-relay.vercel.app` — all env vars set, Supabase connected
- [x] **Twilio webhook:** `+447446469600` pointed to `https://receptionaix-relay.vercel.app/api/twilio/incoming`
- [x] **Twilio number provisioned:** `+447427814067` assigned to The Perse School merchant
- [x] **Google redirect URI:** Updated in `.env.local` to `https://receptionaix-relay.vercel.app/api/google/callback` (needs updating in Google Cloud Console)
- [x] **Mobile (EAS):** iOS production build completed and submitted to TestFlight
  - EAS project: `@stevemilton/receptionai` (ID: `480f5c1a-a0ba-4bd2-b98b-9dd8926a90f3`)
  - Bundle ID: `com.receptionai.app`
  - Apple Team: `STEPHEN CHRISTOPHER MILTON (Individual)` (Team ID: `6FK49H335R`)
  - Distribution cert: `QRRU3Z9PA7` (shared with UTx app)
  - Submitted via `eas submit --platform ios`

### E2E Voice Pipeline ✅ WORKING (2026-02-06)
First successful end-to-end call completed:
- [x] Caller dials `+447427814067` → Twilio connects
- [x] Vercel webhook returns TwiML with `<Stream>` + `<Parameter>` auth
- [x] Twilio opens WebSocket to Fly.io relay
- [x] Relay verifies HMAC token from `customParameters` in start event
- [x] Relay connects to Grok Voice Agent API (xAI)
- [x] Grok responds with voice audio (μ-law passthrough, no conversion)
- [x] Caller hears AI receptionist greeting

### Key Fixes During Deployment (2026-02-06)
- **Twilio `<Stream>` strips query params:** Auth params (token, merchantId, callerPhone, ts) must be passed as `<Parameter>` TwiML elements, not URL query strings. They arrive in the `start` event's `customParameters` object.
- **TwiML XML escaping:** `&` in URLs must be escaped as `&amp;` in TwiML attributes (Twilio error 12100).
- **Supabase API keys:** Must use full JWT format from "Legacy API Keys" tab, not the new short-form keys (`sb_secret_...`).
- **CSRF on provision:** Required `NEXT_PUBLIC_APP_URL` env var in Vercel for origin validation.
- **UK Twilio numbers:** Require regulatory bundle SID (`BU2cf73b30f3fccf30b4850b4a7ea973a9`).
- **Signature verification:** Temporarily disabled — `request.url` on Vercel differs from the public URL Twilio signs against.
- **Vercel deployment caching:** Sometimes requires a new commit to force fresh deployment of latest code.

### Build Pipeline Fixes
- [x] React 18/19 conflict resolved via `pnpm.overrides` in root `package.json`
- [x] `packages/shared` now compiles to `dist/` with proper `.js` ESM import extensions
- [x] `Dockerfile.relay` creates workspace package symlinks (`@receptionalx/grok`, `shared`, `types`)
- [x] `vercel.json` runs shared build before web build

### Dashboard Redesign (commit `e290048`)
Full redesign of the merchant dashboard with post-call processing pipeline and new Messages page:

#### Backend: Post-Call Processing (`apps/relay/src/post-call.ts`)
- [x] **Auto-create customers** — Every caller gets a customer record (previously only on `createBooking`)
- [x] **AI call summaries** — Grok text API (`grok-3-mini-fast`) generates 2-3 sentence summaries from transcripts
- [x] **Link messages to calls** — Messages created by `takeMessage` tool are linked via `call_id`
- [x] **Link calls to customers** — Calls linked to customer records via `customer_id`
- [x] Fire-and-forget after `saveCallRecord()` in `media-stream-handler.ts`

#### Frontend: Shared Components (`apps/web/src/app/dashboard/_components/shared.tsx`)
- [x] Consolidated all format utilities: `formatPhone`, `formatDate`, `formatTime`, `formatDateTime`, `formatDuration`, `formatDurationLong`, `getInitials`, `formatDateHeader`, `timeAgo`
- [x] Shared badge components: `OutcomeBadge`, `AppointmentStatusBadge`, `UrgencyBadge`
- [x] Shared layout components: `EmptyState`, `PageHeader`, `MetricCard`
- [x] All SVG icons centralized: `PhoneIcon`, `CalendarIcon`, `UsersIcon`, `MessageIcon`, `ArrowLeftIcon`, `ChevronRightIcon`, `InboxIcon`, `ClockIcon`

#### Frontend: Page Redesigns
- [x] **Overview** — 4 metric cards, recent calls with AI summaries and customer names, upcoming appointments, unread messages
- [x] **Calls list** — Table with customer name join, AI summary column, outcome badges
- [x] **Call detail** — 3-column layout: sidebar (summary, details, customer card, linked messages, linked appointments) + chat-bubble transcript
- [x] **Customers** — Card-based layout with call + appointment count badges
- [x] **Appointments** — Split into Upcoming (grouped by date) and Past & Cancelled
- [x] **Messages** (NEW) — Dedicated page with All/Unread/Read filters, mark-as-read, link to source calls

#### Frontend: New API Routes
- [x] `GET /api/messages` — Fetch all messages for authenticated merchant
- [x] `PUT /api/messages/:id/read` — Mark single message as read
- [x] `PUT /api/messages/mark-all-read` — Mark all messages as read

#### Navigation Update
- [x] Added Messages to primary nav with `MessageSquareIcon`
- [x] Removed Usage and Billing from primary nav (accessible from Settings)

### Mobile-Responsive Dashboard (commit `50c1ed9`)
Full mobile responsiveness pass across all dashboard pages:

#### Layout: Collapsible Mobile Navigation
- [x] Extracted dashboard layout into server + client component split (`layout.tsx` + `dashboard-shell.tsx`)
- [x] **Hamburger menu** on mobile with slide-over nav panel + backdrop overlay
- [x] Desktop sidebar hidden on mobile (`hidden lg:flex`), mobile top bar hidden on desktop (`lg:hidden`)
- [x] Active route highlighting via `usePathname()`
- [x] CSS `animate-slide-in` animation for mobile nav panel

#### Responsive Patterns Applied Across All Pages
- [x] Responsive padding: `p-4 sm:p-6 lg:p-8` (was fixed `p-8`)
- [x] Responsive text sizing: `text-xl sm:text-2xl`, `text-xs sm:text-sm`
- [x] Responsive grid gaps: `gap-3 sm:gap-4`, `gap-4 sm:gap-6`
- [x] Hidden decorative elements on mobile (avatar circles, dividers)
- [x] `flex-shrink-0` + `whitespace-nowrap` on action buttons

#### Page-Specific Mobile Fixes
- [x] **Calls list** — Dual layout: card-based on mobile (`sm:hidden`), table on desktop (`hidden sm:block`)
- [x] **Call detail** — Wider chat bubbles on mobile (`max-w-[85%]`), compact spacing
- [x] **Messages** — Overflow-x-auto filter tabs, hidden message icon, responsive action links
- [x] **Customers** — Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- [x] **Appointments** — Compact row padding, hidden vertical dividers, hidden phone on mobile
- [x] **Settings** — Voice grid `grid-cols-1 sm:grid-cols-2`, responsive section cards
- [x] **Knowledge Base** — Service form grid `grid-cols-1 sm:grid-cols-2`, narrower day labels (`w-20 sm:w-28`), responsive tabs
- [x] **Shared components** — `MetricCard`, `PageHeader`, `EmptyState` all responsive

### iOS Build & TestFlight Submission (commit `2acadfe`)
- [x] EAS project created: `@stevemilton/receptionai` on expo.dev
- [x] `eas.json` configured with development/preview/production build profiles
- [x] `app.json` updated with real EAS project ID, `ITSAppUsesNonExemptEncryption: false`, owner
- [x] `notification-icon.png` asset added (was missing, referenced by expo-notifications plugin)
- [x] All mobile TypeScript errors fixed:
  - Cast Supabase queries for tables/columns not in generated types (`push_token`, `messages`, `notifications_enabled`)
  - Fixed `headerBackTitleVisible` → `headerBackButtonDisplayMode` for React Navigation 7
  - Allow null on `started_at`/`outcome` fields to match DB schema
  - Cast `Json` types to `Service[]`/`FAQ[]`/`Record<string, string>` for knowledge base
- [x] iOS production build completed on EAS
- [x] Submitted to TestFlight via `eas submit --platform ios`

---

## Remaining Issues

### Justified `as any` Casts (~12 remaining)
These casts are **intentional** — they query tables that exist in the live DB but are not included in the generated `database.ts` types. They will resolve when these tables are added to the DB schema or the types are extended.

| Table | Used In |
|-------|---------|
| `admin_users` | admin/login, dashboard/layout, admin/layout |
| `messages` | dashboard/page, dashboard/messages/page, api/messages (3 routes), calls/[id]/page |
| `call_errors` | admin/health |
| `api_usage_daily` | admin/page |
| `notification_log` | cron/notifications |

Additionally, 3 `.rpc()` calls retain `as any` because `Functions` is empty in the generated types (the RPC function `get_merchant_call_count` exists in the DB but isn't exposed in the generated types).

### Twilio Signature Verification (Disabled)
- Temporarily disabled in `/api/twilio/incoming` because `request.url` on Vercel doesn't match the public URL Twilio signs against. Needs proper fix using `NEXT_PUBLIC_APP_URL` for signature validation URL.

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
- iOS production build submitted to TestFlight — awaiting Apple processing
- Android build not yet attempted
- No deeplink configuration for password reset flow
- RevenueCat API keys not yet configured (subscriptions won't work until set up in RevenueCat dashboard + `.env`)
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
- **Post-call processing** — auto-creates customers, generates AI summaries, links messages to calls
- **Dashboard redesigned** — polished merchant experience with shared components, Messages page, call summaries
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
3. ~~**Test E2E call**~~ ✅ Call to `+447427814067` → Grok responds with voice greeting
4. ~~**Dashboard redesign**~~ ✅ Post-call processing, shared components, Messages page, all pages redesigned
5. **Verify merchant config** — Check business_name is populated in Supabase (Grok said "Business Name" instead of "The Perse School")
6. **Re-enable Twilio signature verification** — Fix URL mismatch on Vercel
7. **Update Google Cloud Console** — Add `https://receptionaix-relay.vercel.app/api/google/callback` as authorized redirect URI
8. ~~**EAS build**~~ ✅ iOS production build submitted to TestFlight
9. **TestFlight testing** — Test mobile app on physical iOS device once Apple processes the build
10. **Android build** — `eas build --platform android --profile production`
11. **RevenueCat setup** — Configure products in RevenueCat dashboard, add API keys to `.env`
12. **Google Calendar** — Replace mock slots with real availability queries
13. **Push notifications** — Expo Push API backend integration
