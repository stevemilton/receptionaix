import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingStore } from '../../lib/onboarding-store';
import { useAuth } from '../../lib/AuthContext';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receptionai.vercel.app';

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

export function BusinessSearchScreen() {
  const navigation = useNavigation<any>();
  const { session, signOut } = useAuth();
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

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/knowledge/search?${params}`, { headers });
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/knowledge/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ placeId: selectedPlace.placeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate knowledge base');
      }

      const businessType = selectedPlace.types?.[0]?.replace(/_/g, ' ') || 'business';
      const extracted = data.knowledgeBase?.extractedKnowledge || {};

      console.log('[BusinessSearch] Extracted knowledge:', JSON.stringify(extracted, null, 2));
      console.log('[BusinessSearch] Services count:', extracted.services?.length || 0);
      console.log('[BusinessSearch] FAQs count:', extracted.faqs?.length || 0);
      console.log('[BusinessSearch] Opening hours:', extracted.openingHours);

      const businessInfo = {
        placeId: selectedPlace.placeId,
        businessName: selectedPlace.name,
        businessType: businessType,
        address: selectedPlace.address,
        phone: selectedPlace.phone || '',
        website: selectedPlace.website || null,
        services: extracted.services || [],
        openingHours: extracted.openingHours || {},
        faqs: extracted.faqs || [],
      };

      console.log('[BusinessSearch] Setting business info:', JSON.stringify(businessInfo, null, 2));

      setBusinessInfo(businessInfo);

      markStepCompleted(1);
      setCurrentStep(2);
      setGenerating(false);
      navigation.navigate('ReviewInfo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
      setGenerating(false);
    }
  };

  const handleManualEntry = () => {
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
    navigation.navigate('ReviewInfo');
  };

  return (
    <>
      {/* Full-screen loading overlay */}
      <Modal
        visible={generating}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Creating your knowledge base</Text>
            <Text style={styles.loadingText}>
              We're analysing your business website to extract services, FAQs, and opening hours.
            </Text>
            <Text style={styles.loadingSubtext}>This may take a moment...</Text>
          </View>
        </View>
      </Modal>

      <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.stepIndicator}>Step 1 of 8</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut },
                ]
              );
            }}
          >
            <Text style={styles.signOutLink}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Find your business</Text>
        <Text style={styles.subtitle}>
          Search for your business to automatically import details, or enter them manually.
        </Text>
      </View>

      {/* Search Form */}
      <View style={styles.card}>
        <Text style={styles.label}>Business name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Gielly Green Hair Salon"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        <Text style={styles.label}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. London, UK"
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Text style={styles.helperText}>Add a location to narrow down results</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {results.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Search Results</Text>
          {results.map((place) => (
            <TouchableOpacity
              key={place.placeId}
              style={[
                styles.resultCard,
                selectedPlace?.placeId === place.placeId && styles.resultCardSelected,
              ]}
              onPress={() => handleSelectPlace(place)}
            >
              <View style={styles.resultContent}>
                <Text style={styles.resultName}>{place.name}</Text>
                <Text style={styles.resultAddress}>{place.address}</Text>
                {place.phone && (
                  <Text style={styles.resultPhone}>{place.phone}</Text>
                )}
                {place.rating && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={styles.ratingText}>
                      {place.rating.toFixed(1)} ({place.userRatingsTotal} reviews)
                    </Text>
                  </View>
                )}
              </View>
              {selectedPlace?.placeId === place.placeId && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleManualEntry}>
          <Text style={styles.manualEntryLink}>Enter details manually instead</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedPlace || generating) && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedPlace || generating}
        >
          {generating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </ScreenBackground>
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
    marginTop: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingSubtext: {
    fontSize: 12,
    color: colors.tertiaryLabel,
    marginTop: 8,
    fontStyle: 'italic',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutLink: {
    fontSize: 14,
    color: colors.tertiaryLabel,
    fontWeight: '400',
  },
  stepIndicator: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '400',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.label,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryLabel,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.grouped,
    borderWidth: 1,
    borderColor: colors.separatorOpaque,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.label,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: colors.tertiaryLabel,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: colors.errorFaint,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  resultsSection: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.separator,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.label,
  },
  resultAddress: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginTop: 4,
  },
  resultPhone: {
    fontSize: 14,
    color: colors.tertiaryLabel,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    marginBottom: 40,
  },
  manualEntryLink: {
    fontSize: 14,
    color: colors.secondaryLabel,
    textDecorationLine: 'underline',
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
});
