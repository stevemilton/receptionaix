import { NextResponse } from 'next/server';
import {
  generateKnowledgeBase,
  generateKnowledgeBaseFromPlace,
  generateKnowledgeBaseFromUrl,
} from '@receptionalx/knowledge';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { businessName, location, placeId, websiteUrl, useMock } = body;

    // Validate input types and lengths
    if (businessName && (typeof businessName !== 'string' || businessName.length > 200)) {
      return NextResponse.json({ error: 'Invalid businessName' }, { status: 400 });
    }
    if (websiteUrl && (typeof websiteUrl !== 'string' || websiteUrl.length > 500)) {
      return NextResponse.json({ error: 'Invalid websiteUrl' }, { status: 400 });
    }
    if (websiteUrl && !/^https?:\/\/.+/.test(websiteUrl)) {
      return NextResponse.json({ error: 'websiteUrl must be a valid HTTP(S) URL' }, { status: 400 });
    }
    if (placeId && (typeof placeId !== 'string' || placeId.length > 100)) {
      return NextResponse.json({ error: 'Invalid placeId' }, { status: 400 });
    }

    // Need at least one of these
    if (!businessName && !placeId && !websiteUrl) {
      return NextResponse.json(
        { error: 'Provide businessName, placeId, or websiteUrl' },
        { status: 400 }
      );
    }

    // Check for required API keys (Google Places + Grok required, Firecrawl optional)
    const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || '';
    const grokApiKey = process.env.GROK_API_KEY;

    if (!googlePlacesApiKey || !grokApiKey) {
      console.error('[Knowledge] Missing required API keys:', {
        googlePlaces: !!googlePlacesApiKey,
        grok: !!grokApiKey,
      });
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    if (!firecrawlApiKey) {
      console.warn('[Knowledge] FIRECRAWL_API_KEY not set — website scraping will be skipped');
    }

    const config = {
      googlePlacesApiKey,
      firecrawlApiKey,
      grokApiKey,
      useMockData: useMock === true,
    };

    let result;

    if (placeId) {
      // Generate from specific place ID
      result = await generateKnowledgeBaseFromPlace(placeId, config);
    } else if (websiteUrl) {
      // Generate from website URL only
      result = await generateKnowledgeBaseFromUrl(websiteUrl, config);
    } else {
      // Search and generate from business name
      result = await generateKnowledgeBase(businessName, location, config);
    }

    return NextResponse.json({
      success: true,
      knowledgeBase: result,
      sources: result.sources || null,
    });
  } catch (error) {
    console.error('Knowledge base generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate knowledge base' },
      { status: 500 }
    );
  }
}
