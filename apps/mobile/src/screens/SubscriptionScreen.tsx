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
  type RCCustomerInfo,
  type RCPackage,
} from '../lib/revenuecat';
import { colors, typography, radius, shadow } from '../theme';
import { ScreenBackground } from '../components/ScreenBackground';

interface PackageInfo {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  rcPackage: RCPackage;
}

export function SubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [customerInfo, setCustomerInfo] = useState<RCCustomerInfo | null>(null);

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
        const pkgs = offerings.current.availablePackages.map((pkg: any) => ({
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isActive = customerInfo ? hasActiveSubscription(customerInfo) : false;
  const activeTier = customerInfo ? getActiveTier(customerInfo) : null;

  return (
    <ScreenBackground>
    <ScrollView style={styles.container}>
      {/* Current Plan */}
      {isActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.activePlanCard}>
            <View style={styles.activePlanRow}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
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
            <Ionicons name="pricetag-outline" size={32} color={colors.quaternaryLabel} />
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
                    <ActivityIndicator color={colors.white} size="small" />
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    ...typography.footnote,
    color: colors.tertiaryLabel,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  activePlanCard: {
    backgroundColor: colors.successFaint,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.success,
  },
  activePlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePlanName: {
    ...typography.headline,
    color: colors.successDark,
  },
  activePlanStatus: {
    ...typography.footnote,
    color: colors.successDark,
    marginTop: 1,
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
    ...shadow.sm,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  packageTitle: {
    ...typography.title3,
  },
  packagePrice: {
    ...typography.title3,
    fontWeight: '400',
    color: colors.primary,
  },
  packageDescription: {
    ...typography.subheadline,
    color: colors.tertiaryLabel,
    marginBottom: 12,
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  purchaseButtonText: {
    ...typography.headline,
    color: colors.white,
  },
  currentButton: {
    backgroundColor: colors.surfaceSecondary,
  },
  currentButtonText: {
    color: colors.quaternaryLabel,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  restoreText: {
    ...typography.subheadline,
    color: colors.primary,
    fontWeight: '400',
  },
  disclaimer: {
    ...typography.caption2,
    color: colors.quaternaryLabel,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    ...typography.subheadline,
    color: colors.tertiaryLabel,
    textAlign: 'center',
  },
});
