import { Platform } from 'react-native';
import Purchases, {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

let initialized = false;

/**
 * Initialize RevenueCat with the user's Supabase ID.
 * Call this after successful login.
 */
export async function initRevenueCat(userId: string): Promise<void> {
  if (initialized) return;

  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

  if (!apiKey) {
    console.warn('[RevenueCat] No API key configured for', Platform.OS);
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  });

  initialized = true;
  console.log('[RevenueCat] Initialized for user:', userId);
}

/**
 * Get available subscription offerings.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a specific package.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: unknown) {
    const purchaseError = error as { userCancelled?: boolean };
    if (purchaseError.userCancelled) {
      console.log('[RevenueCat] User cancelled purchase');
      return null;
    }
    console.error('[RevenueCat] Purchase failed:', error);
    throw error;
  }
}

/**
 * Get current customer info (subscription status).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info;
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error);
    return null;
  }
}

/**
 * Restore previous purchases (e.g., after reinstall).
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const info = await Purchases.restorePurchases();
    return info;
  } catch (error) {
    console.error('[RevenueCat] Restore failed:', error);
    return null;
  }
}

/**
 * Check if user has an active subscription entitlement.
 */
export function hasActiveSubscription(customerInfo: CustomerInfo): boolean {
  return Object.keys(customerInfo.entitlements.active).length > 0;
}

/**
 * Get the active entitlement ID (tier name).
 */
export function getActiveTier(customerInfo: CustomerInfo): string | null {
  const activeEntitlements = Object.keys(customerInfo.entitlements.active);
  if (activeEntitlements.length === 0) return null;
  return activeEntitlements[0]; // e.g. 'starter', 'professional', 'enterprise'
}
