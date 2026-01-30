import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../lib/onboarding-store';
import { useAuth } from '../../lib/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receptionai.vercel.app';

export function CompleteScreen() {
  const { completeOnboarding, session } = useAuth();
  const {
    businessName,
    businessType,
    address,
    services,
    openingHours,
    greeting,
    voiceId,
    googleCalendarConnected,
    faqs,
    twilioPhoneNumber,
    forwardPhone,
    termsAccepted,
    privacyAccepted,
    dataSharingConsent,
    marketingConsent,
    hasHydrated,
    reset,
  } = useOnboardingStore();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  useEffect(() => {
    if (hasHydrated && !saveAttempted) {
      setSaveAttempted(true);
      handleSave();
    }
  }, [hasHydrated, saveAttempted]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessName,
          businessType,
          address,
          services,
          openingHours,
          greeting,
          voiceId,
          googleCalendarConnected,
          faqs,
          twilioPhoneNumber,
          forwardPhone,
          termsAccepted,
          privacyAccepted,
          dataSharingConsent,
          marketingConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleGoToDashboard = async () => {
    reset();
    await completeOnboarding();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={40} color="#10B981" />
        </View>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Your AI receptionist is ready to start taking calls.
        </Text>
      </View>

      {/* Status Messages */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.retryLink}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {saving && (
        <View style={styles.savingBox}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.savingText}>Saving your settings...</Text>
        </View>
      )}

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Setup Summary</Text>

        {/* Business */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="business-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>{businessName}</Text>
            <Text style={styles.summaryText}>{businessType}</Text>
            <Text style={styles.summarySubtext}>{address}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>

        {/* Services */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="clipboard-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Services</Text>
            <Text style={styles.summaryText}>
              {services.length} service{services.length !== 1 ? 's' : ''} configured
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>

        {/* Voice */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="mic-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>AI Voice</Text>
            <Text style={styles.summaryText}>{voiceId}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>

        {/* Calendar */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Google Calendar</Text>
            <Text style={styles.summaryText}>
              {googleCalendarConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          {googleCalendarConnected ? (
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          ) : (
            <Ionicons name="time-outline" size={20} color="#D1D5DB" />
          )}
        </View>

        {/* FAQs */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="help-circle-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>FAQs</Text>
            <Text style={styles.summaryText}>
              {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} configured
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>

        {/* Phone */}
        <View style={[styles.summaryItem, styles.summaryItemLast]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="call-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>AI Phone Number</Text>
            <Text style={styles.summaryPhone}>{twilioPhoneNumber}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>
      </View>

      {/* Next Steps */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next Steps</Text>

        <View style={styles.nextStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.nextStepText}>
            Dial <Text style={styles.bold}>{twilioPhoneNumber}</Text> and test how it works
          </Text>
        </View>

        <View style={styles.nextStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.nextStepText}>
            When you're ready, forward your existing business number to{' '}
            <Text style={styles.bold}>{twilioPhoneNumber}</Text>
          </Text>
        </View>

        <View style={styles.nextStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.nextStepText}>
            Check your dashboard to view call transcripts and manage appointments
          </Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, (!saved && !error) && styles.buttonDisabled]}
        onPress={handleGoToDashboard}
        disabled={!saved && !error}
      >
        <Text style={styles.ctaButtonText}>Go to Dashboard</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
  },
  retryLink: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  savingBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    color: '#3B82F6',
    fontSize: 14,
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
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  summaryPhone: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 4,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
  ctaButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
