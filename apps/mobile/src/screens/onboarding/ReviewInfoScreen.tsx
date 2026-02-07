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
import { useOnboardingStore, OnboardingService } from '../../lib/onboarding-store';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function ReviewInfoScreen() {
  const navigation = useNavigation<any>();
  const {
    businessName,
    businessType,
    address,
    phone,
    website,
    services,
    openingHours,
    setBusinessInfo,
    setServices,
    setOpeningHours,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  // Debug: Log what we received from the store
  console.log('[ReviewInfo] Services from store:', services.length, JSON.stringify(services, null, 2));
  console.log('[ReviewInfo] Opening hours from store:', JSON.stringify(openingHours, null, 2));

  const [localBusinessName, setLocalBusinessName] = useState(businessName);
  const [localBusinessType, setLocalBusinessType] = useState(businessType);
  const [localAddress, setLocalAddress] = useState(address);
  const [localPhone, setLocalPhone] = useState(phone);
  const [localWebsite, setLocalWebsite] = useState(website || '');
  const [localServices, setLocalServices] = useState<OnboardingService[]>(
    services.length > 0 ? services : [{ name: '', description: '', duration: 30, price: 0 }]
  );
  const [localHours, setLocalHours] = useState<Record<string, string>>(() => {
    if (Object.keys(openingHours).length > 0) {
      const normalized: Record<string, string> = {};
      for (const day of DAYS_OF_WEEK) {
        const lowerDay = day.toLowerCase();
        normalized[day] = openingHours[day] || openingHours[lowerDay] || '';
      }
      return normalized;
    }
    return DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: '09:00 - 17:00' }), {});
  });

  const handleAddService = () => {
    setLocalServices([...localServices, { name: '', description: '', duration: 30, price: 0 }]);
  };

  const handleRemoveService = (index: number) => {
    setLocalServices(localServices.filter((_, i) => i !== index));
  };

  const handleServiceChange = (
    index: number,
    field: keyof OnboardingService,
    value: string | number
  ) => {
    const updated = [...localServices];
    updated[index] = { ...updated[index], [field]: value };
    setLocalServices(updated);
  };

  const handleHoursChange = (day: string, value: string) => {
    setLocalHours({ ...localHours, [day]: value });
  };

  const handleContinue = () => {
    setBusinessInfo({
      businessName: localBusinessName,
      businessType: localBusinessType,
      address: localAddress,
      phone: localPhone,
      website: localWebsite || null,
    });

    const validServices = localServices.filter((s) => s.name.trim() !== '');
    console.log('[ReviewInfo] Saving services:', validServices.length, JSON.stringify(validServices, null, 2));
    console.log('[ReviewInfo] Saving opening hours:', JSON.stringify(localHours, null, 2));

    setServices(validServices);
    setOpeningHours(localHours);

    markStepCompleted(2);
    setCurrentStep(3);
    navigation.navigate('AiGreeting');
  };

  const handleBack = () => {
    navigation.navigate('BusinessSearch');
  };

  return (
    <ScreenBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 2 of 8</Text>
        <Text style={styles.title}>Review your information</Text>
        <Text style={styles.subtitle}>
          Confirm and edit your business details. This information will help your AI receptionist.
        </Text>
      </View>

      {/* Business Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business Details</Text>

        <Text style={styles.label}>Business name</Text>
        <TextInput
          style={styles.input}
          value={localBusinessName}
          onChangeText={setLocalBusinessName}
          placeholder="Your business name"
        />

        <Text style={styles.label}>Business type</Text>
        <TextInput
          style={styles.input}
          value={localBusinessType}
          onChangeText={setLocalBusinessType}
          placeholder="e.g. Hair Salon, Dental Practice"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={localAddress}
          onChangeText={setLocalAddress}
          placeholder="Full business address"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={localPhone}
          onChangeText={setLocalPhone}
          placeholder="+44 20 1234 5678"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Website (optional)</Text>
        <TextInput
          style={styles.input}
          value={localWebsite}
          onChangeText={setLocalWebsite}
          placeholder="https://www.example.com"
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      {/* Services */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Services</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {localServices.map((service, index) => (
          <View key={index} style={styles.serviceItem}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceLabel}>Service {index + 1}</Text>
              {localServices.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveService(index)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Service name"
              value={service.name}
              onChangeText={(v) => handleServiceChange(index, 'name', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={service.description || ''}
              onChangeText={(v) => handleServiceChange(index, 'description', v)}
            />
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Duration (mins)"
                  value={service.duration?.toString() || ''}
                  onChangeText={(v) => handleServiceChange(index, 'duration', parseInt(v) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Price (£)"
                  value={service.price?.toString() || ''}
                  onChangeText={(v) => handleServiceChange(index, 'price', parseFloat(v) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Opening Hours */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Opening Hours</Text>
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={styles.hoursRow}>
            <Text style={styles.dayLabel}>{day}</Text>
            <TextInput
              style={[styles.input, styles.hoursInput]}
              value={localHours[day] || ''}
              onChangeText={(v) => handleHoursChange(day, v)}
              placeholder="09:00 - 17:00 or Closed"
            />
          </View>
        ))}
        <Text style={styles.helperText}>
          Enter times like "09:00 - 17:00" or "Closed"
        </Text>
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
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.grouped,
    borderWidth: 1,
    borderColor: colors.separatorOpaque,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.label,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: colors.tertiaryLabel,
    marginTop: 4,
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
  serviceItem: {
    backgroundColor: colors.grouped,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  removeLink: {
    fontSize: 14,
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dayLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  hoursInput: {
    flex: 1,
    marginBottom: 0,
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
