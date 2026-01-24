export interface ScrapedContent {
  url: string;
  title: string | null;
  markdown: string;
  scrapedAt: Date;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  types: string[];
  openingHours: Record<string, string> | null;
}

export interface ExtractedService {
  name: string;
  description?: string;
  duration?: number; // minutes
  price?: number;
}

export interface ExtractedFAQ {
  question: string;
  answer: string;
}

export interface ExtractedKnowledge {
  businessDescription: string | null;
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  openingHours: Record<string, string> | null;
}

export interface KnowledgeBaseResult {
  placeData: PlaceResult | null;
  scrapedData: ScrapedContent | null;
  extractedKnowledge: ExtractedKnowledge;
}
