import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useOnboardingStore } from '../../lib/onboarding-store';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receptionai.vercel.app';

export function CalendarConnectScreen() {
  const navigation = useNavigation<any>();
  const {
    googleCalendarConnected,
    setGoogleCalendar,
    markStepCompleted,
    markStepSkipped,
    setCurrentStep,
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);

  const handleConnectCalendar = async () => {
    setLoading(true);
    try {
      // Open the Google OAuth flow in the browser
      // The web app will handle the OAuth and redirect back
      await Linking.openURL(`${API_BASE_URL}/api/google/auth?mobile=true`);

      // For now, we'll skip actual OAuth on mobile and mark as skipped
      // In production, you'd handle deep linking to complete the flow
      Alert.alert(
        'Calendar Connection',
        'Please complete the Google Calendar connection in the browser. Once connected, return to the app.',
        [
          { text: 'Skip for now', onPress: () => handleSkip() },
          { text: 'I connected it', onPress: () => {
            setGoogleCalendar(true);
            setLoading(false);
          }},
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to open browser for calendar connection');
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setGoogleCalendar(false);
  };

  const handleContinue = () => {
    markStepCompleted(4);
    setCurrentStep(5);
    navigation.navigate('FaqEditor');
  };

  const handleSkip = () => {
    markStepSkipped(4);
    setCurrentStep(5);
    navigation.navigate('FaqEditor');
  };

  const handleBack = () => {
    navigation.navigate('AiGreeting');
  };

  return (
    <ScreenBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 4 of 8</Text>
        <Text style={styles.title}>Connect your calendar</Text>
        <Text style={styles.subtitle}>
          Connect Google Calendar to let your AI receptionist book appointments.
        </Text>
      </View>

      {/* Calendar Status Card */}
      <View style={styles.card}>
        {googleCalendarConnected ? (
          <View style={styles.connectedState}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={32} color={colors.success} />
            </View>
            <Text style={styles.connectedTitle}>Calendar Connected</Text>
            <Text style={styles.connectedText}>
              Your Google Calendar is connected. Your AI receptionist can now book appointments.
            </Text>
            <TouchableOpacity onPress={handleDisconnect}>
              <Text style={styles.disconnectLink}>Disconnect Calendar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.disconnectedState}>
            <View style={styles.calendarIcon}>
              <Ionicons name="calendar-outline" size={32} color={colors.tertiaryLabel} />
            </View>
            <Text style={styles.disconnectedTitle}>Connect Google Calendar</Text>
            <Text style={styles.disconnectedText}>
              Allow your AI receptionist to check availability and book appointments.
            </Text>

            <TouchableOpacity
              style={[styles.connectButton, loading && styles.buttonDisabled]}
              onPress={handleConnectCalendar}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color={colors.white} />
              <Text style={styles.connectButtonText}>
                {loading ? 'Connecting...' : 'Connect with Google'}
              </Text>
            </TouchableOpacity>

            <View style={styles.accessInfo}>
              <Text style={styles.accessTitle}>What we'll access:</Text>
              <View style={styles.accessItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.accessText}>View your calendar availability</Text>
              </View>
              <View style={styles.accessItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.accessText}>Create new calendar events</Text>
              </View>
              <View style={styles.accessItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.accessText}>View and modify existing events</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Benefits */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why connect your calendar?</Text>

        <View style={styles.benefit}>
          <View style={styles.benefitIcon}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Real-time availability</Text>
            <Text style={styles.benefitText}>AI knows when you're free to book appointments</Text>
          </View>
        </View>

        <View style={styles.benefit}>
          <View style={styles.benefitIcon}>
            <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Automatic booking</Text>
            <Text style={styles.benefitText}>New appointments appear in your calendar instantly</Text>
          </View>
        </View>

        <View style={styles.benefit}>
          <View style={styles.benefitIcon}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>No double bookings</Text>
            <Text style={styles.benefitText}>Prevents scheduling conflicts automatically</Text>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.secondaryLabel} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          {!googleCalendarConnected && (
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipLink}>Skip for now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 24,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 16,
  },
  connectedState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectedTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
  },
  connectedText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    textAlign: 'center',
    marginTop: 8,
  },
  disconnectLink: {
    fontSize: 14,
    color: colors.error,
    marginTop: 16,
    textDecorationLine: 'underline',
  },
  disconnectedState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  calendarIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  disconnectedTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
  },
  disconnectedText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '400',
  },
  accessInfo: {
    backgroundColor: colors.grouped,
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 12,
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  accessText: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.label,
  },
  benefitText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginTop: 2,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.secondaryLabel,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skipLink: {
    fontSize: 14,
    color: colors.secondaryLabel,
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
