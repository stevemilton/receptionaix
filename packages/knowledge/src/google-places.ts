import type { PlaceResult } from './types';

interface PlacesTextSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    regularOpeningHours?: {
      weekdayDescriptions?: string[];
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * Search for a business using Google Places API (New)
 */
export async function searchBusiness(
  query: string,
  apiKey: string,
  location?: string
): Promise<PlaceResult[]> {
  try {
    const searchQuery = location ? `${query} in ${location}` : query;

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.regularOpeningHours',
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          languageCode: 'en',
          regionCode: 'GB',
        }),
      }
    );

    if (!response.ok) {
      console.error(`Google Places error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: PlacesTextSearchResponse = await response.json();

    if (!data.places || data.places.length === 0) {
      return [];
    }

    return data.places.map((place) => ({
      placeId: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      rating: place.rating || null,
      reviewCount: place.userRatingCount || null,
      types: place.types || [],
      openingHours: parseOpeningHours(place.regularOpeningHours?.weekdayDescriptions),
    }));
  } catch (error) {
    console.error('Google Places request failed:', error);
    return [];
  }
}

/**
 * Get detailed information about a specific place
 */
export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceResult | null> {
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,types,regularOpeningHours',
        },
      }
    );

    if (!response.ok) {
      console.error(`Google Places details error: ${response.status}`);
      return null;
    }

    const place = await response.json();

    return {
      placeId: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      rating: place.rating || null,
      reviewCount: place.userRatingCount || null,
      types: place.types || [],
      openingHours: parseOpeningHours(place.regularOpeningHours?.weekdayDescriptions),
    };
  } catch (error) {
    console.error('Google Places details request failed:', error);
    return null;
  }
}

/**
 * Parse Google's weekday descriptions into our format
 */
function parseOpeningHours(
  weekdayDescriptions?: string[]
): Record<string, string> | null {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) {
    return null;
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours: Record<string, string> = {};

  weekdayDescriptions.forEach((desc, index) => {
    if (index < days.length) {
      // Remove day name prefix if present (e.g., "Monday: 9:00 AM – 5:00 PM")
      const colonIndex = desc.indexOf(':');
      const timeStr = colonIndex > -1 ? desc.substring(colonIndex + 1).trim() : desc;
      hours[days[index]] = timeStr;
    }
  });

  return hours;
}
