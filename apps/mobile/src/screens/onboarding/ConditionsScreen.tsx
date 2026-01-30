import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingStore } from '../../lib/onboarding-store';

export function ConditionsScreen() {
  const navigation = useNavigation<any>();
  const {
    termsAccepted,
    privacyAccepted,
    dataSharingConsent,
    marketingConsent,
    setTermsAccepted,
    setPrivacyAccepted,
    setDataSharingConsent,
    setMarketingConsent,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [localTerms, setLocalTerms] = useState(termsAccepted);
  const [localPrivacy, setLocalPrivacy] = useState(privacyAccepted);
  const [localDataSharing, setLocalDataSharing] = useState(dataSharingConsent);
  const [localMarketing, setLocalMarketing] = useState(marketingConsent);

  const canContinue = localTerms && localPrivacy;

  const handleContinue = () => {
    setTermsAccepted(localTerms);
    setPrivacyAccepted(localPrivacy);
    setDataSharingConsent(localDataSharing);
    setMarketingConsent(localMarketing);
    markStepCompleted(7);
    setCurrentStep(8);
    navigation.navigate('Complete');
  };

  const handleBack = () => {
    navigation.navigate('PhoneSetup');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 7 of 8</Text>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>
          Please review and accept our terms to continue
        </Text>
      </View>

      {/* Terms of Service */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Terms of Service</Text>
        <ScrollView style={styles.legalScroll} nestedScrollEnabled>
          <Text style={styles.legalText}>
            By using ReceptionAI, you agree to the following terms:{'\n\n'}
            • You are authorized to use the phone number(s) associated with your account{'\n'}
            • You will not use the service for any unlawful purpose{'\n'}
            • You understand that AI-generated responses may occasionally be inaccurate{'\n'}
            • You are responsible for reviewing and managing bookings made through the service{'\n'}
            • You agree to pay all applicable fees based on your subscription plan{'\n'}
            • We reserve the right to suspend accounts that violate these terms{'\n'}
            • The service is provided "as is" without warranties of any kind
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setLocalTerms(!localTerms)}
        >
          <View style={[styles.checkbox, localTerms && styles.checkboxChecked]}>
            {localTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the Terms of Service
          </Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Policy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy Policy</Text>
        <ScrollView style={styles.legalScroll} nestedScrollEnabled>
          <Text style={styles.legalText}>
            Your privacy is important to us. Here's how we handle your data:{'\n\n'}
            • We collect business information to personalize your AI receptionist{'\n'}
            • Call recordings and transcripts are stored securely and encrypted{'\n'}
            • We do not sell your data to third parties{'\n'}
            • You can request deletion of your data at any time{'\n'}
            • We use industry-standard security measures to protect your information{'\n'}
            • Analytics data is used to improve our service{'\n'}
            • We comply with GDPR and UK data protection regulations
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setLocalPrivacy(!localPrivacy)}
        >
          <View style={[styles.checkbox, localPrivacy && styles.checkboxChecked]}>
            {localPrivacy && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Data Sharing Preferences (Optional) */}
      <View style={[styles.card, styles.optionalCard]}>
        <Text style={styles.cardTitle}>Data Sharing Preferences</Text>
        <Text style={styles.optionalNote}>
          These are optional. You can change these at any time from your dashboard settings.
        </Text>

        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <Text style={styles.switchTitle}>
              Help improve ReceptionAI for businesses like yours
            </Text>
            <Text style={styles.switchDescription}>
              Allow us to use anonymised, aggregated data from your knowledge base to improve suggestions for other businesses in your industry.
            </Text>
          </View>
          <Switch
            value={localDataSharing}
            onValueChange={setLocalDataSharing}
            trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
            thumbColor={localDataSharing ? '#4F46E5' : '#F3F4F6'}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <Text style={styles.switchTitle}>
              Receive product updates and tips
            </Text>
            <Text style={styles.switchDescription}>
              We'll occasionally send you emails about new features and best practices.
            </Text>
          </View>
          <Switch
            value={localMarketing}
            onValueChange={setLocalMarketing}
            trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
            thumbColor={localMarketing ? '#4F46E5' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>Accept & Continue</Text>
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
  optionalCard: {
    backgroundColor: '#F9FAFB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  optionalNote: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  legalScroll: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    maxHeight: 150,
    marginBottom: 16,
  },
  legalText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  switchContent: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  switchDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
