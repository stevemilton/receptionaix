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

interface Stats {
  callsToday: number;
  callsWeek: number;
  appointmentsToday: number;
  unreadMessages: number;
}

interface RecentCall {
  id: string;
  caller_phone: string;
  started_at: string;
  duration_seconds: number | null;
  status: string;
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
          .from('messages')
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
        <StatCard label="Calls Today" value={stats.callsToday} color="#4F46E5" />
        <StatCard label="This Week" value={stats.callsWeek} color="#10B981" />
        <StatCard label="Appointments" value={stats.appointmentsToday} color="#F59E0B" />
        <StatCard label="Messages" value={stats.unreadMessages} color="#EF4444" />
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
                  {new Date(call.started_at).toLocaleString('en-GB', {
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
                    { backgroundColor: call.status === 'completed' ? '#D1FAE5' : '#FEE2E2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: call.status === 'completed' ? '#065F46' : '#991B1B' },
                    ]}
                  >
                    {call.status}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  callItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  callPhone: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  callTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  callRight: {
    alignItems: 'flex-end',
  },
  callDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    padding: 20,
  },
});
