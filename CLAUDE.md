# ReceptionAI - CLAUDE.md

## Project Overview
ReceptionAI is a voice-first AI receptionist for UK SMEs using the **Grok Audio-to-Audio Realtime API**.
See `/docs/PRD.md` for full business requirements.

---

## Tech Stack & Architecture

| Layer | Technology | Hosting |
|-------|------------|---------|
| Frontend (Web) | Next.js 14 (App Router) | Vercel |
| Frontend (Mobile) | React Native + Expo | App Stores |
| Backend API | Next.js API Routes | Vercel |
| Voice Relay | Node.js WebSocket Server | Fly.io |
| Database | Supabase (PostgreSQL + RLS) | Supabase Cloud |
| Voice AI | Grok Realtime API (Beta) | xAI Cloud |
| Scraping | Firecrawl API | External Service |
| Payments | Stripe | Stripe Cloud |

---

## Directory Structure

```
/reception-ai
  /apps
    /web              # Next.js (Vercel) - Dashboard + API routes
    /relay            # Node.js WebSocket server (Fly.io) - Fastify + WS
    /mobile           # React Native (Expo)
  /packages
    /supabase         # Migrations, types, RLS policies
    /ui               # Shared UI components (Button, Card, etc.)
    /grok             # Grok client, types, tool definitions
    /knowledge        # Knowledge base generation (Firecrawl + Places API)
    /types            # Database types + row type aliases (MerchantRow, CallRow, etc.)
    /shared           # Shared utilities (API usage tracking)
  /docs
    /PRD.md           # Product Requirements Document
    /status.md        # Current issue backlog & project status
    /handoff.md       # Developer handoff guide
  CLAUDE.md           # This file
  .env.example        # Environment template
```

---

## ⚠️ Critical Build Rules (The "Vibe-Coding" Guardrails)

### 1. Voice Architecture (Grok Realtime)

