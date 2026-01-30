import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { getCustomerInfo, hasActiveSubscription, getActiveTier } from '../lib/revenuecat';

// Support URLs - update these with your actual URLs
const SUPPORT_URLS = {
  helpCenter: 'https://receptionai.com/help',
  contactSupport: 'mailto:support@receptionai.com',
  termsOfService: 'https://receptionai.com/terms',
  privacyPolicy: 'https://receptionai.com/privacy',
};

interface MerchantInfo {
  business_name: string;
  business_type: string | null;
  phone: string | null;
  twilio_phone_number: string | null;
  subscription_status: string;
  notifications_enabled: boolean;
}

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [rcTier, setRcTier] = useState<string | null>(null);
  const [rcActive, setRcActive] = useState(false);

  useEffect(() => {
    loadMerchant();
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const info = await getCustomerInfo();
      if (info) {
        setRcActive(hasActiveSubscription(info));
        setRcTier(getActiveTier(info));
      }
    } catch (e) {
      // RevenueCat may not be initialized yet
    }
  }

  async function loadMerchant() {
    if (!user) return;

    const { data } = await supabase
      .from('merchants')
      .select('business_name, business_type, phone, twilio_phone_number, subscription_status, notifications_enabled')
      .eq('id', user.id)
      .single();

    if (data) {
      setMerchant(data);
      setNotificationsEnabled(data.notifications_enabled ?? true);
    }
  }

  async function handleNotificationToggle(enabled: boolean) {
    if (!user || notificationLoading) return;

    setNotificationLoading(true);
    setNotificationsEnabled(enabled);

    const { error } = await supabase
      .from('merchants')
      .update({ notifications_enabled: enabled })
      .eq('id', user.id);

    if (error) {
      // Revert on error
      setNotificationsEnabled(!enabled);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    }

    setNotificationLoading(false);
  }

  function openURL(url: string) {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open link. Please try again.');
    });
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Business</Text>
            <Text style={styles.value}>{merchant?.business_name || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{merchant?.business_type || '-'}</Text>
          </View>
        </View>
      </View>

      {/* Phone Number Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Receptionist</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>
              {merchant?.twilio_phone_number
                ? formatPhone(merchant.twilio_phone_number)
                : 'Not assigned'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    rcActive || merchant?.subscription_status === 'active'
                      ? '#D1FAE5'
                      : merchant?.subscription_status === 'trial'
                      ? '#DBEAFE'
                      : '#FEE2E2',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      rcActive || merchant?.subscription_status === 'active'
                        ? '#065F46'
                        : merchant?.subscription_status === 'trial'
                        ? '#1E40AF'
                        : '#991B1B',
                  },
                ]}
              >
                {rcTier
                  ? `${rcTier.charAt(0).toUpperCase() + rcTier.slice(1)}`
                  : merchant?.subscription_status || 'unknown'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Subscription')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="card-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Manage Subscription</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Push Notifications</Text>
              <Text style={styles.sublabel}>
                Get notified about new calls and messages
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              disabled={notificationLoading}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={notificationsEnabled ? '#4F46E5' : '#F3F4F6'}
            />
          </View>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.helpCenter)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="help-circle-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.contactSupport)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="mail-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.termsOfService)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.privacyPolicy)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="shield-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.version}>ReceptionAI v1.0.0</Text>
    </ScrollView>
  );
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  if (phone.startsWith('+44')) {
    return phone.replace('+44', '0').replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontSize: 16,
    color: '#111827',
  },
  sublabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  value: {
    fontSize: 16,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 24,
    marginBottom: 40,
  },
});
