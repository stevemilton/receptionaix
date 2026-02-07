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
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receptionai.vercel.app';

export function CompleteScreen() {
  const { completeOnboarding, session } = useAuth();
  const {
    businessName,
    businessType,
    address,
    phone,
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

      const payload = {
        businessName,
        businessType,
        address,
        phone,
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
      };

      console.log('[CompleteScreen] Sending payload:', JSON.stringify(payload, null, 2));
      console.log('[CompleteScreen] Services count:', services.length);
      console.log('[CompleteScreen] FAQs count:', faqs.length);
      console.log('[CompleteScreen] Opening hours keys:', Object.keys(openingHours));

      const response = await fetch(`${API_BASE_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
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
    <ScreenBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={40} color="#FFFFFF" />
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
          <ActivityIndicator size="small" color={colors.info} />
          <Text style={styles.savingText}>Saving your settings...</Text>
        </View>
      )}

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Setup Summary</Text>

        {/* Business */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>{businessName}</Text>
            <Text style={styles.summaryText}>{businessType}</Text>
            <Text style={styles.summarySubtext}>{address}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>

        {/* Services */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Services</Text>
            <Text style={styles.summaryText}>
              {services.length} service{services.length !== 1 ? 's' : ''} configured
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>

        {/* Voice */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="mic-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>AI Voice</Text>
            <Text style={styles.summaryText}>{voiceId}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>

        {/* Calendar */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Google Calendar</Text>
            <Text style={styles.summaryText}>
              {googleCalendarConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          {googleCalendarConnected ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : (
            <Ionicons name="time-outline" size={20} color="#D1D5DB" />
          )}
        </View>

        {/* FAQs */}
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>FAQs</Text>
            <Text style={styles.summaryText}>
              {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} configured
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>

        {/* Phone */}
        <View style={[styles.summaryItem, styles.summaryItemLast]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>AI Phone Number</Text>
            <Text style={styles.summaryPhone}>{twilioPhoneNumber}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
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
        <Ionicons name="arrow-forward" size={20} color={colors.white} />
      </TouchableOpacity>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.errorFaint,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  retryLink: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  savingBox: {
    backgroundColor: colors.infoFaint,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    color: colors.info,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
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
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.label,
  },
  summaryText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  summarySubtext: {
    fontSize: 12,
    color: colors.tertiaryLabel,
    marginTop: 2,
  },
  summaryPhone: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.primary,
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
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '400',
    color: colors.label,
  },
  ctaButton: {
    backgroundColor: colors.primary,
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
    color: colors.white,
    fontSize: 18,
    fontWeight: '500',
  },
});
