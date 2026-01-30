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

interface Service {
  name: string;
  description?: string;
  duration?: number;
  price?: number;
}

interface FAQ {
  question: string;
  answer: string;
}

type TabType = 'services' | 'faqs' | 'hours';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_HOURS: Record<string, string> = {
  Monday: '9:00 AM - 5:00 PM',
  Tuesday: '9:00 AM - 5:00 PM',
  Wednesday: '9:00 AM - 5:00 PM',
  Thursday: '9:00 AM - 5:00 PM',
  Friday: '9:00 AM - 5:00 PM',
  Saturday: 'Closed',
  Sunday: 'Closed',
};

export function KnowledgeBaseScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openingHours, setOpeningHours] = useState<Record<string, string>>(DEFAULT_HOURS);

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  async function loadKnowledgeBase() {
    if (!user) return;

    console.log('[KnowledgeBaseScreen] Loading KB for user:', user.id);

    const { data, error } = await (supabase as any)
      .from('knowledge_bases')
      .select('*')
      .eq('merchant_id', user.id)
      .single();

    console.log('[KnowledgeBaseScreen] Query result:', { data, error });

    if (data) {
      console.log('[KnowledgeBaseScreen] Services from DB:', data.services);
      console.log('[KnowledgeBaseScreen] FAQs from DB:', data.faqs);
      console.log('[KnowledgeBaseScreen] Hours from DB:', data.opening_hours);

      setServices(Array.isArray(data.services) ? data.services : []);
      setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
      setOpeningHours(data.opening_hours || DEFAULT_HOURS);
    } else {
      console.log('[KnowledgeBaseScreen] No KB data found for user');
    }
    setLoading(false);
  }

  async function saveKnowledgeBase() {
    if (!user) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from('knowledge_bases')
      .upsert({
        merchant_id: user.id,
        services,
        faqs,
        opening_hours: openingHours,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'merchant_id',
      });

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } else {
      Alert.alert('Success', 'Knowledge base updated successfully');
    }
  }

  // Services
  function addService() {
    setServices([...services, { name: '', description: '', duration: 30, price: 0 }]);
  }

  function updateService(index: number, field: keyof Service, value: string | number) {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  }

  function removeService(index: number) {
    Alert.alert('Remove Service', 'Are you sure you want to remove this service?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setServices(services.filter((_, i) => i !== index));
      }},
    ]);
  }

  // FAQs
  function addFaq() {
    setFaqs([...faqs, { question: '', answer: '' }]);
  }

  function updateFaq(index: number, field: 'question' | 'answer', value: string) {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  }

  function removeFaq(index: number) {
    Alert.alert('Remove FAQ', 'Are you sure you want to remove this FAQ?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setFaqs(faqs.filter((_, i) => i !== index));
      }},
    ]);
  }

  // Hours
  function updateHours(day: string, value: string) {
    setOpeningHours({ ...openingHours, [day]: value });
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
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            Services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faqs' && styles.activeTab]}
          onPress={() => setActiveTab('faqs')}
        >
          <Text style={[styles.tabText, activeTab === 'faqs' && styles.activeTabText]}>
            FAQs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hours' && styles.activeTab]}
          onPress={() => setActiveTab('hours')}
        >
          <Text style={[styles.tabText, activeTab === 'hours' && styles.activeTabText]}>
            Hours
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Services Tab */}
        {activeTab === 'services' && (
          <View style={styles.content}>
            <Text style={styles.description}>
              Add the services you offer. Your AI will use this to help callers book appointments.
            </Text>

            {services.map((service, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Service {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeService(index)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={service.name}
                    onChangeText={(v) => updateService(index, 'name', v)}
                    placeholder="e.g., Haircut"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={service.description || ''}
                    onChangeText={(v) => updateService(index, 'description', v)}
                    placeholder="Brief description"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Duration (mins)</Text>
                    <TextInput
                      style={styles.input}
                      value={service.duration?.toString() || ''}
                      onChangeText={(v) => updateService(index, 'duration', parseInt(v) || 0)}
                      placeholder="30"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Price (£)</Text>
                    <TextInput
                      style={styles.input}
                      value={service.price?.toString() || ''}
                      onChangeText={(v) => updateService(index, 'price', parseFloat(v) || 0)}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addService}>
              <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.addButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <View style={styles.content}>
            <Text style={styles.description}>
              Add common questions and answers. Your AI will use these to respond to callers.
            </Text>

            {faqs.map((faq, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>FAQ {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeFaq(index)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Question</Text>
                  <TextInput
                    style={styles.input}
                    value={faq.question}
                    onChangeText={(v) => updateFaq(index, 'question', v)}
                    placeholder="e.g., Do you accept walk-ins?"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Answer</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={faq.answer}
                    onChangeText={(v) => updateFaq(index, 'answer', v)}
                    placeholder="The answer your AI will give"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addFaq}>
              <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.addButtonText}>Add FAQ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hours Tab */}
        {activeTab === 'hours' && (
          <View style={styles.content}>
            <Text style={styles.description}>
              Set your opening hours. Your AI will inform callers when you're open.
            </Text>

            <View style={styles.card}>
              {DAYS.map((day) => (
                <View key={day} style={styles.hourRow}>
                  <Text style={styles.dayLabel}>{day}</Text>
                  <TextInput
                    style={styles.hourInput}
                    value={openingHours[day] || ''}
                    onChangeText={(v) => updateHours(day, v)}
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveKnowledgeBase}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4F46E5',
    marginLeft: 8,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  hourInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
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
