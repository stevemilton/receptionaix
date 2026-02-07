import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { businessName, businessType } = body;

    if (!businessType || typeof businessType !== 'string' || businessType.length > 200) {
      return NextResponse.json({ error: 'Valid businessType is required' }, { status: 400 });
    }

    const grokApiKey = process.env.GROK_API_KEY;
    if (!grokApiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `Generate 5 common frequently asked questions (FAQs) for a ${businessType}${businessName ? ` called "${businessName}"` : ''} in the UK.

For each FAQ, provide:
1. A natural question a caller might ask
2. A helpful, concise answer suitable for an AI receptionist to read aloud

Return ONLY a JSON array in this format (no markdown, no explanation):
[
  { "question": "...", "answer": "..." },
  { "question": "...", "answer": "..." }
]

Focus on practical questions about opening hours, services, bookings, parking, payment methods, etc.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini-fast',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates FAQs for UK businesses. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[SuggestFAQs] Grok API error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON from Grok's response
    let faqs: Array<{ question: string; answer: string }> = [];
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        faqs = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('[SuggestFAQs] Failed to parse Grok response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Validate and sanitize
    faqs = faqs
      .filter((f) => f.question && f.answer && typeof f.question === 'string' && typeof f.answer === 'string')
      .slice(0, 5)
      .map((f) => ({
        question: f.question.slice(0, 500),
        answer: f.answer.slice(0, 1000),
      }));

    return NextResponse.json({ success: true, faqs });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    console.error('[SuggestFAQs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate FAQ suggestions' },
      { status: 500 }
    );
  }
}
