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
    /types            # Shared TypeScript interfaces
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
| **Audio Format** | Twilio sends `g711_ulaw` 8kHz → Relay converts to PCM16 24kHz for Grok |
| **Audio Conversion** | Implemented in `apps/relay/src/audio-utils.ts` |
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

### Current Phase: Post-Build — Security Hardening & Production Readiness

All 9 build phases are complete. See `docs/status.md` for the full issue backlog and `docs/handoff.md` for developer onboarding.

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
- [x] Claude extracts services/FAQs from markdown (using Anthropic API)
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

### Phase 6: Merchant Dashboard ✅ COMPLETE
- [x] Dashboard home with metrics (calls, appointments, messages, avg duration)
- [x] Calls list + detail with transcript
- [x] Appointments calendar view
- [x] Customers list
- [x] Knowledge base editor
- [x] Settings page
- [x] Usage page with billing period tracking
- [x] **Test:** Merchant can view calls, edit knowledge base

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

### Phase 9: Mobile App ✅ COMPLETE
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
- [ ] **Test:** App runs on iOS simulator + Android emulator

---

## ⚠️ Security Issues (Reviewed 2026-02-05)

**Full details in `docs/status.md`. Fix these before any production deployment.**

### CRITICAL — Must Fix Immediately

| Issue | File | Line(s) |
|-------|------|---------|
| Unprotected merchant impersonation — `?impersonate=` param not validated against admin role | `apps/web/src/app/admin/(dashboard)/merchants/[id]/page.tsx` | 241-251 |
| Relay falls back to unverified `customParameters` when HMAC fails | `apps/relay/src/media-stream-handler.ts` | 76-79 |
| `callerPhone` hardcoded to `''` in token verification | `apps/relay/src/server.ts` | 56 |

### HIGH — Fix Before Production

| Issue | File | Line(s) |
|-------|------|---------|
| Stripe webhook metadata not validated against user ownership | `apps/web/src/app/api/stripe/webhook/route.ts` | 81-129 |
| Grok WebSocket not closed on error (resource leak) | `apps/relay/src/grok-client.ts` | 74-79 |
| Twilio error handler doesn't close Grok connection | `apps/relay/src/media-stream-handler.ts` | 64-66 |
| Env var auth checks fail open if vars unset (`CRON_SECRET`, `RELAY_SERVICE_KEY`) | Multiple API routes | — |
| User input interpolated into Supabase `.or()` filter | `apps/web/src/app/admin/(dashboard)/merchants/page.tsx` | 37-39 |
| No input validation on multiple API routes (search, generate, checkout, onboarding) | Multiple | — |

### Coding Standards Debt

| Issue | Scope |
|-------|-------|
| `any` type casting in 10+ files to bypass Supabase types | Regenerate types with `pnpm db:types` |
| Dual type systems (`database.ts` vs `models.ts`) with inconsistent definitions | Unify in `packages/types` |
| No request timeouts on external fetch() calls | All packages using Firecrawl, Anthropic, Google APIs |
| No runtime validation on relay tool parameters | `apps/relay/src/tool-handlers.ts` — consider zod |
| Unsafe JSON parsing of Claude API response | `packages/knowledge/src/extractor.ts:126-150` |

---

## Known Gaps & TODOs

### Google Calendar Integration
- OAuth tokens are stored during onboarding
- `checkAvailability` currently returns **mock slots** (see `apps/relay/src/tool-handlers.ts:94`)
- TODO: Integrate with Google Calendar API for real availability

### Push Notification Backend
- Mobile app registers push tokens with Expo
- Tokens stored in `merchants.push_token`
- TODO: Backend service to send notifications via Expo Push API

### Mobile Testing & Deployment
- iOS simulator and Android emulator testing not completed
- `app.json` has placeholder EAS project ID
- No deeplink configuration for password reset flow
- RevenueCat subscription status not synced back to Supabase

