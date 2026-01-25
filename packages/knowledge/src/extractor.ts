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
   - duration: Only if it's a timed service (leave undefined for products/food)
   - price: Only if clearly stated (leave undefined if not mentioned)
3. Common FAQs - Think about what callers would ask:
   - "Do you have parking?"
   - "Do you take reservations/bookings?"
   - "Are you wheelchair accessible?"
   - "Do you cater for dietary requirements?"
   - Any specific FAQs mentioned on the website
4. Opening hours if mentioned

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "businessDescription": "string or null",
  "services": [
    {
      "name": "string",
      "description": "string or undefined",
      "duration": "number in minutes or undefined",
      "price": "number or undefined"
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
 * Extract structured knowledge from website content using Claude API
 */
export async function extractKnowledgeWithClaude(
  markdown: string,
  apiKey: string
): Promise<ExtractedKnowledge> {
  try {
    // Truncate content if too long
    const truncatedContent = markdown.slice(0, 15000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + truncatedContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Claude API error: ${response.status} ${response.statusText}`);
      return getEmptyKnowledge();
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error('Claude returned no content');
      return getEmptyKnowledge();
    }

    // Parse the JSON response
    const parsed = parseExtractedJson(content);
    return parsed;
  } catch (error) {
    console.error('Claude extraction failed:', error);
    return getEmptyKnowledge();
  }
}

/**
 * @deprecated Use extractKnowledgeWithClaude instead
 */
export async function extractKnowledgeWithGrok(
  markdown: string,
  apiKey: string
): Promise<ExtractedKnowledge> {
  console.warn('extractKnowledgeWithGrok is deprecated, use extractKnowledgeWithClaude');
  return getEmptyKnowledge();
}

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

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize the response
    return {
      businessDescription: typeof parsed.businessDescription === 'string'
        ? parsed.businessDescription
        : null,
      services: validateServices(parsed.services),
      faqs: validateFaqs(parsed.faqs),
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
      name: String(s.name || 'Unknown Service'),
      description: s.description ? String(s.description) : undefined,
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
      question: String(f.question || ''),
      answer: String(f.answer || ''),
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
      result[day] = value.trim();
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
