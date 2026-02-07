'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@receptionalx/ui';
import { useOnboardingStore, OnboardingService } from '@/lib/onboarding-store';

interface SuggestedService {
  serviceName: string;
  description: string | null;
  typicalDurationMins: number | null;
  typicalPriceGbp: number | null;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function ReviewInfoPage() {
  const router = useRouter();
  const {
    businessName,
    businessType,
    address,
    phone,
    website,
    services,
    openingHours,
    kbSources,
    setBusinessInfo,
    setServices,
    setOpeningHours,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [localBusinessName, setLocalBusinessName] = useState(businessName);
  const [localBusinessType, setLocalBusinessType] = useState(businessType);
  const [localAddress, setLocalAddress] = useState(address);
  const [localPhone, setLocalPhone] = useState(phone);
  const [localWebsite, setLocalWebsite] = useState(website || '');
  const [localServices, setLocalServices] = useState<OnboardingService[]>(
    services.length > 0 ? services : [{ name: '', description: '', duration: 30, price: 0 }]
  );
  const [localHours, setLocalHours] = useState<Record<string, string>>(() => {
    // Normalize opening hours keys to match DAYS_OF_WEEK format (capitalized)
    // Google Places returns lowercase keys (monday, tuesday, etc.)
    if (Object.keys(openingHours).length > 0) {
      const normalized: Record<string, string> = {};
      for (const day of DAYS_OF_WEEK) {
        const lowerDay = day.toLowerCase();
        normalized[day] = openingHours[day] || openingHours[lowerDay] || '';
      }
      return normalized;
    }
    return DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: '09:00 - 17:00' }), {});
  });

  // Fetch master KB suggestions for the business type
  const [suggestedServices, setSuggestedServices] = useState<SuggestedService[]>([]);

  useEffect(() => {
    if (localBusinessType) {
      fetch(`/api/master-kb/suggestions?businessType=${encodeURIComponent(localBusinessType)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.suggestions?.services) {
            setSuggestedServices(data.suggestions.services);
          }
        })
        .catch(() => {
          // Silently fail — suggestions are enhancement only
        });
    }
  }, [localBusinessType]);

  const handleAddSuggestedService = (suggestion: SuggestedService) => {
    const newService: OnboardingService = {
      name: suggestion.serviceName,
      description: suggestion.description || '',
      duration: suggestion.typicalDurationMins || 30,
      price: suggestion.typicalPriceGbp || 0,
    };

    const emptyIndex = localServices.findIndex((s) => !s.name.trim());
    if (emptyIndex >= 0) {
      const updated = [...localServices];
      updated[emptyIndex] = newService;
      setLocalServices(updated);
    } else {
      setLocalServices([...localServices, newService]);
    }
  };

  // Filter out suggestions that are already in the services list
  const unusedSuggestions = suggestedServices.filter(
    (s) => !localServices.some((ls) => ls.name.toLowerCase() === s.serviceName.toLowerCase())
  );

  const handleAddService = () => {
    setLocalServices([...localServices, { name: '', description: '', duration: 30, price: 0 }]);
  };

  const handleRemoveService = (index: number) => {
    setLocalServices(localServices.filter((_, i) => i !== index));
  };

  const handleServiceChange = (
    index: number,
    field: keyof OnboardingService,
    value: string | number
  ) => {
    const updated = [...localServices];
    updated[index] = { ...updated[index], [field]: value };
    setLocalServices(updated);
  };

  const handleHoursChange = (day: string, value: string) => {
    setLocalHours({ ...localHours, [day]: value });
  };

  const handleContinue = () => {
    // Update store with all local values
    setBusinessInfo({
      businessName: localBusinessName,
      businessType: localBusinessType,
      address: localAddress,
      phone: localPhone,
      website: localWebsite || null,
    });

    // Filter out empty services
    const validServices = localServices.filter((s) => s.name.trim() !== '');
    setServices(validServices);
    setOpeningHours(localHours);

    markStepCompleted(2);
    setCurrentStep(3);
    router.push('/onboarding/ai-greeting');
  };

  const handleBack = () => {
    router.push('/onboarding/business-search');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review your information</h1>
        <p className="mt-1 text-gray-600">
          Confirm and edit your business details. This information will help your AI receptionist.
        </p>
      </div>

      {/* Data source info banner */}
      {kbSources && (
        <div className={`p-4 rounded-lg text-sm ${
          kbSources.grokExtraction
            ? 'bg-green-50 border border-green-200 text-green-800'
            : kbSources.websiteFound && !kbSources.websiteScraped
            ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {kbSources.grokExtraction ? (
            <p>
              <span className="font-medium">Services and FAQs extracted from your website.</span>{' '}
              Review and edit below.
            </p>
          ) : kbSources.websiteFound && !kbSources.websiteScraped ? (
            <p>
              <span className="font-medium">We found your website but couldn&apos;t scan it.</span>{' '}
              Please add your services and FAQs manually below.
            </p>
          ) : !kbSources.websiteFound ? (
            <p>
              <span className="font-medium">No website found for this business.</span>{' '}
              Please add your services manually below. Opening hours from Google have been imported.
            </p>
          ) : (
            <p>
              <span className="font-medium">Website scanned but no services were found.</span>{' '}
              Please add your services manually below.
            </p>
          )}
        </div>
      )}

      {/* Business Details */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business name"
              value={localBusinessName}
              onChange={(e) => setLocalBusinessName(e.target.value)}
              placeholder="Your business name"
            />
            <Input
              label="Business type"
              value={localBusinessType}
              onChange={(e) => setLocalBusinessType(e.target.value)}
              placeholder="e.g. Hair Salon, Dental Practice"
            />
          </div>
          <Input
            label="Address"
            value={localAddress}
            onChange={(e) => setLocalAddress(e.target.value)}
            placeholder="Full business address"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              placeholder="+44 20 1234 5678"
            />
            <Input
              label="Website (optional)"
              value={localWebsite}
              onChange={(e) => setLocalWebsite(e.target.value)}
              placeholder="https://www.example.com"
            />
          </div>
        </div>
      </Card>

      {/* Services */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Services</h2>
          <Button variant="outline" size="sm" onClick={handleAddService}>
            + Add Service
          </Button>
        </div>

        {/* Suggested services from master KB */}
        {unusedSuggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Popular services for {localBusinessType || 'your business type'}:
            </p>
            <div className="flex flex-wrap gap-2">
              {unusedSuggestions.map((suggestion) => (
                <button
                  key={suggestion.serviceName}
                  onClick={() => handleAddSuggestedService(suggestion)}
                  className="px-3 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors"
                >
                  + {suggestion.serviceName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {localServices.map((service, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Service {index + 1}</span>
                {localServices.length > 1 && (
                  <button
                    onClick={() => handleRemoveService(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Service name"
                  value={service.name}
                  onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={service.description || ''}
                  onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Duration (mins)"
                  value={service.duration || ''}
                  onChange={(e) =>
                    handleServiceChange(index, 'duration', parseInt(e.target.value) || 0)
                  }
                />
                <Input
                  type="number"
                  placeholder="Price (£)"
                  value={service.price || ''}
                  onChange={(e) =>
                    handleServiceChange(index, 'price', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Opening Hours */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Opening Hours</h2>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-gray-700">{day}</span>
              <Input
                className="flex-1"
                value={localHours[day] || ''}
                onChange={(e) => handleHoursChange(day, e.target.value)}
                placeholder="e.g. 09:00 - 17:00 or Closed"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Enter times like &quot;09:00 - 17:00&quot; or &quot;Closed&quot;
        </p>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
