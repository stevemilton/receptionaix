# Technical Handoff Document: ReceptionAI Merchant Onboarding

## Overview

ReceptionAI is a voice-first AI receptionist platform for UK SMEs. This document covers the Merchant Onboarding flow, which guides new merchants through business setup, phone provisioning, and terms acceptance.

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend (Web)** | Next.js 14 (App Router) | Dashboard, onboarding wizard, API routes |
| **Frontend (Mobile)** | React Native + Expo | iOS/Android merchant app |
| **State Management** | Zustand + persist middleware | Client-side onboarding state with localStorage |
| **Backend API** | Next.js API Routes | REST endpoints on Vercel |
| **Voice Relay** | Node.js WebSocket Server | Bridges Twilio ↔ Grok Voice API (Fly.io) |
| **Database** | Supabase (PostgreSQL + RLS) | Merchant data, calls, appointments |
| **Voice AI** | Grok Realtime API (xAI) | Audio-to-audio voice processing |
| **Telephony** | Twilio | Phone number provisioning, media streams |
| **Payments** | Stripe | Subscription billing |
| **Scraping** | Firecrawl API | Business website knowledge extraction |

---

## 2. File Structure

```
receptionalx/
├── apps/
│   ├── web/                          # Next.js 14 App Router
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── onboarding/       # MERCHANT ONBOARDING FLOW
│   │   │   │   │   ├── page.tsx              # Landing/redirect (server component)
│   │   │   │   │   ├── layout.tsx            # Progress stepper + OnboardingGuard
│   │   │   │   │   ├── business-search/      # Step 1: Google Places lookup
│   │   │   │   │   ├── review-info/          # Step 2: Services, hours
│   │   │   │   │   ├── ai-greeting/          # Step 3: Voice & greeting config
│   │   │   │   │   ├── calendar-connect/     # Step 4: Google Calendar OAuth (optional)
│   │   │   │   │   ├── faq-editor/           # Step 5: FAQ configuration (optional)
│   │   │   │   │   ├── phone-setup/          # Step 6: Twilio number provisioning
│   │   │   │   │   ├── conditions/           # Step 7: Terms & Privacy acceptance
│   │   │   │   │   └── complete/             # Step 8: Save to DB, show summary
│   │   │   │   │
│   │   │   │   ├── api/
│   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   └── complete/route.ts # POST: Save onboarding to merchants table
│   │   │   │   │   ├── twilio/
│   │   │   │   │   │   ├── available-numbers/route.ts  # GET: Search UK numbers
│   │   │   │   │   │   ├── provision/route.ts          # POST: Buy & configure number
│   │   │   │   │   │   └── incoming/route.ts           # POST: TwiML webhook
│   │   │   │   │   ├── google/
│   │   │   │   │   │   ├── auth/route.ts               # GET: OAuth redirect
│   │   │   │   │   │   └── callback/route.ts           # GET: OAuth callback
│   │   │   │   │   ├── knowledge/
│   │   │   │   │   │   ├── search/route.ts             # POST: Places API lookup
│   │   │   │   │   │   └── generate/route.ts           # POST: Firecrawl + LLM extraction
│   │   │   │   │   └── stripe/
│   │   │   │   │       ├── checkout/route.ts
│   │   │   │   │       ├── portal/route.ts
│   │   │   │   │       └── webhook/route.ts
│   │   │   │   │
│   │   │   │   ├── dashboard/        # Merchant dashboard (post-onboarding)
│   │   │   │   ├── admin/            # Enterprise admin panel
│   │   │   │   └── auth/             # Login, signup, verify
│   │   │   │
│   │   │   ├── components/
│   │   │   │   └── OnboardingGuard.tsx   # Route protection + hydration check
│   │   │   │
│   │   │   └── lib/
│   │   │       ├── onboarding-store.ts   # Zustand store (localStorage persist)
│   │   │       ├── supabase/
│   │   │       │   ├── client.ts         # Browser client
│   │   │       │   ├── server.ts         # Server component client
│   │   │       │   ├── admin.ts          # Service role client
│   │   │       │   └── middleware.ts     # Auth middleware
│   │   │       └── stripe/
│   │   │           └── config.ts
│   │   │
│   │   └── middleware.ts             # Auth protection for routes
│   │
│   ├── relay/                        # Voice relay server (Fly.io)
│   │   └── src/
│   │       ├── server.ts             # WebSocket server entry
│   │       ├── media-stream-handler.ts
│   │       ├── grok-client.ts        # Grok Realtime API connection
│   │       ├── tool-handlers.ts      # Tool execution (booking, lookup)
│   │       └── supabase-client.ts
│   │
│   └── mobile/                       # React Native app
│       └── src/
│           ├── screens/
│           ├── navigation/
│           └── lib/
│
├── packages/
│   ├── supabase/
│   │   └── migrations/               # Database schema
│   │       ├── 001_initial_schema.sql
│   │       ├── 002_rls_policies.sql
│   │       ├── 003_admin_enhancements.sql
│   │       └── 004_stripe_billing.sql
│   ├── grok/                         # Grok tool definitions & types
│   ├── ui/                           # Shared React components
│   ├── types/                        # TypeScript interfaces
│   └── knowledge/                    # Firecrawl + Places API integration
│
└── docs/                             # Technical documentation
```

