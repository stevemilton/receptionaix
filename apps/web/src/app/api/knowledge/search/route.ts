import { NextResponse } from 'next/server';
import { searchBusiness } from '@receptionalx/knowledge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const location = searchParams.get('location') || undefined;

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    );
  }

  try {
    const places = await searchBusiness(query, apiKey, location);

    return NextResponse.json({
      results: places.slice(0, 5), // Return top 5 results
    });
  } catch (error) {
    console.error('Business search failed:', error);
    return NextResponse.json(
      { error: 'Failed to search for businesses' },
      { status: 500 }
    );
  }
}
