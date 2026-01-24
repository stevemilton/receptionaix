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
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface MerchantInfo {
  business_name: string;
  business_type: string | null;
  phone: string | null;
  twilio_phone_number: string | null;
  subscription_status: string;
}

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadMerchant();
  }, []);

  async function loadMerchant() {
    if (!user) return;

    const { data } = await supabase
      .from('merchants')
      .select('business_name, business_type, phone, twilio_phone_number, subscription_status')
      .eq('id', user.id)
      .single();

    if (data) {
      setMerchant(data);
    }
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
                    merchant?.subscription_status === 'active'
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
                      merchant?.subscription_status === 'active'
                        ? '#065F46'
                        : merchant?.subscription_status === 'trial'
                        ? '#1E40AF'
                        : '#991B1B',
                  },
                ]}
              >
                {merchant?.subscription_status || 'unknown'}
              </Text>
            </View>
          </View>
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
              onValueChange={setNotificationsEnabled}
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
          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Ionicons name="help-circle-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Ionicons name="mail-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow}>
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