---

## 3. State Machine: Onboarding Flow

### Architecture: Client-Side State with Route Guards

The onboarding flow uses **Zustand with localStorage persistence** for state management, combined with **pathname-based progress** in the UI and **route guards** for protection.

### localStorage State Structure

Key: `receptionalx-onboarding`

```json
{
  "businessName": "string",
  "businessType": "string",
  "address": "string",
  "phone": "string",
  "website": "string | null",
  "services": [],
  "openingHours": {},
  "greeting": "string",
  "voiceId": "string",
  "googleCalendarConnected": false,
  "googleCalendarToken": null,
  "faqs": [],
  "twilioPhoneNumber": "string | null",
  "termsAccepted": false,
  "privacyAccepted": false,
  "currentStep": 1,
  "completedSteps": [],
  "skippedSteps": []
}
```

### Step Definitions (layout.tsx)

```typescript
const STEPS = [
  { path: '/onboarding/business-search', label: 'Find Business', number: 1 },
  { path: '/onboarding/review-info', label: 'Review Info', number: 2 },
  { path: '/onboarding/ai-greeting', label: 'AI Greeting', number: 3 },
  { path: '/onboarding/calendar-connect', label: 'Calendar', number: 4, optional: true },
  { path: '/onboarding/faq-editor', label: 'FAQs', number: 5, optional: true },
  { path: '/onboarding/phone-setup', label: 'Phone Setup', number: 6 },
  { path: '/onboarding/conditions', label: 'Terms', number: 7 },
  { path: '/onboarding/complete', label: 'Complete', number: 8 },
];
```

### Route Guard Logic (OnboardingGuard.tsx)

Required steps before accessing each step:

| Step | Required Prerequisites |
|------|----------------------|
| 1 - Business Search | None |
| 2 - Review Info | Step 1 |
| 3 - AI Greeting | Steps 1, 2 |
| 4 - Calendar | Steps 1, 2, 3 |
| 5 - FAQs | Steps 1, 2, 3 (can skip 4) |
| 6 - Phone Setup | Steps 1, 2, 3 (can skip 4, 5) |
| 7 - Conditions | Steps 1, 2, 3, 6 |
| 8 - Complete | Steps 1, 2, 3, 6, 7 |

### Hydration Race Condition Fix

**Problem:** On the `/complete` page, `useEffect` would fire before Zustand hydrated from localStorage, causing empty data to be POSTed to the API.

**Solution:**

```typescript
// onboarding-store.ts
onRehydrateStorage: () => (state) => {
  state?.setHasHydrated(true);
},

// complete/page.tsx
useEffect(() => {
  if (hasHydrated && !saved && !saving) {
    handleSave();  // Only save after hydration confirmed
  }
}, [hasHydrated]);
```

---

## 4. Data Flow

### 4.1 Onboarding Data Flow (Browser → API → Database)

1. User inputs business info in React components
2. Zustand store persists to localStorage
3. User clicks "Continue" on final step
4. API validates and processes the request
5. Data is inserted/updated in merchants table
6. Response returned to browser
7. store.reset() clears localStorage
8. Redirect to /dashboard

### 4.2 Voice Call Flow (Twilio → Relay → Grok → Database)

1. Caller dials merchant's forwarded number
2. Twilio webhook → POST /api/twilio/incoming (Vercel)
3. Returns TwiML with WebSocket URL to relay
4. Twilio opens Media Stream to relay server
5. Relay fetches merchant config from Supabase
6. Relay opens WebSocket to Grok with tools in handshake
7. Audio flows bidirectionally (g711_ulaw @ 8kHz)
8. Grok sends tool_call → Relay executes → returns tool_result
9. Call ends → Relay POSTs transcript to Supabase

