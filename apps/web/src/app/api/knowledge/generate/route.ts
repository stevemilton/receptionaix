import { NextResponse } from 'next/server';
import {
  generateKnowledgeBase,
  generateKnowledgeBaseFromPlace,
  generateKnowledgeBaseFromUrl,
} from '@receptionalx/knowledge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, location, placeId, websiteUrl, useMock } = body;

    // Validate input - need at least one of these
    if (!businessName && !placeId && !websiteUrl) {
      return NextResponse.json(
        { error: 'Provide businessName, placeId, or websiteUrl' },
        { status: 400 }
      );
    }

    // Check for required API keys
    const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;

    if (!googlePlacesApiKey || !firecrawlApiKey || !claudeApiKey) {
      console.error('[Knowledge] Missing API keys:', {
        googlePlaces: !!googlePlacesApiKey,
        firecrawl: !!firecrawlApiKey,
        claude: !!claudeApiKey,
      });
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    const config = {
      googlePlacesApiKey,
      firecrawlApiKey,
      claudeApiKey,
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
    });
  } catch (error) {
    console.error('Knowledge base generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate knowledge base' },
      { status: 500 }
    );
  }
}
