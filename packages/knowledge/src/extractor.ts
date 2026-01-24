import type { ExtractedKnowledge, ExtractedService, ExtractedFAQ } from './types';

const EXTRACTION_PROMPT = `You are an AI that extracts structured business information from website content.

Analyze the following website content and extract:
1. A brief business description (1-2 sentences)
2. Services offered with name, description, estimated duration in minutes, and price if mentioned
3. Frequently asked questions and their answers
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
 * Extract structured knowledge from website content using Grok API
 */
export async function extractKnowledgeWithGrok(
  markdown: string,
  apiKey: string
): Promise<ExtractedKnowledge> {
  try {
    // Truncate content if too long (Grok has context limits)
    const truncatedContent = markdown.slice(0, 15000);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + truncatedContent,
          },
        ],
        temperature: 0.1, // Low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      console.error(`Grok API error: ${response.status} ${response.statusText}`);
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