---

## 5. Key Database Tables

### 5.1 merchants Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| business_name | TEXT | Business name |
| business_type | TEXT | Type of business |
| address | TEXT | Business address |
| phone | TEXT | Business phone |
| website | TEXT | Website URL |
| place_id | TEXT | Google Places ID |
| greeting | TEXT | AI greeting message |
| voice_id | TEXT | Voice selection (default: 'alloy') |
| services | JSONB | Array of services |
| opening_hours | JSONB | Opening hours object |
| faqs | JSONB | Array of FAQs |
| twilio_phone_number | TEXT | Provisioned phone number |
| twilio_phone_sid | TEXT | Twilio phone SID |
| google_calendar_connected | BOOLEAN | Calendar integration status |
| google_calendar_token | JSONB | OAuth tokens |
| terms_accepted | BOOLEAN | Terms acceptance |
| privacy_accepted | BOOLEAN | Privacy acceptance |
| terms_accepted_at | TIMESTAMPTZ | When terms were accepted |
| subscription_status | TEXT | trial, active, past_due, canceled |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| current_period_end | TIMESTAMPTZ | Subscription period end |
| plan_type | TEXT | Subscription plan |
| onboarding_completed | BOOLEAN | Onboarding status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### 5.2 calls Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| merchant_id | UUID | Foreign key to merchants |
| caller_phone | TEXT | Caller's phone number |
| twilio_call_sid | TEXT | Twilio call SID |
| started_at | TIMESTAMPTZ | Call start time |
| ended_at | TIMESTAMPTZ | Call end time |
| duration_seconds | INTEGER | Call duration |
| transcript | TEXT | Full transcript |
| summary | TEXT | AI-generated summary |
| status | TEXT | in_progress, completed, failed |
| created_at | TIMESTAMPTZ | Creation timestamp |

### 5.3 appointments Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| merchant_id | UUID | Foreign key to merchants |
| customer_id | UUID | Foreign key to customers |
| call_id | UUID | Foreign key to calls |
| service | TEXT | Service name |
| start_time | TIMESTAMPTZ | Appointment start |
| end_time | TIMESTAMPTZ | Appointment end |
| google_event_id | TEXT | Google Calendar event ID |
| status | TEXT | confirmed, canceled, completed |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |

### 5.4 customers Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| merchant_id | UUID | Foreign key to merchants |
| phone | TEXT | Customer phone (unique per merchant) |
| name | TEXT | Customer name |
| email | TEXT | Customer email |
| first_call_at | TIMESTAMPTZ | First call timestamp |
| last_call_at | TIMESTAMPTZ | Last call timestamp |
| total_calls | INTEGER | Total call count |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## 6. Recent QA Fixes Applied

| Issue | Fix Location | Description |
|-------|--------------|-------------|
| Hydration Race | onboarding-store.ts, complete/page.tsx | Added hasHydrated flag; auto-save waits for hydration |
| Missing Route Guards | OnboardingGuard.tsx, layout.tsx | Strict enforcement prevents URL-based step skipping |
| Skipped Steps Tracking | onboarding-store.ts | Separate skippedSteps[] array for analytics |
| Missing Conditions Step | conditions/page.tsx | New step 7 for Terms & Privacy acceptance |
| Step Numbering | All step pages, layout | Complete is now step 8, Conditions is step 7 |

---

## 7. Environment Variables Required

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Grok Voice API
GROK_API_KEY=xxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx

# Google
GOOGLE_PLACES_API_KEY=xxx
GOOGLE_OAUTH_CLIENT_ID=xxx
GOOGLE_OAUTH_CLIENT_SECRET=xxx

# Firecrawl
FIRECRAWL_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Relay
RELAY_URL=wss://receptionai-relay.fly.dev/media-stream
```

---

## 8. Commands

```bash
# Development
pnpm dev              # Start web + relay
pnpm build            # Build all packages

# Database
cd packages/supabase
npx supabase db push  # Apply migrations

# Deployment
# Web: Auto-deploys to Vercel from main branch
# Relay: fly deploy (from apps/relay)
```

---

## 9. Known Limitations / TODO

1. **Google Calendar OAuth** - App is unverified; currently uses allowed-emails list
2. **No cross-tab sync** - Zustand localStorage doesn't sync across browser tabs
3. **No step resumption** - If user closes browser mid-onboarding, they restart from localStorage state (could be incomplete)
4. **Error messages** - Generic "Failed to save" on complete page; could be more specific

---

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Repository:** https://github.com/stevemilton/receptionaix
