import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, typography, radius, shadow } from '../theme';
import { ScreenBackground } from '../components/ScreenBackground';

interface Stats {
  callsToday: number;
  callsWeek: number;
  appointmentsToday: number;
  unreadMessages: number;
}

interface RecentCall {
  id: string;
  caller_phone: string;
  started_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
}

export function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    callsToday: 0,
    callsWeek: 0,
    appointmentsToday: 0,
    unreadMessages: 0,
  });
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!user) return;

    // Get merchant info
    const { data: merchant } = await supabase
      .from('merchants')
      .select('business_name')
      .eq('id', user.id)
      .single();

    if (merchant) {
      setBusinessName(merchant.business_name);
    }

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [callsTodayRes, callsWeekRes, appointmentsRes, messagesRes, recentCallsRes] =
      await Promise.all([
        supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .gte('started_at', today.toISOString()),
        supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .gte('started_at', weekAgo.toISOString()),
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .gte('start_time', today.toISOString())
          .lt('start_time', new Date(today.getTime() + 86400000).toISOString()),
        supabase
          .from('messages' as any)
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .eq('read', false),
        supabase
          .from('calls')
          .select('*')
          .eq('merchant_id', user.id)
          .order('started_at', { ascending: false })
          .limit(5),
      ]);

    setStats({
      callsToday: callsTodayRes.count || 0,
      callsWeek: callsWeekRes.count || 0,
      appointmentsToday: appointmentsRes.count || 0,
      unreadMessages: messagesRes.count || 0,
    });

    setRecentCalls(recentCallsRes.data || []);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScreenBackground>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.businessName}>{businessName}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Calls Today" value={stats.callsToday} color={colors.primary} />
        <StatCard label="This Week" value={stats.callsWeek} color={colors.success} />
        <StatCard label="Appointments" value={stats.appointmentsToday} color={colors.warning} />
        <StatCard label="Messages" value={stats.unreadMessages} color={colors.error} />
      </View>

      {/* Recent Calls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Calls</Text>
        {recentCalls.length > 0 ? (
          recentCalls.map((call) => (
            <View key={call.id} style={styles.callItem}>
              <View>
                <Text style={styles.callPhone}>{formatPhone(call.caller_phone)}</Text>
                <Text style={styles.callTime}>
                  {new Date(call.started_at || '').toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.callRight}>
                <Text style={styles.callDuration}>
                  {call.duration_seconds
                    ? `${Math.floor(call.duration_seconds / 60)}:${String(
                        call.duration_seconds % 60
                      ).padStart(2, '0')}`
                    : '-'}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: call.outcome === 'completed' ? colors.successFaint : colors.errorFaint },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: call.outcome === 'completed' ? colors.successDark : colors.errorDark },
                    ]}
                  >
                    {call.outcome}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No calls yet</Text>
        )}
      </View>
    </ScrollView>
    </ScreenBackground>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  if (phone.startsWith('+44')) {
    return phone.replace('+44', '0').replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    ...typography.subheadline,
    color: 'rgba(255,255,255,0.7)',
  },
  businessName: {
    ...typography.title1,
    color: '#FFFFFF',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderLeftWidth: 3,
    ...shadow.sm,
  },
  statValue: {
    ...typography.metricValue,
  },
  statLabel: {
    ...typography.caption1,
    color: colors.tertiaryLabel,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: 10,
  },
  callItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 6,
    ...shadow.sm,
  },
  callPhone: {
    ...typography.headline,
  },
  callTime: {
    ...typography.caption1,
    color: colors.tertiaryLabel,
    marginTop: 2,
  },
  callRight: {
    alignItems: 'flex-end',
  },
  callDuration: {
    ...typography.subheadline,
    color: colors.secondaryLabel,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 4,
  },
  statusText: {
    ...typography.caption2,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  emptyText: {
    ...typography.subheadline,
    textAlign: 'center',
    color: colors.tertiaryLabel,
    padding: 20,
  },
});
