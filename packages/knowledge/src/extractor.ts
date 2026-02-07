import type { ExtractedKnowledge, ExtractedService, ExtractedFAQ } from './types';

const EXTRACTION_PROMPT = `You are an AI that extracts structured business information from website content to help build a knowledge base for an AI receptionist.

Analyze the following website content and extract information that would help an AI answer phone calls about this business.

IMPORTANT: Adapt your extraction based on the business type:
- For RESTAURANTS/CAFES/BAKERIES: Extract popular menu items, specialties, cuisine type, dietary options as "services"
- For SALONS/SPAS: Extract treatments and services with duration and price
- For RETAIL SHOPS: Extract product categories, popular items, brands stocked
- For PROFESSIONAL SERVICES: Extract service offerings, consultation types
- For ANY business: Extract what they offer that customers commonly ask about

Extract:
1. A brief business description (1-2 sentences)
2. What the business offers (call these "services" even if they're products/menu items):
   - name: The item/service name
   - description: Brief description
   - duration: Only if it's a timed service (use null for products/food)
   - price: Only if clearly stated (use null if not mentioned)
3. Common FAQs - Think about what callers would ask:
   - "Do you have parking?"
   - "Do you take reservations/bookings?"
   - "Are you wheelchair accessible?"
   - "Do you cater for dietary requirements?"
   - Any specific FAQs mentioned on the website
4. Opening hours if mentioned

Return ONLY valid JSON in this exact format (no markdown, no explanation). Use null for unknown values, NEVER use the word undefined:
{
  "businessDescription": "string or null",
  "services": [
    {
      "name": "string",
      "description": "string or null",
      "duration": null,
      "price": 25
    }
  ],
  "faqs": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "openingHours": {
    "monday": "string like '9:00 AM - 5:00 PM' or 'Closed'",
    "tuesday": "...",
    "wednesday": "...",
    "thursday": "...",
    "friday": "...",
    "saturday": "...",
    "sunday": "..."
  } or null if not found
}

WEBSITE CONTENT:
`;

/**
 * Extract structured knowledge from website content using Grok text API (xAI)
 */
export async function extractKnowledgeWithGrok(
  markdown: string,
  apiKey: string
): Promise<ExtractedKnowledge> {
  try {
    // Truncate content if too long
    const truncatedContent = markdown.slice(0, 15000);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + truncatedContent,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      console.error(`Grok API error (grok-3-mini): ${response.status} ${response.statusText}`);

      // Retry once with grok-3-mini-fast on 502/503/429
      if (response.status === 502 || response.status === 503 || response.status === 429) {
        console.log('[Knowledge] Retrying extraction with grok-3-mini-fast...');
        const retryResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-3-mini-fast',
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: EXTRACTION_PROMPT + truncatedContent,
              },
            ],
          }),
          signal: AbortSignal.timeout(60_000),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryContent = retryData.choices?.[0]?.message?.content;
          if (retryContent) {
            console.log('[Knowledge] Retry with grok-3-mini-fast succeeded');
            return parseExtractedJson(retryContent);
          }
        }
        console.error(`[Knowledge] Retry also failed: ${retryResponse.status}`);
      }

      return getEmptyKnowledge();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Grok returned no content');
      return getEmptyKnowledge();
    }

    // Parse the JSON response
    const parsed = parseExtractedJson(content);
    return parsed;
  } catch (error) {
    console.error('Grok extraction failed:', error);
    return getEmptyKnowledge();
  }
}

/**
 * Generate knowledge base from business info alone (no website content).
 * Used as a fallback when website scraping or extraction fails.
 */
export async function generateKnowledgeFromBusinessInfo(
  businessName: string,
  businessType: string,
  apiKey: string
): Promise<ExtractedKnowledge> {
  try {
    const prompt = `You are helping build a knowledge base for "${businessName}", a ${businessType} in the UK.

Since we don't have website content, generate realistic and helpful information based on what a typical ${businessType} would offer.

Generate:
1. A brief business description (1-2 sentences)
2. 5-8 typical services/offerings for a ${businessType} (with realistic UK prices where appropriate)
3. 5 common FAQs that callers would ask a ${businessType}
4. Do NOT generate opening hours (we'll get those from Google)

Return ONLY valid JSON in this exact format (no markdown, no explanation). Use null for unknown values, NEVER use undefined:
{
  "businessDescription": "string",
  "services": [
    {
      "name": "string",
      "description": "string",
      "duration": null,
      "price": 25
    }
  ],
  "faqs": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "openingHours": null
}`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini-fast',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`[Fallback] Grok API error: ${response.status} ${response.statusText}`);
      return getEmptyKnowledge();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Fallback] Grok returned no content');
      return getEmptyKnowledge();
    }

    const parsed = parseExtractedJson(content);
    console.log(`[Fallback] Generated ${parsed.services.length} services, ${parsed.faqs.length} FAQs from business info`);
    return parsed;
  } catch (error) {
    console.error('[Fallback] Knowledge generation failed:', error);
    return getEmptyKnowledge();
  }
}

/**
 * @deprecated Use extractKnowledgeWithGrok instead
 */
export const extractKnowledgeWithClaude = extractKnowledgeWithGrok;

/**
 * Parse and validate the extracted JSON
 */
function parseExtractedJson(content: string): ExtractedKnowledge {
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Grok response');
      return getEmptyKnowledge();
    }

    // Sanitize: Grok sometimes outputs JS-style `undefined` instead of JSON `null`
    const sanitized = jsonMatch[0].replace(/:\s*undefined\b/g, ': null');
    const parsed = JSON.parse(sanitized);

    // Validate and sanitize the response
    return {
      businessDescription: typeof parsed.businessDescription === 'string'
        ? parsed.businessDescription.slice(0, 1000)
        : null,
      services: validateServices(parsed.services).slice(0, 50),
      faqs: validateFaqs(parsed.faqs).slice(0, 50),
      openingHours: validateOpeningHours(parsed.openingHours),
    };
  } catch (error) {
    console.error('Failed to parse Grok response:', error);
    return getEmptyKnowledge();
  }
}

function validateServices(services: unknown): ExtractedService[] {
  if (!Array.isArray(services)) return [];

  return services
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      name: String(s.name || 'Unknown Service').slice(0, 200),
      description: s.description ? String(s.description).slice(0, 500) : undefined,
      duration: typeof s.duration === 'number' ? s.duration : undefined,
      price: typeof s.price === 'number' ? s.price : undefined,
    }))
    .filter((s) => s.name !== 'Unknown Service');
}

function validateFaqs(faqs: unknown): ExtractedFAQ[] {
  if (!Array.isArray(faqs)) return [];

  return faqs
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f) => ({
      question: String(f.question || '').slice(0, 500),
      answer: String(f.answer || '').slice(0, 2000),
    }))
    .filter((f) => f.question && f.answer);
}

function validateOpeningHours(hours: unknown): Record<string, string> | null {
  if (!hours || typeof hours !== 'object') return null;

  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Record<string, string> = {};
  let hasAnyHours = false;

  for (const day of validDays) {
    const value = (hours as Record<string, unknown>)[day];
    if (typeof value === 'string' && value.trim()) {
      result[day] = value.trim().slice(0, 100);
      hasAnyHours = true;
    }
  }

  return hasAnyHours ? result : null;
}

function getEmptyKnowledge(): ExtractedKnowledge {
  return {
    businessDescription: null,
    services: [],
    faqs: [],
    openingHours: null,
  };
}
