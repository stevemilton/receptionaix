import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { getCustomerInfo, hasActiveSubscription, getActiveTier } from '../lib/revenuecat';

// Support URLs
const SUPPORT_URLS = {
  helpCenter: 'https://receptionai.com/help',
  contactSupport: 'mailto:support@receptionai.com',
  termsOfService: 'https://receptionai.com/terms',
  privacyPolicy: 'https://receptionai.com/privacy',
};

interface MerchantInfo {
  business_name: string;
  business_type: string | null;
  address: string | null;
  phone: string | null;
  twilio_phone_number: string | null;
  forward_phone: string | null;
  greeting: string | null;
  voice_id: string | null;
  plan_status: string;
  notifications_enabled: boolean;
  google_calendar_connected: boolean;
}

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [rcTier, setRcTier] = useState<string | null>(null);
  const [rcActive, setRcActive] = useState(false);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMerchant();
      loadSubscription();
    }, [user])
  );

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

    try {
      const { data } = await supabase
        .from('merchants')
        .select('business_name, business_type, address, phone, twilio_phone_number, forward_phone, greeting, voice_id, plan_status, notifications_enabled, google_calendar_connected')
        .eq('id', user.id)
        .single();

      if (data) {
        setMerchant(data as MerchantInfo);
        setNotificationsEnabled(data.notifications_enabled ?? true);
      }
    } catch (e) {
      console.error('Error loading merchant:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      setNotificationsEnabled(!enabled);
      Alert.alert('Error', 'Failed to update notification settings.');
    }

    setNotificationLoading(false);
  }

  function openURL(url: string) {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open link.');
    });
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMerchant();
    loadSubscription();
  };

  const getSubscriptionStatus = () => {
    if (rcTier) {
      return rcTier.charAt(0).toUpperCase() + rcTier.slice(1);
    }
    if (merchant?.plan_status === 'active') return 'Active';
    if (merchant?.plan_status === 'trial') return 'Trial';
    return 'Inactive';
  };

  const getStatusColor = () => {
    if (rcActive || merchant?.plan_status === 'active') {
      return { bg: '#D1FAE5', text: '#065F46' };
    }
    if (merchant?.plan_status === 'trial') {
      return { bg: '#DBEAFE', text: '#1E40AF' };
    }
    return { bg: '#FEE2E2', text: '#991B1B' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const statusColor = getStatusColor();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Business Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Profile</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="business-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{merchant?.business_name || 'Business Name'}</Text>
              <Text style={styles.menuSublabel}>
                {[merchant?.business_type, merchant?.address].filter(Boolean).join(' • ') || 'Tap to edit business details'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Receptionist Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Receptionist</Text>
        <View style={styles.card}>
          {/* Phone Number */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="call-outline" size={20} color="#4F46E5" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>
                {merchant?.twilio_phone_number
                  ? formatPhone(merchant.twilio_phone_number)
                  : 'Not assigned'}
              </Text>
            </View>
            {merchant?.twilio_phone_number && (
              <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.statusText, { color: '#065F46' }]}>Active</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Forward Phone */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="arrow-forward-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.label}>Forward Calls To</Text>
              <Text style={styles.value}>
                {merchant?.forward_phone
                  ? formatPhone(merchant.forward_phone)
                  : merchant?.phone
                    ? formatPhone(merchant.phone)
                    : 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Knowledge Base */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('KnowledgeBase')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="book-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Knowledge Base</Text>
              <Text style={styles.menuSublabel}>Services, FAQs & opening hours</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Voice & Greeting */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('VoiceSettings')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="mic-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Voice & Greeting</Text>
              <Text style={styles.menuSublabel}>
                {merchant?.voice_id
                  ? `Voice: ${merchant.voice_id.charAt(0).toUpperCase() + merchant.voice_id.slice(1)}`
                  : 'Configure AI voice'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Calendar Integration */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('CalendarSettings')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="calendar-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Calendar</Text>
              <Text style={styles.menuSublabel}>
                {merchant?.google_calendar_connected
                  ? 'Google Calendar connected'
                  : 'Connect your calendar'}
              </Text>
            </View>
            {merchant?.google_calendar_connected ? (
              <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.statusText, { color: '#065F46' }]}>Connected</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscription Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="ribbon-outline" size={20} color="#4F46E5" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.label}>Plan</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {getSubscriptionStatus()}
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
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Manage Subscription</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="lock-closed-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="notifications-outline" size={20} color="#4F46E5" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.label}>Push Notifications</Text>
              <Text style={styles.sublabel}>New calls and messages</Text>
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
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Help Center</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.contactSupport)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="chatbubble-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Contact Support</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.termsOfService)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={22} color="#6B7280" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openURL(SUPPORT_URLS.privacyPolicy)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#6B7280" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#9CA3AF" />
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
    const local = phone.replace('+44', '0');
    if (local.length === 11) {
      return `${local.slice(0, 5)} ${local.slice(5, 8)} ${local.slice(8)}`;
    }
  }
  return phone;
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
    letterSpacing: 0.5,
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
    alignItems: 'center',
    padding: 16,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  value: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 60,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  menuSublabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
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
