import type { KnowledgeBaseResult, PlaceResult, ExtractedKnowledge, PipelineSources } from './types';
import { searchBusiness, getPlaceDetails } from './google-places';
import { scrapeWebsite } from './firecrawl';
import { extractKnowledgeWithGrok } from './extractor';
import { getMockScrapedContent, getMockExtractedKnowledge } from './mock-scraper';

export interface PipelineConfig {
  googlePlacesApiKey: string;
  firecrawlApiKey: string;
  grokApiKey: string;
  /** @deprecated Use grokApiKey instead */
  claudeApiKey?: string;
  useMockData?: boolean;
}

/**
 * Generate a complete knowledge base for a business
 *
 * Pipeline:
 * 1. Search Google Places for business info
 * 2. If website found, scrape with Firecrawl
 * 3. Extract services/FAQs with Grok
 * 4. Combine all data into structured knowledge base
 */
export async function generateKnowledgeBase(
  businessQuery: string,
  location: string | undefined,
  config: PipelineConfig
): Promise<KnowledgeBaseResult> {
  // Use mock data if configured (for testing)
  if (config.useMockData) {
    return {
      placeData: getMockPlaceData(),
      scrapedData: getMockScrapedContent(),
      extractedKnowledge: getMockExtractedKnowledge(),
    };
  }

  const aiApiKey = config.grokApiKey || config.claudeApiKey || '';

  // Step 1: Search Google Places
  console.log(`[Knowledge] Searching for "${businessQuery}" in ${location || 'UK'}...`);
  const places = await searchBusiness(businessQuery, config.googlePlacesApiKey, location);

  let placeData: PlaceResult | null = null;
  if (places.length > 0) {
    // Get detailed info for the first result
    placeData = await getPlaceDetails(places[0].placeId, config.googlePlacesApiKey);
    if (!placeData) {
      placeData = places[0]; // Fall back to search result
    }
    console.log(`[Knowledge] Found business: ${placeData.name}`);
  } else {
    console.log('[Knowledge] No business found in Google Places');
  }

  // Step 2: Scrape website if available
  let scrapedData = null;
  let extractedKnowledge: ExtractedKnowledge = {
    businessDescription: null,
    services: [],
    faqs: [],
    openingHours: null,
  };

  const websiteUrl = placeData?.website;
  if (websiteUrl) {
    console.log(`[Knowledge] Scraping website: ${websiteUrl}...`);
    scrapedData = await scrapeWebsite(websiteUrl, config.firecrawlApiKey);

    if (scrapedData) {
      console.log(`[Knowledge] Scraped ${scrapedData.markdown.length} characters`);

      // Step 3: Extract structured data with Grok
      console.log('[Knowledge] Extracting services and FAQs with Grok...');
      extractedKnowledge = await extractKnowledgeWithGrok(
        scrapedData.markdown,
        aiApiKey
      );
      console.log(
        `[Knowledge] Extracted ${extractedKnowledge.services.length} services, ${extractedKnowledge.faqs.length} FAQs`
      );
    } else {
      console.log('[Knowledge] Website scraping failed');
    }
  } else {
    console.log('[Knowledge] No website URL available');
  }

  // Use Google Places opening hours if not extracted from website
  if (!extractedKnowledge.openingHours && placeData?.openingHours) {
    extractedKnowledge.openingHours = placeData.openingHours;
  }

  return {
    placeData,
    scrapedData,
    extractedKnowledge,
  };
}

/**
 * Generate knowledge base from a specific place ID
 */
