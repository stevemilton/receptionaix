import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, typography, radius, shadow } from '../theme';
import { ScreenBackground } from '../components/ScreenBackground';

interface Call {
  id: string;
  caller_phone: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  transcript: string | null;
  summary: string | null;
}

export function CallsScreen() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  useEffect(() => {
    loadCalls();
  }, []);

  async function loadCalls() {
    if (!user) return;

    const { data } = await supabase
      .from('calls')
      .select('*')
      .eq('merchant_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50);

    setCalls(data || []);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalls();
    setRefreshing(false);
  };

  const renderCallItem = ({ item }: { item: Call }) => (
    <TouchableOpacity
      style={styles.callItem}
      onPress={() => setSelectedCall(item)}
    >
      <View style={styles.callIcon}>
        <Ionicons
          name={item.outcome === 'completed' ? 'call' : 'call-outline'}
          size={24}
          color={item.outcome === 'completed' ? colors.success : colors.error}
        />
      </View>
      <View style={styles.callContent}>
        <Text style={styles.callPhone}>{formatPhone(item.caller_phone)}</Text>
        <Text style={styles.callTime}>
          {new Date(item.started_at || '').toLocaleString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={styles.callMeta}>
        <Text style={styles.callDuration}>
          {item.duration_seconds
            ? `${Math.floor(item.duration_seconds / 60)}:${String(
                item.duration_seconds % 60
              ).padStart(2, '0')}`
            : '-'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.quaternaryLabel} />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
    <ScreenBackground>
      <FlatList
        data={calls}
        renderItem={renderCallItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.container}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={48} color={colors.separator} />
            <Text style={styles.emptyText}>No calls yet</Text>
            <Text style={styles.emptySubtext}>
              Calls will appear here when your AI receptionist handles them
            </Text>
          </View>
        }
      />
    </ScreenBackground>

      {/* Call Detail Modal */}
      <Modal
        visible={selectedCall !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCall(null)}
      >
        {selectedCall && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedCall(null)}
              >
                <Ionicons name="close" size={24} color={colors.label} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Call Details</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>
                  {formatPhone(selectedCall.caller_phone)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedCall.started_at || '').toLocaleString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {selectedCall.duration_seconds
                    ? `${Math.floor(selectedCall.duration_seconds / 60)} min ${
                        selectedCall.duration_seconds % 60
                      } sec`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selectedCall.outcome === 'completed'
                          ? colors.successFaint
                          : colors.errorFaint,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          selectedCall.outcome === 'completed'
                            ? colors.successDark
                            : colors.errorDark,
                      },
                    ]}
                  >
                    {selectedCall.outcome}
                  </Text>
                </View>
              </View>

              {selectedCall.summary && (
                <View style={styles.transcriptSection}>
                  <Text style={styles.transcriptLabel}>Summary</Text>
                  <Text style={styles.transcriptText}>{selectedCall.summary}</Text>
                </View>
              )}

              {selectedCall.transcript && (
                <View style={styles.transcriptSection}>
                  <Text style={styles.transcriptLabel}>Transcript</Text>
                  <Text style={styles.transcriptText}>
                    {selectedCall.transcript}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
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
  listContent: {
    padding: 16,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 6,
    ...shadow.sm,
  },
  callIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callContent: {
    flex: 1,
  },
  callPhone: {
    ...typography.headline,
  },
  callTime: {
    ...typography.caption1,
    color: colors.tertiaryLabel,
    marginTop: 2,
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callDuration: {
    ...typography.subheadline,
    color: colors.tertiaryLabel,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...typography.title3,
    color: colors.secondaryLabel,
    marginTop: 16,
  },
  emptySubtext: {
    ...typography.subheadline,
    color: colors.tertiaryLabel,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.headline,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  detailLabel: {
    ...typography.subheadline,
    color: colors.tertiaryLabel,
  },
  detailValue: {
    ...typography.subheadline,
    fontWeight: '400',
    color: colors.label,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    ...typography.caption2,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  transcriptSection: {
    marginTop: 24,
  },
  transcriptLabel: {
    ...typography.headline,
    marginBottom: 10,
  },
  transcriptText: {
    ...typography.body,
    color: colors.secondaryLabel,
    lineHeight: 22,
  },
});