### Production Hardening
- No test suite (test runner not configured)
- No rate limiting on cost-sensitive endpoints (Twilio provisioning, knowledge search)
- No CSRF protection on web state-changing routes
- Google Calendar OAuth tokens stored unencrypted in DB
- Admin dev bypass (`ADMIN_DEV_BYPASS=true`) must never reach production

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
3. **Returns TwiML:**
   ```xml
   <Response>
     <Connect>
       <Stream url="wss://receptionai-relay.fly.dev/media-stream">
         <Parameter name="merchantId" value="{merchant_id}" />
       </Stream>
     </Connect>
   </Response>
   ```
4. **Twilio opens WebSocket** to relay server (long-lived connection)
5. **Relay fetches merchant config** from Supabase (knowledge base, voice settings)
6. **Relay opens WebSocket to Grok** with `connection_init` (includes tools)
7. **Audio flows bidirectionally:** Twilio ↔ Relay ↔ Grok
8. **Grok sends `tool_call`** → Relay executes → returns `tool_result`
9. **Call ends** → Relay POSTs transcript to Supabase API
10. **Dashboard updates** via Supabase realtime subscription

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

The initial WebSocket message to Grok must include system prompt and tools:

```typescript
// packages/grok/client.ts

import { RECEPTION_TOOLS } from './tools';

export function createConnectionInit(merchant: Merchant, knowledgeBase: KnowledgeBase) {
  return {
    type: "connection_init",
    data: {
      model_id: "grok-voice-beta",
      voice: {
        id: "eve",  // British female voice
        speed: 1.0
      },
      input_audio_format: "g711_ulaw",
      output_audio_format: "g711_ulaw",
      turn_detection: {
        type: "server_vad"  // Server-side voice activity detection
      },
      instructions: buildSystemPrompt(merchant, knowledgeBase),
      tools: RECEPTION_TOOLS
    }
  };
}

function buildSystemPrompt(merchant: Merchant, kb: KnowledgeBase): string {
  return `You are a friendly, professional receptionist for ${merchant.business_name},
a ${merchant.business_type} in the UK.

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

### Web (Vercel)
- Auto-deploys from `main` branch
- Environment variables in Vercel dashboard
- URL: `https://receptionai.vercel.app` (or custom domain)

### Relay Server (Fly.io)
```bash
cd apps/relay
fly launch --name receptionai-relay
fly secrets set GROK_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx
fly deploy
```
- URL: `wss://receptionai-relay.fly.dev/media-stream`
- Scale: Start with 1 instance, auto-scale based on connections

### Database (Supabase)
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
NEXT_PUBLIC_APP_URL=https://receptionai.vercel.app
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
1. Twilio sends μ-law 8kHz, Grok expects PCM16 24kHz - conversion in `audio-utils.ts`
2. Tools go in the `session.update` message after connection
3. Relay handles tool execution, not Grok
4. Test with Twilio's test credentials first
5. Mock Grok client available for local development

### When Building UI:
1. Use components from `packages/ui`
2. Follow design system in PRD Section 8
3. Mobile-first (test at 375px width)

### When Picking Up This Project:
1. Read `docs/handoff.md` for orientation
2. Read `docs/status.md` for the current issue backlog
3. Fix critical security issues before any deployment

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
| `/api/twilio/incoming` | Incoming call webhook (returns TwiML) |
| `/api/twilio/provision` | Twilio number provisioning |
| `/api/google/auth` | Google OAuth initiation |
| `/api/google/callback` | Google OAuth callback |
| `/api/stripe/checkout` | Stripe payment sessions |
| `/api/stripe/webhook` | Subscription lifecycle |
| `/api/calls/post-complete` | Call completion notification |
| `/api/usage` | API usage tracking |
| `/api/master-kb/suggestions` | Master KB suggestions |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/relay/src/server.ts` | Fastify server with WebSocket + HMAC verification |
| `apps/relay/src/grok-client.ts` | Grok connection & session management |
| `apps/relay/src/media-stream-handler.ts` | Twilio bridge with audio conversion |
| `apps/relay/src/tool-handlers.ts` | Backend execution for 5 reception tools |
| `apps/relay/src/audio-utils.ts` | Audio codec conversion (μ-law ↔ PCM16) |
| `packages/knowledge/src/pipeline.ts` | KB generation orchestration |
| `packages/knowledge/src/extractor.ts` | Claude-based knowledge extraction |

---

**END OF CLAUDE.md**
