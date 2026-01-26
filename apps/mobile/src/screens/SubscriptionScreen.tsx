import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getOfferings,
  getCustomerInfo,
  purchasePackage,
  restorePurchases,
  hasActiveSubscription,
  getActiveTier,
} from '../lib/revenuecat';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

interface PackageInfo {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  rcPackage: PurchasesPackage;
}

export function SubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [offerings, info] = await Promise.all([
        getOfferings(),
        getCustomerInfo(),
      ]);

      setCustomerInfo(info);

      if (offerings?.current?.availablePackages) {
        const pkgs = offerings.current.availablePackages.map((pkg) => ({
          identifier: pkg.identifier,
          title: pkg.product.title,
          description: pkg.product.description,
          priceString: pkg.product.priceString,
          rcPackage: pkg,
        }));
        setPackages(pkgs);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(pkg: PackageInfo) {
    setPurchasing(true);
    try {
      const info = await purchasePackage(pkg.rcPackage);
      if (info) {
        setCustomerInfo(info);
        Alert.alert('Success', 'Your subscription is now active!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const info = await restorePurchases();
      if (info) {
        setCustomerInfo(info);
        if (hasActiveSubscription(info)) {
          Alert.alert('Restored', 'Your subscription has been restored.');
        } else {
          Alert.alert('No Subscription', 'No active subscription found to restore.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const isActive = customerInfo ? hasActiveSubscription(customerInfo) : false;
  const activeTier = customerInfo ? getActiveTier(customerInfo) : null;

  return (
    <ScrollView style={styles.container}>
      {/* Current Plan */}
      {isActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.activePlanCard}>
            <View style={styles.activePlanRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.activePlanName}>
                  {activeTier ? activeTier.charAt(0).toUpperCase() + activeTier.slice(1) : 'Active'} Plan
                </Text>
                <Text style={styles.activePlanStatus}>Active subscription</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Available Plans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isActive ? 'Change Plan' : 'Choose a Plan'}
        </Text>

        {packages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="pricetag-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              No subscription plans available at the moment.
            </Text>
          </View>
        ) : (
          packages.map((pkg) => {
            const isCurrent = activeTier === pkg.identifier.toLowerCase();
            return (
              <View key={pkg.identifier} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageTitle}>{pkg.title}</Text>
                  <Text style={styles.packagePrice}>{pkg.priceString}</Text>
                </View>
                {pkg.description ? (
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    isCurrent && styles.currentButton,
                  ]}
                  onPress={() => handlePurchase(pkg)}
                  disabled={purchasing || isCurrent}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.purchaseButtonText,
                        isCurrent && styles.currentButtonText,
                      ]}
                    >
                      {isCurrent ? 'Current Plan' : 'Subscribe'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Restore Purchases */}
      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Payment will be charged to your Apple ID or Google Play account. Subscriptions
        automatically renew unless cancelled at least 24 hours before the end of the current period.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  activePlanCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activePlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  activePlanStatus: {
    fontSize: 13,
    color: '#047857',
    marginTop: 2,
  },
  packageCard: {
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
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  purchaseButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentButton: {
    backgroundColor: '#E5E7EB',
  },
  currentButtonText: {
    color: '#9CA3AF',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  restoreText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
    lineHeight: 16,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
