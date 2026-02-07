'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@receptionalx/ui';
import { useOnboardingStore } from '@/lib/onboarding-store';

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  types?: string[];
  rating?: number;
  userRatingsTotal?: number;
}

export default function BusinessSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const { setBusinessInfo, markStepCompleted, setCurrentStep } = useOnboardingStore();

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a business name');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({ q: query });
      if (location.trim()) {
        params.append('location', location);
      }

      const response = await fetch(`/api/knowledge/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results || []);
      if (data.results?.length === 0) {
        setError('No businesses found. Try a different search term.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
  };

  const handleContinue = async () => {
    if (!selectedPlace) return;

    setGenerating(true);
    setError(null);

    try {
      // Generate knowledge base from the selected place
      const response = await fetch('/api/knowledge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: selectedPlace.placeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate knowledge base');
      }

      // Extract business type from place types
      const businessType = selectedPlace.types?.[0]?.replace(/_/g, ' ') || 'business';

      // Update onboarding store with business info
      // API returns { knowledgeBase: { extractedKnowledge: { services, faqs, openingHours } } }
      const extracted = data.knowledgeBase?.extractedKnowledge || {};
      setBusinessInfo({
        placeId: selectedPlace.placeId,
        businessName: selectedPlace.name,
        businessType: businessType,
        address: selectedPlace.address,
        phone: selectedPlace.phone || '',
        website: selectedPlace.website || null,
        services: extracted.services || [],
        openingHours: extracted.openingHours || {},
        faqs: extracted.faqs || [],
        kbSources: data.sources || null,
      });

      markStepCompleted(1);
      setCurrentStep(2);
      router.push('/onboarding/review-info');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
      setGenerating(false);
    }
  };

  const handleManualEntry = () => {
    // Allow manual entry without Google Places
    setBusinessInfo({
      placeId: null,
      businessName: '',
      businessType: '',
      address: '',
      phone: '',
      website: null,
      services: [],
      openingHours: {},
      faqs: [],
    });

    markStepCompleted(1);
    setCurrentStep(2);
    router.push('/onboarding/review-info');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find your business</h1>
        <p className="mt-1 text-gray-600">
          Search for your business to automatically import details, or enter them manually.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            label="Business name"
            placeholder="e.g. Gielly Green Hair Salon"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />

          <Input
            label="Location (optional)"
            placeholder="e.g. London, UK"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            helperText="Add a location to narrow down results"
          />

          <Button onClick={handleSearch} loading={loading} className="w-full">
            Search
          </Button>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading overlay during KB generation */}
      {generating && (
        <Card>
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <svg className="animate-spin h-6 w-6 text-primary-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Building your AI receptionist&apos;s knowledge base</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md">
              We&apos;re importing your business details, scanning your website, and extracting services and FAQs. This usually takes 10–15 seconds.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              <span>Please don&apos;t close this page</span>
            </div>
          </div>
        </Card>
      )}

      {results.length > 0 && !generating && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
          {results.map((place) => (
            <Card
              key={place.placeId}
              padding="sm"
              className={`cursor-pointer transition-all ${
                selectedPlace?.placeId === place.placeId
                  ? 'ring-2 ring-primary-600 border-primary-600'
                  : 'hover:border-gray-300'
              }`}
              onClick={() => handleSelectPlace(place)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{place.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{place.address}</p>
                  {place.phone && (
                    <p className="text-sm text-gray-500 mt-1">{place.phone}</p>
                  )}
                  {place.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm text-gray-600">
                        {place.rating.toFixed(1)} ({place.userRatingsTotal} reviews)
                      </span>
                    </div>
                  )}
                </div>
                {selectedPlace?.placeId === place.placeId && (
                  <div className="shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={handleManualEntry}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Enter details manually instead
        </button>

        <Button
          onClick={handleContinue}
          disabled={!selectedPlace}
          loading={generating}
        >
          {generating ? 'Generating knowledge base...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
