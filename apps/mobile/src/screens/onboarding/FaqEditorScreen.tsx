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
            <Ionicons name="add" size={18} color="#4F46E5" />
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
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.tipText}>Keep answers concise - they'll be read aloud by your AI</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.tipText}>Include specific details like prices, times, or locations</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.tipText}>Think about what callers commonly ask your business</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.tipText}>You can always add more FAQs later from your dashboard</Text>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipLink}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedChip: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  suggestedChipText: {
    fontSize: 14,
    color: '#374151',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  faqItem: {
    backgroundColor: '#F9FAFB',
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
    fontWeight: '600',
    color: '#374151',
  },
  removeLink: {
    fontSize: 14,
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
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
    color: '#6B7280',
    lineHeight: 20,
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skipLink: {
    fontSize: 14,
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
