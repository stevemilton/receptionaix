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
import { useOnboardingStore } from '../../lib/onboarding-store';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

const VOICE_OPTIONS = [
  { id: 'Ara', name: 'Ara', description: 'Warm & friendly (Female)', recommended: true },
  { id: 'Rex', name: 'Rex', description: 'Professional & articulate (Male)' },
  { id: 'Sal', name: 'Sal', description: 'Smooth & versatile (Neutral)' },
  { id: 'Eve', name: 'Eve', description: 'Energetic & engaging (Female)' },
  { id: 'Leo', name: 'Leo', description: 'Authoritative & commanding (Male)' },
];

const GREETING_TEMPLATES = [
  {
    id: 'professional',
    name: 'Professional',
    template: "Hello, thank you for calling {businessName}. How may I assist you today?",
  },
  {
    id: 'friendly',
    name: 'Friendly',
    template: "Hi there! Welcome to {businessName}. How can I help you?",
  },
  {
    id: 'formal',
    name: 'Formal',
    template: "Good day, you've reached {businessName}. How may I direct your call?",
  },
  {
    id: 'custom',
    name: 'Custom',
    template: '',
  },
];

export function AiGreetingScreen() {
  const navigation = useNavigation<any>();
  const {
    businessName,
    greeting,
    voiceId,
    setGreeting,
    setVoiceId,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [selectedTemplate, setSelectedTemplate] = useState(
    GREETING_TEMPLATES.find((t) => t.template === greeting)?.id || 'custom'
  );
  const [localGreeting, setLocalGreeting] = useState(
    greeting.replace('{businessName}', businessName || 'your business')
  );
  const [localVoiceId, setLocalVoiceId] = useState(voiceId);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = GREETING_TEMPLATES.find((t) => t.id === templateId);
    if (template && template.template) {
      setLocalGreeting(template.template.replace('{businessName}', businessName || 'your business'));
    }
  };

  const handleContinue = () => {
    const greetingWithPlaceholder = localGreeting.replace(
      businessName || 'your business',
      '{businessName}'
    );
    setGreeting(greetingWithPlaceholder);
    setVoiceId(localVoiceId);

    markStepCompleted(3);
    setCurrentStep(4);
    navigation.navigate('CalendarConnect');
  };

  const handleBack = () => {
    navigation.navigate('ReviewInfo');
  };

  return (
    <ScreenBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 3 of 8</Text>
        <Text style={styles.title}>Customize your AI greeting</Text>
        <Text style={styles.subtitle}>
          Choose how your AI receptionist will greet callers.
        </Text>
      </View>

      {/* Greeting Templates */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Greeting Style</Text>
        <View style={styles.templateGrid}>
          {GREETING_TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateButton,
                selectedTemplate === template.id && styles.templateButtonSelected,
              ]}
              onPress={() => handleTemplateSelect(template.id)}
            >
              <Text
                style={[
                  styles.templateButtonText,
                  selectedTemplate === template.id && styles.templateButtonTextSelected,
                ]}
              >
                {template.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Greeting */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Greeting</Text>
        <TextInput
          style={styles.textArea}
          value={localGreeting}
          onChangeText={(v) => {
            setLocalGreeting(v);
            setSelectedTemplate('custom');
          }}
          placeholder="Enter your custom greeting..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Text style={styles.helperText}>
          Tip: Use a friendly, welcoming tone that matches your brand.
        </Text>
      </View>

      {/* Voice Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voice Selection</Text>
        <Text style={styles.cardSubtitle}>
          Choose a voice for your AI receptionist. Powered by Grok.
        </Text>

        {VOICE_OPTIONS.map((voice) => (
          <TouchableOpacity
            key={voice.id}
            style={[
              styles.voiceOption,
              localVoiceId === voice.id && styles.voiceOptionSelected,
            ]}
            onPress={() => setLocalVoiceId(voice.id)}
          >
            <View
              style={[
                styles.voiceIcon,
                localVoiceId === voice.id && styles.voiceIconSelected,
              ]}
            >
              <Ionicons
                name="mic"
                size={20}
                color={localVoiceId === voice.id ? '#fff' : '#6B7280'}
              />
            </View>
            <View style={styles.voiceInfo}>
              <View style={styles.voiceNameRow}>
                <Text style={styles.voiceName}>{voice.name}</Text>
                {voice.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </View>
              <Text style={styles.voiceDescription}>{voice.description}</Text>
            </View>
            {localVoiceId === voice.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.secondaryLabel} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
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
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginBottom: 16,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.separator,
    backgroundColor: colors.surface,
  },
  templateButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  templateButtonTextSelected: {
    color: colors.primary,
  },
  textArea: {
    backgroundColor: colors.grouped,
    borderWidth: 1,
    borderColor: colors.separatorOpaque,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.label,
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    color: colors.tertiaryLabel,
    marginTop: 8,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.separator,
    marginBottom: 8,
  },
  voiceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  voiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voiceIconSelected: {
    backgroundColor: colors.primary,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.label,
  },
  recommendedBadge: {
    backgroundColor: colors.primaryFaint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recommendedText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '400',
  },
  voiceDescription: {
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
