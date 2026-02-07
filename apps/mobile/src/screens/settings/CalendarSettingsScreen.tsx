import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

export function CalendarSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadCalendarStatus();
  }, []);

  async function loadCalendarStatus() {
    if (!user) return;

    const { data } = await supabase
      .from('merchants')
      .select('google_calendar_connected')
      .eq('id', user.id)
      .single();

    if (data) {
      setIsConnected(data.google_calendar_connected || false);
    }
    setLoading(false);
  }

  function handleConnect() {
    // In a real implementation, this would open the OAuth flow
    // For now, show instructions to use the web dashboard
    Alert.alert(
      'Connect Calendar',
      'To connect your Google Calendar, please use the web dashboard at receptionai.com. Calendar connection requires secure authentication that is best done on a web browser.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Web Dashboard',
          onPress: () => Linking.openURL('https://receptionai.com/dashboard/settings'),
        },
      ]
    );
  }

  function handleDisconnect() {
    Alert.alert(
      'Disconnect Calendar',
      'Are you sure you want to disconnect your Google Calendar? Your AI receptionist will no longer be able to check your availability.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('merchants')
              .update({
                google_calendar_connected: false,
                google_calendar_token: null,
              })
              .eq('id', user!.id);

            if (error) {
              Alert.alert('Error', 'Failed to disconnect calendar');
            } else {
              setIsConnected(false);
              Alert.alert('Success', 'Calendar disconnected');
            }
          },
        },
      ]
    );
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={32} color={colors.primary} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Google Calendar</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isConnected ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>
            {isConnected ? 'What your calendar enables' : 'Why connect your calendar?'}
          </Text>

          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>
              AI checks your real-time availability
            </Text>
          </View>

          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>
              Bookings automatically added to your calendar
            </Text>
          </View>

          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>
              Avoid double-bookings
            </Text>
          </View>

          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>
              Callers get accurate appointment times
            </Text>
          </View>
        </View>

        {/* Action Button */}
        {isConnected ? (
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Ionicons name="unlink-outline" size={20} color="#EF4444" />
            <Text style={styles.disconnectButtonText}>Disconnect Calendar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
            <Ionicons name="logo-google" size={20} color={colors.white} />
            <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
          </TouchableOpacity>
        )}

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.secondaryLabel} />
          <Text style={styles.privacyText}>
            We only access your calendar to check availability and create appointments.
            We never read, share, or store other calendar data.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.label,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.label,
    marginBottom: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginLeft: 10,
    flex: 1,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  connectButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '400',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  disconnectButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '400',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: colors.secondaryLabel,
    marginLeft: 8,
    lineHeight: 18,
  },
});
