import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingStore } from '../../lib/onboarding-store';
import { useAuth } from '../../lib/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receptionai.vercel.app';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

export function PhoneSetupScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const {
    twilioPhoneNumber,
    forwardPhone,
    phone,
    setTwilioPhone,
    setForwardPhone,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(twilioPhoneNumber);
  const [error, setError] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState(!!twilioPhoneNumber);
  const [localForwardPhone, setLocalForwardPhone] = useState(forwardPhone || phone || '');

  const handleSearchNumbers = async () => {
    setSearchingNumbers(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/twilio/available-numbers`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for numbers');
      }

      setAvailableNumbers(data.numbers || []);
      if (data.numbers?.length === 0) {
        setError('No numbers available. Please try again later.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for numbers');
    } finally {
      setSearchingNumbers(false);
    }
  };

  const handleProvisionNumber = async () => {
    if (!selectedNumber) return;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/twilio/provision`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumber: selectedNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to provision number');
      }

      setTwilioPhone(data.phoneNumber);
      setProvisioned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision number');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setForwardPhone(localForwardPhone);
    markStepCompleted(6);
    setCurrentStep(7);
    navigation.navigate('Conditions');
  };

  const handleBack = () => {
    navigation.navigate('FaqEditor');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 6 of 8</Text>
        <Text style={styles.title}>Set up your phone number</Text>
        <Text style={styles.subtitle}>
          Get a dedicated phone number for your AI receptionist.
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {provisioned ? (
        <>
          {/* Provisioned State */}
          <View style={styles.card}>
            <View style={styles.provisionedState}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={32} color="#10B981" />
              </View>
              <Text style={styles.provisionedTitle}>Phone Number Ready!</Text>
              <Text style={styles.provisionedNumber}>{twilioPhoneNumber}</Text>
              <Text style={styles.provisionedText}>
                Your AI receptionist is ready to answer calls on this number.
              </Text>
            </View>
          </View>

          {/* Forward Phone */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your personal phone number</Text>
            <Text style={styles.cardSubtitle}>
              If your AI receptionist can't take a call, calls will be forwarded to this number instead.
            </Text>
            <TextInput
              style={styles.input}
              value={localForwardPhone}
              onChangeText={setLocalForwardPhone}
              placeholder="+44 7700 900123"
              keyboardType="phone-pad"
            />
            <Text style={styles.helperText}>
              This should be a number you can answer personally. We'll never share it with callers.
            </Text>
          </View>
        </>
      ) : (
        <>
          {/* Search for numbers */}
          {availableNumbers.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.searchState}>
                <View style={styles.phoneIcon}>
                  <Ionicons name="call-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.searchTitle}>Get Your AI Receptionist Number</Text>
                <Text style={styles.searchText}>
                  We'll provision a UK phone number for your business.
                </Text>
                <TouchableOpacity
                  style={[styles.searchButton, searchingNumbers && styles.buttonDisabled]}
                  onPress={handleSearchNumbers}
                  disabled={searchingNumbers}
                >
                  {searchingNumbers ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.searchButtonText}>Search Available Numbers</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Your Number</Text>
              {availableNumbers.map((number) => (
                <TouchableOpacity
                  key={number.phoneNumber}
                  style={[
                    styles.numberOption,
                    selectedNumber === number.phoneNumber && styles.numberOptionSelected,
                  ]}
                  onPress={() => setSelectedNumber(number.phoneNumber)}
                >
                  <View style={styles.numberInfo}>
                    <Text style={styles.numberText}>{number.friendlyName}</Text>
                    {number.locality && (
                      <Text style={styles.numberLocality}>({number.locality})</Text>
                    )}
                  </View>
                  {selectedNumber === number.phoneNumber && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.provisionActions}>
                <TouchableOpacity
                  onPress={handleSearchNumbers}
                  disabled={searchingNumbers}
                >
                  <Text style={styles.searchAgainLink}>
                    {searchingNumbers ? 'Searching...' : 'Search again'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.provisionButton,
                    (!selectedNumber || loading) && styles.buttonDisabled,
                  ]}
                  onPress={handleProvisionNumber}
                  disabled={!selectedNumber || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.provisionButtonText}>Provision This Number</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {/* How it works */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Forward your calls</Text>
            <Text style={styles.stepText}>
              Set up call forwarding from your existing business number to your AI number.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>AI answers calls</Text>
            <Text style={styles.stepText}>
              Your AI receptionist will answer, help callers, and book appointments.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>You stay informed</Text>
            <Text style={styles.stepText}>
              Get notifications and transcripts of every call in your dashboard.
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !provisioned && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!provisioned}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  provisionedState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  provisionedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  provisionedNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 8,
  },
  provisionedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  searchState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  phoneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  searchButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  numberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  numberOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  numberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  numberLocality: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  provisionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  searchAgainLink: {
    fontSize: 14,
    color: '#6B7280',
  },
  provisionButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  provisionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  continueButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
