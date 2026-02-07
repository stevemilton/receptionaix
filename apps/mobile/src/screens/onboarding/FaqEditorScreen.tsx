import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingStore, OnboardingFAQ } from '../../lib/onboarding-store';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

const SUGGESTED_QUESTIONS = [
  'What are your opening hours?',
  'Do you accept walk-ins?',
  'What payment methods do you accept?',
  'Do I need to book in advance?',
  'What is your cancellation policy?',
  'Do you offer gift vouchers?',
  'Is parking available?',
  'Are you wheelchair accessible?',
];

export function FaqEditorScreen() {
  const navigation = useNavigation<any>();
  const {
    faqs,
    businessName,
    setFaqs,
    markStepCompleted,
    markStepSkipped,
    setCurrentStep,
  } = useOnboardingStore();

  // Debug: Log what we received from the store
  console.log('[FaqEditor] FAQs from store:', faqs.length, JSON.stringify(faqs, null, 2));

  const [localFaqs, setLocalFaqs] = useState<OnboardingFAQ[]>(
    faqs.length > 0 ? faqs : [{ question: '', answer: '' }]
  );

  const handleAddFAQ = () => {
    setLocalFaqs([...localFaqs, { question: '', answer: '' }]);
  };

  const handleRemoveFAQ = (index: number) => {
    setLocalFaqs(localFaqs.filter((_, i) => i !== index));
  };

  const handleFAQChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...localFaqs];
    updated[index] = { ...updated[index], [field]: value };
    setLocalFaqs(updated);
  };

  const handleAddSuggested = (question: string) => {
    const exists = localFaqs.some(
      (faq) => faq.question.toLowerCase() === question.toLowerCase()
    );
    if (exists) return;

    const emptyIndex = localFaqs.findIndex((faq) => !faq.question.trim());
    if (emptyIndex >= 0) {
      const updated = [...localFaqs];
      updated[emptyIndex] = { question, answer: '' };
      setLocalFaqs(updated);
    } else {
      setLocalFaqs([...localFaqs, { question, answer: '' }]);
    }
  };

  const unusedSuggestions = SUGGESTED_QUESTIONS.filter(
    (q) => !localFaqs.some((faq) => faq.question.toLowerCase() === q.toLowerCase())
  );

  const handleContinue = () => {
    const validFaqs = localFaqs.filter(
      (faq) => faq.question.trim() && faq.answer.trim()
    );
    console.log('[FaqEditor] Saving FAQs:', validFaqs.length, JSON.stringify(validFaqs, null, 2));
    setFaqs(validFaqs);

    markStepCompleted(5);
    setCurrentStep(6);
    navigation.navigate('PhoneSetup');
  };

  const handleSkip = () => {
    markStepSkipped(5);
    setCurrentStep(6);
    navigation.navigate('PhoneSetup');
  };

  const handleBack = () => {
    navigation.navigate('CalendarConnect');
  };

  return (
    <ScreenBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 5 of 8</Text>
        <Text style={styles.title}>Add frequently asked questions</Text>
        <Text style={styles.subtitle}>
          Help your AI receptionist answer common questions about {businessName || 'your business'}.
        </Text>
      </View>

      {/* Suggested Questions */}
      {unusedSuggestions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suggested Questions</Text>
          <Text style={styles.cardSubtitle}>Click to add these common questions:</Text>
          <View style={styles.suggestedGrid}>
            {unusedSuggestions.map((question) => (
              <TouchableOpacity
                key={question}
                style={styles.suggestedChip}
                onPress={() => handleAddSuggested(question)}
              >
                <Text style={styles.suggestedChipText}>+ {question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* FAQ Editor */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Your FAQs</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddFAQ}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addButtonText}>Add FAQ</Text>
          </TouchableOpacity>
        </View>

        {localFaqs.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqLabel}>FAQ {index + 1}</Text>
              {localFaqs.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveFAQ(index)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Question (e.g., Do you accept walk-ins?)"
              value={faq.question}
              onChangeText={(v) => handleFAQChange(index, 'question', v)}
            />
            <TextInput
              style={styles.textArea}
              placeholder="Answer (e.g., Yes, we welcome walk-ins but recommend booking in advance.)"
              value={faq.answer}
              onChangeText={(v) => handleFAQChange(index, 'answer', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        ))}
      </View>

      {/* Tips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tips for good FAQs</Text>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.tipText}>Keep answers concise - they'll be read aloud by your AI</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.tipText}>Include specific details like prices, times, or locations</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.tipText}>Think about what callers commonly ask your business</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.tipText}>You can always add more FAQs later from your dashboard</Text>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.secondaryLabel} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipLink}>Skip for now</Text>
          </TouchableOpacity>
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
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
    marginBottom: 8,
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
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginBottom: 12,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedChip: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  suggestedChipText: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '400',
    fontSize: 14,
  },
  faqItem: {
    backgroundColor: colors.grouped,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  removeLink: {
    fontSize: 14,
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separatorOpaque,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.label,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separatorOpaque,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.label,
    minHeight: 80,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.secondaryLabel,
    lineHeight: 20,
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
