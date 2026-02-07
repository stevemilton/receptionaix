import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

// Grok voice options - must match onboarding
const VOICE_OPTIONS = [
  { id: 'Ara', name: 'Ara', description: 'Warm & friendly (Female)', recommended: true },
  { id: 'Rex', name: 'Rex', description: 'Professional & articulate (Male)' },
  { id: 'Sal', name: 'Sal', description: 'Smooth & versatile (Neutral)' },
  { id: 'Eve', name: 'Eve', description: 'Energetic & engaging (Female)' },
  { id: 'Leo', name: 'Leo', description: 'Authoritative & commanding (Male)' },
];

interface VoiceData {
  voice_id: string;
  greeting: string;
  business_name: string;
}

export function VoiceSettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceData, setVoiceData] = useState<VoiceData>({
    voice_id: 'Ara',
    greeting: '',
    business_name: '',
  });

  useEffect(() => {
    loadVoiceSettings();
  }, []);

  async function loadVoiceSettings() {
    if (!user) return;

    const { data } = await supabase
      .from('merchants')
      .select('voice_id, greeting, business_name')
      .eq('id', user.id)
      .single();

    if (data) {
      setVoiceData({
        voice_id: data.voice_id || 'Ara',
        greeting: data.greeting || '',
        business_name: data.business_name || '',
      });
    }
    setLoading(false);
  }

  async function saveVoiceSettings() {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('merchants')
      .update({
        voice_id: voiceData.voice_id,
        greeting: voiceData.greeting.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } else {
      Alert.alert('Success', 'Voice settings updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  function selectVoice(voiceId: string) {
    setVoiceData({ ...voiceData, voice_id: voiceId });
  }

  function getDefaultGreeting(): string {
    const name = voiceData.business_name || 'our business';
    return `Good morning, thank you for calling ${name}. How can I help you today?`;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenBackground>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Voice Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Voice</Text>
          <Text style={styles.sectionDescription}>
            Choose the voice your AI receptionist will use when speaking to callers.
          </Text>

          <View style={styles.voiceGrid}>
            {VOICE_OPTIONS.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceOption,
                  voiceData.voice_id === voice.id && styles.voiceOptionSelected,
                ]}
                onPress={() => selectVoice(voice.id)}
              >
                <View style={styles.voiceHeader}>
                  <Text
                    style={[
                      styles.voiceName,
                      voiceData.voice_id === voice.id && styles.voiceNameSelected,
                    ]}
                  >
                    {voice.name}
                  </Text>
                  {voiceData.voice_id === voice.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.voiceDescription}>{voice.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Greeting Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Greeting Message</Text>
          <Text style={styles.sectionDescription}>
            This is what callers will hear when they first connect. Leave blank to use the default greeting.
          </Text>

          <TextInput
            style={styles.greetingInput}
            value={voiceData.greeting}
            onChangeText={(v) => setVoiceData({ ...voiceData, greeting: v })}
            placeholder={getDefaultGreeting()}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.useDefaultButton}
            onPress={() => setVoiceData({ ...voiceData, greeting: getDefaultGreeting() })}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.useDefaultButtonText}>Use Default Greeting</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
            <Text style={styles.tipsTitle}>Tips for Great Greetings</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Keep it under 20 seconds</Text>
            <Text style={styles.tipItem}>• Include your business name</Text>
            <Text style={styles.tipItem}>• Be warm and professional</Text>
            <Text style={styles.tipItem}>• End with how you can help</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveVoiceSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginBottom: 16,
    lineHeight: 20,
  },
  voiceGrid: {
    gap: 10,
  },
  voiceOption: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.separator,
    backgroundColor: '#FAFAFA',
  },
  voiceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  voiceNameSelected: {
    color: colors.primary,
  },
  voiceDescription: {
    fontSize: 13,
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  greetingInput: {
    backgroundColor: colors.grouped,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.label,
    minHeight: 120,
    lineHeight: 22,
  },
  useDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  useDefaultButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.primary,
    marginLeft: 6,
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#92400E',
    marginLeft: 8,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
});