| Rule | Details |
|------|---------|
| **Protocol** | WebSockets only: `wss://api.x.ai/v1/realtime` |
| **Audio Format** | Twilio sends `audio/pcmu` (μ-law 8kHz) → Grok accepts `audio/pcmu` natively → **No conversion needed** |
| **API Format** | Uses xAI Grok Voice Agent API format (NOT OpenAI Realtime API). See [docs](https://docs.x.ai/developers/model-capabilities/audio/voice) |
| **Session Config** | Nested `audio.input.format` / `audio.output.format` objects with `type` and `rate` |
| **Voice Names** | xAI voices: `Ara`, `Rex`, `Sal`, `Eve`, `Leo` (NOT OpenAI voices like alloy/echo) |
| **Event Names** | `response.output_audio.delta`, `response.output_audio_transcript.delta` (NOT `response.audio.delta`) |
| **No Vercel WebSockets** | Do NOT host relay on Vercel. Use `apps/relay` on Fly.io |
| **Tools in Handshake** | Tool definitions sent in `session.update` message after connection |

### 2. Knowledge Base (Scraping)

| Rule | Details |
|------|---------|
| **Prohibited** | Do NOT install `puppeteer`, `playwright`, or `chrome-aws-lambda` |
| **Use Instead** | Firecrawl API (`fetch()` call to external service) |
| **Mock First** | Build `MockScraper` returning fixed JSON before real API |

### 3. Google Calendar & Auth

| Rule | Details |
|------|---------|
| **Test Mode** | Assume Google App is unverified. Use hardcoded "Allowed Emails" list |
| **Mock First** | Build `CalendarService` interface with mock implementation first |

### 4. General Coding Standards

| Rule | Details |
|------|---------|
| **TypeScript** | Strict mode. No `any`. Define shared interfaces in `/packages/types` |
| **Environment** | Access via `process.env`. Never hardcode secrets. |
| **Components** | Use `/packages/ui` components. Don't duplicate. |

---

## Build Sequence

**Build phases in this exact order. Do not skip ahead.**

```
Phase 1: Foundation ──→ Phase 2: UI ──→ Phase 3: Knowledge Base ──→
Phase 4: Onboarding ──→ Phase 5: Voice Agent ──→ Phase 6: Dashboard ──→
Phase 7: Admin ──→ Phase 8: Billing ──→ Phase 9: Mobile
```

### Current Phase: MVP Live — Voice Pipeline Working

All 9 build phases complete. Security hardening complete (9 batches). Grok Voice API integration rewritten to use correct xAI format. Relay deployed to Fly.io (LHR). Web deployed to Vercel. **E2E voice pipeline confirmed working** — first successful call completed 2026-02-06. **Dashboard redesigned & mobile-responsive** — post-call processing pipeline, AI summaries, shared components, Messages page, hamburger nav, responsive layouts across all pages. **iOS app redesigned** — lighter typography (Light/Regular weights), dark-green gradient backgrounds (#344532→white, 64-band smooth interpolation), white header text on dark areas, sign-out from onboarding. **TestFlight build #5 completed** (2026-02-07).

**Pivot:** The project is now mobile-first MVP. Stripe is deferred. The Grok-Twilio voice pipeline is working end-to-end.

---

## Phase Completion Checklist

### Phase 1: Foundation ✅ COMPLETE
- [x] Monorepo initialized with pnpm workspaces
- [x] `apps/web` created (Next.js 14)
- [x] `apps/relay` created (Node.js with Fastify + ws)
- [x] `packages/supabase` has migrations for all tables (8 migration files)
- [x] Supabase Auth working (email + Google OAuth)
- [x] Protected routes redirect to login
- [x] RLS policies for multi-tenant data isolation
- [x] **Test:** `pnpm dev` runs without errors

### Phase 2: UI Components ✅ COMPLETE
- [x] Button (primary, secondary, destructive, ghost, outline)
- [x] Card, MetricCard, Input, Select, Badge, Avatar, Modal, Toast, Table
- [x] Design system colors applied (full palette for primary, success, warning, error)
- [x] **Test:** `pnpm build` passes

### Phase 3: Knowledge Base ✅ COMPLETE
- [x] `MockScraper` returns fixed JSON (hair salon sample data)
- [x] Google Places API search working (New Places API)
- [x] Firecrawl integration working
- [x] Grok extracts services/FAQs from markdown (using xAI text API)
- [x] Master KB database for cross-merchant learning
- [x] **Test:** Enter business name → get structured knowledge base

### Phase 4: Merchant Onboarding ✅ COMPLETE
- [x] All onboarding pages built:
  - `/onboarding/business-search` - Google Places search or manual entry
  - `/onboarding/review-info` - Edit business info
  - `/onboarding/calendar-connect` - Google Calendar OAuth
  - `/onboarding/phone-setup` - Twilio number provisioning
  - `/onboarding/faq-editor` - Custom FAQ editing
  - `/onboarding/ai-greeting` - Custom greeting setup
  - `/onboarding/conditions` - Terms & conditions
  - `/onboarding/complete` - Completion page
- [x] Google Calendar OAuth flow working (tokens stored)
- [x] Twilio number provisioning working
- [x] Knowledge base saved to merchant record
- [x] Onboarding state managed with Zustand
- [x] **Test:** New user completes onboarding, has Twilio number

### Phase 5: Voice Agent + Relay ✅ COMPLETE
- [x] `packages/grok` exports tool definitions (5 tools)
- [x] Relay server handles Twilio Media Stream WebSocket
- [x] Relay connects to Grok with tools in session.update
- [x] Audio conversion: Twilio μ-law 8kHz ↔ Grok PCM16 24kHz
- [x] Tool calls executed mid-stream:
  - `lookupCustomer` - Query by phone
  - `checkAvailability` - Return slots (mock Google Calendar)
  - `createBooking` - Create appointment in Supabase
  - `cancelBooking` - Cancel appointment
  - `takeMessage` - Record message for owner
- [x] Transcript saved to Supabase on call end
- [x] HMAC-SHA256 token verification for security
- [x] Mock Grok client for development/testing
- [x] **Test:** Call Twilio number → Grok responds → booking created → transcript in DB

### Phase 6: Merchant Dashboard ✅ REDESIGNED
- [x] Dashboard home with metrics (calls, appointments, messages, avg duration)
- [x] Calls list + detail with transcript
- [x] Appointments calendar view
- [x] Customers list
- [x] Knowledge base editor
- [x] Settings page
- [x] Usage page with billing period tracking
- [x] **Redesign (2026-02-06):**
  - [x] Post-call processing pipeline (`apps/relay/src/post-call.ts`): auto-create customers, AI summaries via Grok text API, message-to-call linking
  - [x] Shared component library (`_components/shared.tsx`): formatters, badges, icons, layout components
  - [x] Overview page: 4 metric cards, recent calls with AI summaries, upcoming appointments, unread messages
  - [x] Call detail: 3-column layout with sidebar (summary, details, customer, linked messages/appointments) + chat-bubble transcript
  - [x] Dedicated Messages page with All/Unread/Read filters, mark-as-read, link to source calls
  - [x] Customers page with card-based layout showing call + appointment counts
  - [x] Appointments page split into Upcoming (grouped by date) and Past & Cancelled
  - [x] 3 new API routes: `/api/messages` (GET), `/api/messages/:id/read` (PUT), `/api/messages/mark-all-read` (PUT)
  - [x] Navigation updated: Messages added, Usage/Billing removed from primary nav
  - [x] **Mobile-responsive (2026-02-06):**
    - [x] Extracted layout into server + client split (`layout.tsx` + `dashboard-shell.tsx`)
    - [x] Hamburger menu on mobile with slide-over nav panel + backdrop overlay
    - [x] Responsive padding (`p-4 sm:p-6 lg:p-8`), text sizes, grid gaps across all pages
    - [x] Calls page: dual layout — card-based on mobile, table on desktop
    - [x] Settings: voice grid `grid-cols-1 sm:grid-cols-2`
    - [x] Knowledge Base: service form and opening hours responsive
    - [x] Hidden decorative elements on mobile (avatar circles, dividers)
- [x] **Test:** Merchant can view calls with AI summaries, manage messages, edit knowledge base

### Phase 7: Enterprise Admin ✅ COMPLETE
- [x] Admin authentication (separate from merchant)
- [x] Merchants list with filters
- [x] Merchant detail with impersonation
- [x] Revenue dashboard
- [x] System health monitor
- [x] Dev mode bypass for testing
- [x] **Test:** Admin can view all merchants, impersonate

### Phase 8: Billing ✅ COMPLETE
- [x] Stripe checkout flow
- [x] Webhook handlers (subscription events)
- [x] Billing page with portal link
- [x] Trial expiration enforcement
- [x] Three tiers: Starter (80 calls), Professional (400 calls), Enterprise (unlimited)
- [x] Usage tracking with RPC function `get_merchant_call_count`
- [x] RevenueCat integration for mobile IAP
- [x] **Test:** Merchant can subscribe, webhooks update plan

### Phase 9: Mobile App ✅ REDESIGNED + BUILD #5 COMPLETE
- [x] Expo project setup
- [x] Navigation structure (Auth, Main, Root navigators)
- [x] Auth context with Supabase integration
- [x] Secure token storage (expo-secure-store)
- [x] Push notifications setup (expo-notifications)
- [x] RevenueCat subscription integration
- [x] Dashboard home with real Supabase data (calls, appointments, messages stats)
- [x] Calls list with transcript detail modal
- [x] Settings with notification toggle (persisted to DB)
- [x] Support links (Help, Contact, Terms, Privacy)
- [x] Subscription management via RevenueCat
- [x] EAS project created (`@stevemilton/receptionai`, ID: `480f5c1a-a0ba-4bd2-b98b-9dd8926a90f3`)
- [x] `eas.json` configured (development/preview/production profiles)
- [x] TypeScript errors fixed (Supabase type casts, React Navigation 7 compat)
- [x] iOS production build #4 submitted to TestFlight
- [x] **UI Redesign (2026-02-07):**
  - [x] Centralized design tokens in `theme.ts` (typography, gradient, colors)
  - [x] Lighter typography: Light (300) / Regular (400) weights, CTA buttons Medium (500)
  - [x] Dark-green gradient backgrounds: `#344532` → white, eased 64-band interpolation
  - [x] `ScreenBackground` component — pure View bands, no native module (works in Expo Go)
  - [x] White header text on dark gradient areas (dashboard, auth, onboarding)
  - [x] Sign-out link on onboarding Step 1 with confirmation dialog
  - [x] All screens wrapped in gradient: 8 onboarding, 5 settings sub-screens, dashboard, calls, login, signup
- [x] iOS build #5 completed with redesigned UI (`4084dc98`)
- [ ] Submit build #5 to TestFlight (`eas submit --platform ios`)
- [ ] **Test:** TestFlight beta testing on physical iOS device
- [ ] Android build not yet attempted

---

## Security Hardening (Completed 2026-02-06)

Nine hardening batches have been completed. **All critical and high-priority security issues are resolved.** See `docs/status.md` for the full checklist with commit references.

### What's Been Fixed
- Merchant impersonation privilege escalation
- Relay HMAC token bypass and callerPhone attribution
- WebSocket resource leaks (Grok + Twilio cleanup)
- SQL injection in admin merchant search
- Stripe webhook metadata validation
- Env var fail-closed validation on all routes
- Input validation on all API routes
- OAuth token encryption at rest
- CSRF origin validation on cookie-auth routes
- Rate limiting on cost-sensitive endpoints
- Request timeouts on all external API calls
- Runtime param validation on relay tool handlers
- Type system regenerated from live DB; column mismatches fixed
- `@supabase/ssr` upgraded to 0.8.0 for type compatibility

### Remaining Technical Debt

| Issue | Scope |
|-------|-------|
| `as any` casts (~15 justified) | Queries to tables not in generated types (`admin_users`, `messages`, `call_errors`, `api_usage_daily`, `notification_log`). The `messages` table has the most casts across dashboard, API routes, and call detail page. |
| Unapplied migration 007 | Run `pnpm db:push` to add `billing_period_start` and `stripe_overage_item_id` columns to live DB |
| Unapplied migration 011 | Run `pnpm db:push` to add missing RLS policy on `knowledge_bases` table |

---

## Known Gaps & TODOs

### Deployment ✅ Complete
- **Relay (Fly.io):** ✅ Deployed and healthy at `https://receptionai-relay.fly.dev` (LHR region) — includes post-call processing
- **Web (Vercel):** ✅ Deployed at `https://receptionaix-relay.vercel.app` — includes redesigned dashboard
- **E2E Voice Pipeline:** ✅ Working — first call completed 2026-02-06
- **Twilio numbers:** `+447446469600` (original), `+447427814067` (The Perse School)
- **Twilio webhook:** Voice webhook → `https://receptionaix-relay.vercel.app/api/twilio/incoming`
- **Mobile (EAS):** ✅ iOS build #5 completed with redesigned UI (gradient + typography)
  - EAS project: `@stevemilton/receptionai` (ID: `480f5c1a-a0ba-4bd2-b98b-9dd8926a90f3`)
  - Bundle ID: `com.receptionai.app`
  - Apple Team: `STEPHEN CHRISTOPHER MILTON` (Team ID: `6FK49H335R`)
  - Apple ID: `greasylaketwitter@gmail.com`
  - Distribution cert: `QRRU3Z9PA7` (shared with UTx — safe)
  - Build #5: `4084dc98-783e-435a-9b1e-9d6d3879b582` — needs `eas submit --platform ios`
  - Build command: `eas build --platform ios --profile production`
- **Google redirect URI:** ✅ Updated to `https://receptionaix-relay.vercel.app/api/google/callback` (needs updating in Google Cloud Console too)

### Twilio Signature Verification (Disabled)
- Temporarily disabled because `request.url` on Vercel differs from the public URL Twilio signs against
- TODO: Reconstruct verification URL from `NEXT_PUBLIC_APP_URL` + request path

### Google Calendar Integration
- OAuth tokens are stored during onboarding
- `checkAvailability` currently returns **mock slots** (see `apps/relay/src/tool-handlers.ts:94`)
- TODO: Integrate with Google Calendar API for real availability

### Push Notification Backend
- Mobile app registers push tokens with Expo
- Tokens stored in `merchants.push_token`
- TODO: Backend service to send notifications via Expo Push API

### Mobile Testing & Deployment
- iOS build #5 completed with redesigned UI — needs `eas submit --platform ios`
- Previous build (#4) already in TestFlight with older UI
- Android build not yet attempted
- No deeplink configuration for password reset flow
- RevenueCat API keys not configured (need `EXPO_PUBLIC_REVENUECAT_IOS_KEY` in `apps/mobile/.env`)
- RevenueCat subscription status not synced back to Supabase
- **macOS casing workaround:** Use `EAS_BUILD_DISABLE_CASING_CHECK=1` with eas build commands

### Production Readiness
- No test suite (test runner not configured)
- Admin dev bypass (`ADMIN_DEV_BYPASS=true`) must never reach production
- Migrations 007 and 011 must be applied to live DB (`pnpm db:push`)
- Stripe billing deferred (keys commented out) — focus is mobile-first MVP

---

## Call Flow (Reference)

```
┌──────────┐     ┌──────────┐     ┌─────────────────┐     ┌────────────┐
│  Caller  │────▶│  Twilio  │────▶│  Relay Server   │────▶│   Grok     │
│  Phone   │◀────│  Media   │◀────│  (Fly.io)       │◀────│   Voice    │
└──────────┘     │  Stream  │     │                 │     │   API      │
                 └──────────┘     │                 │     └────────────┘
                                  │  Tool Handlers  │
                                  │       │         │
                                  │       ▼         │
                                  │  ┌──────────┐   │
                                  │  │ Supabase │   │
                                  │  │ Google   │   │
                                  │  │ Calendar │   │
                                  │  └──────────┘   │
                                  └─────────────────┘
```

### Step-by-Step:

1. **Caller dials** merchant's forwarded number → hits Twilio
2. **Twilio webhook** `POST /api/twilio/incoming` (Next.js on Vercel)
3. **Returns TwiML** (auth params as `<Parameter>` elements — Twilio strips query params from `<Stream>` URLs):
   ```xml
   <Response>
     <Connect>
       <Stream url="wss://receptionai-relay.fly.dev/media-stream">
         <Parameter name="merchantId" value="{merchant_id}" />
         <Parameter name="callerPhone" value="{caller_phone}" />
         <Parameter name="token" value="{hmac_token}" />
         <Parameter name="ts" value="{timestamp}" />
       </Stream>
     </Connect>
   </Response>
   ```
4. **Twilio opens WebSocket** to relay server (long-lived connection)
5. **Relay receives `start` event** with `customParameters` containing auth params
6. **Relay verifies HMAC-SHA256 token** (60-second expiry) from `customParameters`
7. **Relay fetches merchant config** from Supabase (knowledge base, voice settings)
8. **Relay opens WebSocket to Grok** with `session.update` (includes tools, system prompt, voice config)
9. **Audio flows bidirectionally:** Twilio ↔ Relay ↔ Grok (μ-law 8kHz passthrough, no conversion)
10. **Grok sends `tool_call`** → Relay executes → returns `tool_result`
11. **Call ends** → Relay saves transcript to Supabase, notifies web app for overage tracking
12. **Post-call processing** (fire-and-forget):
    - `ensureCustomer()` — creates/updates customer record from caller phone
    - `linkCallToCustomer()` — sets `customer_id` on the call record
    - `generateAndSaveSummary()` — Grok text API (`grok-3-mini-fast`) generates 2-3 sentence summary
    - `linkRecentMessages()` — sets `call_id` on messages created during this call
13. **Dashboard updates** via Supabase realtime subscription

---

## Tool Definitions (packages/grok/tools.ts)

Export these for inclusion in the Grok handshake:

```typescript
// packages/grok/tools.ts

export const RECEPTION_TOOLS = [
  {
    name: "lookupCustomer",
    description: "Find an existing customer by their phone number",
    parameters: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description: "Phone number in E.164 format (e.g., +447700900123)"
        }
      },
      required: ["phone"]
    }
  },
  {
    name: "checkAvailability",
    description: "Get available appointment slots for a service on a specific date",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format"
        },
        service: {
          type: "string",
          description: "Name of the service (e.g., 'Dental Checkup', 'Haircut')"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "createBooking",
    description: "Book an appointment for a customer",
    parameters: {
      type: "object",
      properties: {
        customerPhone: {
          type: "string",
          description: "Customer phone number"
        },
        customerName: {
          type: "string",
          description: "Customer name (for new customers)"
        },
        service: {
          type: "string",
          description: "Service to book"
        },
        dateTime: {
          type: "string",
          description: "Appointment start time in ISO 8601 format"
        }
      },
      required: ["customerPhone", "service", "dateTime"]
    }
  },
  {
    name: "cancelBooking",
    description: "Cancel an existing appointment",
    parameters: {
      type: "object",
      properties: {
        customerPhone: {
          type: "string",
          description: "Phone number to find the booking"
        },
        appointmentDate: {
          type: "string",
          description: "Date of the appointment to cancel (YYYY-MM-DD)"
        }
      },
      required: ["customerPhone"]
    }
  },
  {
    name: "takeMessage",
    description: "Record a message for the business owner",
    parameters: {
      type: "object",
      properties: {
        callerName: {
          type: "string",
          description: "Name of the caller"
        },
        callerPhone: {
          type: "string",
          description: "Phone number of the caller"
        },
        message: {
          type: "string",
          description: "The message content"
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How urgent is the message"
        }
      },
      required: ["callerPhone", "message"]
    }
  }
] as const;

export type ToolName = typeof RECEPTION_TOOLS[number]["name"];
```

---

## Grok Voice Handshake

The initial WebSocket message to Grok uses the xAI Voice Agent API format. **Do NOT use OpenAI Realtime API format.**

Reference: https://docs.x.ai/developers/model-capabilities/audio/voice

```typescript
// apps/relay/src/grok-client.ts — createSessionUpdate()

function createSessionUpdate(config: MerchantConfig) {
  const tools = RECEPTION_TOOLS.map(tool => ({
    type: 'function' as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));

  // xAI voice names (NOT OpenAI voices)
  const voiceMap: Record<string, string> = {
    'ara': 'Ara', 'rex': 'Rex', 'sal': 'Sal', 'eve': 'Eve', 'leo': 'Leo',
  };
  const voice = voiceMap[config.voiceId?.toLowerCase() || 'ara'] || 'Ara';

  return {
    type: 'session.update',
    session: {
      instructions: buildSystemPrompt(config),
      voice,
      turn_detection: { type: 'server_vad' },
      audio: {
        input: { format: { type: 'audio/pcmu', rate: 8000 } },   // μ-law from Twilio
        output: { format: { type: 'audio/pcmu', rate: 8000 } },  // μ-law back to Twilio
      },
      tools,
    },
  };
}

function buildSystemPrompt(config: MerchantConfig): string {
  return `You are a friendly, professional receptionist for ${config.businessName},
a ${config.businessType} in the UK.

YOUR CAPABILITIES:
- Book appointments by checking calendar availability
- Cancel or reschedule existing appointments
- Take messages for the business owner
- Answer questions about services and opening hours

BUSINESS INFORMATION:
- Name: ${merchant.business_name}
- Type: ${merchant.business_type}
- Address: ${kb.google_maps_data?.address || 'Not specified'}
- Opening Hours: ${JSON.stringify(kb.opening_hours)}
- Services: ${JSON.stringify(kb.services)}

FREQUENTLY ASKED QUESTIONS:
${kb.faqs?.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

CONVERSATION STYLE:
- Use British English
- Be warm but professional
- Use contractions naturally (I'll, you're, we've)
- Always confirm details before booking
- If unsure, offer to take a message`;
}
```

---

## Error Handling Patterns

### Grok WebSocket Disconnect
```typescript
grokWs.on('close', (code, reason) => {
  console.error(`Grok disconnected: ${code} - ${reason}`);

  // Notify caller gracefully
  sendToTwilio({
    type: 'output_audio',
    data: generateGoodbyeAudio("I'm sorry, I'm having technical difficulties. Please try again.")
  });

  // Log for admin dashboard
  await supabase.from('call_errors').insert({
    call_id: currentCallId,
    error_type: 'grok_disconnect',
    error_code: code,
    error_message: reason
  });

  // End Twilio stream
  twilioWs.close();
});
```

### Firecrawl Failure
```typescript
async function scrapeWebsite(url: string): Promise<WebsiteContent | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, formats: ['markdown'] })
    });

    if (!response.ok) throw new Error(`Firecrawl error: ${response.status}`);
    return await response.json();

  } catch (error) {
    console.error('Firecrawl failed:', error);
    // Don't block onboarding - return null and let user enter manually
    return null;
  }
}
```

### Tool Execution Failure
```typescript
async function executeToolCall(toolName: string, params: any): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'createBooking':
        return await createBooking(params);
      // ... other tools
    }
  } catch (error) {
    // Return error to Grok so it can inform the caller
    return {
      success: false,
      error: `I wasn't able to complete that action. ${error.message}`
    };
  }
}
```

---

## Deployment

### Web (Vercel) — ✅ Deployed
- **URL:** `https://receptionaix-relay.vercel.app`
- **Project:** `receptionaix-relay` on Vercel, connected to GitHub repo `stevemilton/receptionaix`
- **Build:** `vercel.json` in repo root runs types → shared → web builds
- **Env vars:** Set in Vercel dashboard (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.)

### Relay Server (Fly.io) — ✅ Deployed
- **URL:** `wss://receptionai-relay.fly.dev/media-stream`
- **Health:** `https://receptionai-relay.fly.dev/health`
- **Region:** LHR (London)
- **Docker:** Multi-stage build via `Dockerfile.relay` in repo root
- **Secrets set:** `GROK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RELAY_SERVICE_KEY`
```bash
# Deploy
fly deploy --config fly.toml --dockerfile Dockerfile.relay --no-cache --app receptionai-relay

# Check status
fly status --app receptionai-relay
fly logs --app receptionai-relay

# Update secrets
fly secrets set KEY=value --app receptionai-relay
```
- **Note:** Dockerfile creates symlinks for workspace packages (`@receptionalx/grok`, `shared`, `types`) in the runner stage because Docker COPY doesn't preserve pnpm symlinks

### Database (Supabase)
- **Project:** `tvcdqmmxjntxkkmbguwc.supabase.co`
```bash
cd packages/supabase
npx supabase db push
npx supabase gen types typescript --project-id xxx > types.ts
```

---

## Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Grok Voice API (xAI)
GROK_API_KEY=xxx
GROK_REALTIME_URL=wss://api.x.ai/v1/realtime

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx

# Google APIs
GOOGLE_PLACES_API_KEY=xxx
GOOGLE_OAUTH_CLIENT_ID=xxx
GOOGLE_OAUTH_CLIENT_SECRET=xxx

# Firecrawl (Scraping)
FIRECRAWL_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Relay Server
RELAY_URL=wss://receptionai-relay.fly.dev/media-stream

# App
NEXT_PUBLIC_APP_URL=https://receptionaix-relay.vercel.app
```

---

## Build Commands

```bash
# Development
pnpm dev              # Start web + relay in parallel
pnpm dev:web          # Start web only
pnpm dev:relay        # Start relay only

# Database
pnpm db:push          # Push migrations to Supabase
pnpm db:types         # Generate TypeScript types
pnpm db:reset         # Reset database (dev only)

# Build
pnpm build            # Build all packages
pnpm build:web        # Build web only
pnpm build:relay      # Build relay only

# Test
pnpm test             # Run all tests
pnpm test:voice       # Test voice integration (requires Twilio test credentials)

# Deploy
pnpm deploy:web       # Deploy to Vercel
pnpm deploy:relay     # Deploy to Fly.io
```

---

## Quick Reference

### When Building Voice Features:
1. Twilio sends μ-law 8kHz (`audio/pcmu`), Grok accepts μ-law natively — **no conversion needed**
2. Tools go in the `session.update` message after connection (xAI format, NOT OpenAI)
3. Relay handles tool execution, not Grok
4. Test with Twilio's test credentials first
5. Mock Grok client available for local development
6. xAI voice API docs: https://docs.x.ai/developers/model-capabilities/audio/voice

### When Building UI:
1. Use components from `packages/ui`
2. Follow design system in PRD Section 8
3. Mobile-first (test at 375px width)

### When Building Mobile:
1. EAS project: `@stevemilton/receptionai` (ID: `480f5c1a-a0ba-4bd2-b98b-9dd8926a90f3`)
2. Apple ID: `greasylaketwitter@gmail.com`, Team ID: `6FK49H335R`
3. Distribution cert `QRRU3Z9PA7` is shared with UTx app — this is safe
4. Always use `EAS_BUILD_DISABLE_CASING_CHECK=1` with eas build (macOS casing issue)
5. iOS credentials are cached — future builds won't need Apple login
6. RevenueCat API keys not yet configured — subscriptions won't work until set up

### When Picking Up This Project:
1. Read `docs/handoff.md` for orientation
2. Read `docs/status.md` for remaining issues
3. Relay is live at `https://receptionai-relay.fly.dev` — check `/health`
4. Web is live at `https://receptionaix-relay.vercel.app`
5. E2E voice pipeline is working — call `+447427814067` to test
6. Twilio webhook: voice calls → `https://receptionaix-relay.vercel.app/api/twilio/incoming`
7. iOS build #5 completed (redesigned UI) — needs `eas submit --platform ios` to push to TestFlight
8. Mobile design tokens in `apps/mobile/src/theme.ts`, gradient in `ScreenBackground.tsx`
9. EAS dashboard: `https://expo.dev/accounts/stevemilton/projects/receptionai`
10. Twilio signature verification is temporarily disabled — see status.md

### When Stuck:
1. Check PRD for requirements
2. Check this file for technical constraints
3. Mock external services to unblock development
4. Log errors to Supabase for debugging

---

## API Routes Reference

| Route | Purpose |
|-------|---------|
| `/api/knowledge/search` | Google Places business search |
| `/api/knowledge/generate` | Knowledge base generation pipeline |
| `/api/knowledge/kb` | Knowledge base CRUD (admin client, bypasses missing RLS) |
| `/api/twilio/incoming` | Incoming call webhook (returns TwiML) |
| `/api/twilio/provision` | Twilio number provisioning |
| `/api/google/auth` | Google OAuth initiation |
| `/api/google/callback` | Google OAuth callback |
| `/api/stripe/checkout` | Stripe payment sessions |
| `/api/stripe/webhook` | Subscription lifecycle |
| `/api/calls/post-complete` | Call completion notification |
| `/api/messages` | GET all messages for authenticated merchant |
| `/api/messages/[id]/read` | PUT mark single message as read |
| `/api/messages/mark-all-read` | PUT mark all messages as read |
| `/api/usage` | API usage tracking |
| `/api/master-kb/suggestions` | Master KB suggestions |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/relay/src/server.ts` | Fastify server with WebSocket (accepts connection, auth in start event) |
| `apps/relay/src/auth.ts` | HMAC-SHA256 token verification from customParameters |
| `apps/relay/src/grok-client.ts` | Grok WebSocket management, xAI Voice Agent session config |
| `apps/relay/src/media-stream-handler.ts` | Twilio ↔ Grok bridge (μ-law passthrough, no conversion) |
| `apps/relay/src/tool-handlers.ts` | Backend execution for 5 reception tools |
| `apps/relay/src/post-call.ts` | Post-call processing: customer creation, AI summaries, message linking |
| `apps/relay/src/audio-utils.ts` | Audio codec utilities (legacy, conversion no longer needed) |
| `apps/web/src/app/dashboard/_components/dashboard-shell.tsx` | Client component: mobile hamburger nav, responsive dashboard shell |
| `apps/web/src/app/dashboard/_components/shared.tsx` | Shared dashboard formatters, badges, icons, layout components |
| `apps/web/src/app/dashboard/messages/page.tsx` | Messages page with filters and mark-as-read |
| `apps/web/src/app/api/messages/route.ts` | Messages API (GET all for merchant) |
| `apps/web/src/lib/supabase/admin.ts` | Service-role Supabase client (typed with Database) |
| `apps/web/src/lib/supabase/api-auth.ts` | Dual auth (cookie + Bearer token) for web/mobile |
| `apps/web/src/lib/csrf.ts` | CSRF origin validation utility |
| `packages/knowledge/src/pipeline.ts` | KB generation orchestration |
| `packages/knowledge/src/extractor.ts` | Grok-based knowledge extraction (xAI text API) |
| `packages/types/src/index.ts` | Row type aliases (MerchantRow, CallRow, etc.) |
| `packages/types/src/database.ts` | Supabase table types (generated via `supabase gen types typescript`) |
| `apps/mobile/app.json` | Expo config (EAS project ID, bundle ID, permissions) |
| `apps/mobile/eas.json` | EAS build profiles (development, preview, production) |
| `apps/mobile/src/lib/AuthContext.tsx` | Mobile auth context (Supabase + RevenueCat init) |
| `apps/mobile/src/navigation/RootNavigator.tsx` | Conditional routing: auth → onboarding → main |
| `apps/mobile/src/theme.ts` | Central design tokens: typography weights, gradient colors, color palette |
| `apps/mobile/src/components/ScreenBackground.tsx` | 64-band gradient background (pure Views, Expo Go compatible) |

---

**END OF CLAUDE.md**
