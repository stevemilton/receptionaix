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
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface ProfileData {
  business_name: string;
  business_type: string;
  address: string;
  phone: string;
  forward_phone: string;
}

export function EditProfileScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    business_name: '',
    business_type: '',
    address: '',
    phone: '',
    forward_phone: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!user) return;

    const { data } = await supabase
      .from('merchants')
      .select('business_name, business_type, address, phone, forward_phone')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        business_name: data.business_name || '',
        business_type: data.business_type || '',
        address: data.address || '',
        phone: data.phone || '',
        forward_phone: data.forward_phone || '',
      });
    }
    setLoading(false);
  }

  async function saveProfile() {
    if (!user) return;
    if (!profile.business_name.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('merchants')
      .update({
        business_name: profile.business_name.trim(),
        business_type: profile.business_type.trim() || null,
        address: profile.address.trim() || null,
        phone: profile.phone.trim() || null,
        forward_phone: profile.forward_phone.trim() || profile.phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } else {
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  function updateField(field: keyof ProfileData, value: string) {
    setProfile({ ...profile, [field]: value });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={profile.business_name}
              onChangeText={(v) => updateField('business_name', v)}
              placeholder="Your business name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Type</Text>
            <TextInput
              style={styles.input}
              value={profile.business_type}
              onChangeText={(v) => updateField('business_type', v)}
              placeholder="e.g., Hair Salon, Dental Practice"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={profile.address}
              onChangeText={(v) => updateField('address', v)}
              placeholder="Business address"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={(v) => updateField('phone', v)}
              placeholder="Your contact number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>
              Main contact number for your business
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Forward Calls To</Text>
            <TextInput
              style={styles.input}
              value={profile.forward_phone}
              onChangeText={(v) => updateField('forward_phone', v)}
              placeholder="Phone number to forward calls"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>
              When the AI needs to transfer a call, it will forward to this number.
              Leave blank to use your contact phone.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