export async function generateKnowledgeBaseFromPlace(
  placeId: string,
  config: PipelineConfig
): Promise<KnowledgeBaseResult> {
  const aiApiKey = config.grokApiKey || config.claudeApiKey || '';

  const sources: PipelineSources = {
    googlePlaces: false,
    websiteFound: false,
    websiteScraped: false,
    grokExtraction: false,
    websiteUrl: null,
  };

  // Get place details
  console.log(`[Knowledge] Fetching place details for ${placeId}...`);
  const placeData = await getPlaceDetails(placeId, config.googlePlacesApiKey);

  if (!placeData) {
    console.log('[Knowledge] Failed to get place details');
    return {
      placeData: null,
      scrapedData: null,
      extractedKnowledge: {
        businessDescription: null,
        services: [],
        faqs: [],
        openingHours: null,
      },
      sources,
    };
  }

  sources.googlePlaces = true;
  console.log(`[Knowledge] Got place: ${placeData.name}, website: ${placeData.website || 'NONE'}`);

  // Scrape and extract if website available
  let scrapedData = null;
  let extractedKnowledge: ExtractedKnowledge = {
    businessDescription: null,
    services: [],
    faqs: [],
    openingHours: placeData.openingHours,
  };

  if (placeData.website) {
    sources.websiteFound = true;
    sources.websiteUrl = placeData.website;

    if (config.firecrawlApiKey) {
      console.log(`[Knowledge] Scraping website: ${placeData.website}...`);
      scrapedData = await scrapeWebsite(placeData.website, config.firecrawlApiKey);

      if (scrapedData) {
        sources.websiteScraped = true;
        console.log(`[Knowledge] Scraped ${scrapedData.markdown.length} chars from website`);

        console.log('[Knowledge] Extracting services and FAQs with Grok...');
        extractedKnowledge = await extractKnowledgeWithGrok(
          scrapedData.markdown,
          aiApiKey
        );

        const hasExtracted = extractedKnowledge.services.length > 0 || extractedKnowledge.faqs.length > 0;
        sources.grokExtraction = hasExtracted;
        console.log(
          `[Knowledge] Grok extracted ${extractedKnowledge.services.length} services, ${extractedKnowledge.faqs.length} FAQs`
        );

        // Preserve Google opening hours if extraction didn't find any
        if (!extractedKnowledge.openingHours && placeData.openingHours) {
          extractedKnowledge.openingHours = placeData.openingHours;
        }
      } else {
        console.log('[Knowledge] Website scraping failed (Firecrawl returned null)');
      }
    } else {
      console.log('[Knowledge] Firecrawl API key not configured, skipping website scrape');
    }
  } else {
    console.log('[Knowledge] No website URL from Google Places — skipping scrape');
  }

  console.log('[Knowledge] Pipeline complete. Sources:', JSON.stringify(sources));

  return {
    placeData,
    scrapedData,
    extractedKnowledge,
    sources,
  };
}

/**
 * Generate knowledge base from just a website URL
 */
export async function generateKnowledgeBaseFromUrl(
  url: string,
  config: PipelineConfig
): Promise<KnowledgeBaseResult> {
  const aiApiKey = config.grokApiKey || config.claudeApiKey || '';

  const scrapedData = await scrapeWebsite(url, config.firecrawlApiKey);

  if (!scrapedData) {
    return {
      placeData: null,
      scrapedData: null,
      extractedKnowledge: {
        businessDescription: null,
        services: [],
        faqs: [],
        openingHours: null,
      },
    };
  }

  const extractedKnowledge = await extractKnowledgeWithGrok(
    scrapedData.markdown,
    aiApiKey
  );

  return {
    placeData: null,
    scrapedData,
    extractedKnowledge,
  };
}

function getMockPlaceData(): PlaceResult {
  return {
    placeId: 'mock-place-id',
    name: 'Style & Grace Hair Salon',
    address: '123 High Street, London, W1 2AB',
    phone: '020 1234 5678',
    website: 'https://example-salon.co.uk',
    rating: 4.8,
    reviewCount: 127,
    types: ['hair_salon', 'beauty_salon'],
    openingHours: {
      monday: 'Closed',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 8:00 PM',
      friday: '9:00 AM - 8:00 PM',
      saturday: '8:00 AM - 5:00 PM',
      sunday: 'Closed',
    },
  };
}
