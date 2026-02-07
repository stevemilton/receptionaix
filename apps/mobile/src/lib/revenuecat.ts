import { Platform } from 'react-native';

// --- Types re-exported for consumers (so nothing else imports react-native-purchases directly) ---
export type RCCustomerInfo = {
  entitlements: {
    active: Record<string, unknown>;
  };
};
export type RCPackage = {
  identifier: string;
  offeringIdentifier: string;
  product: {
    title: string;
    description: string;
    priceString: string;
    identifier: string;
  };
};

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

let initialized = false;
let PurchasesModule: any = null;

/**
 * Attempt to load the native react-native-purchases module.
 * Returns null if the native module is not available (managed Expo build without config plugin).
 */
function getPurchases(): any {
  if (PurchasesModule !== null) return PurchasesModule;
  try {
    const mod = require('react-native-purchases');
    PurchasesModule = mod.default || mod;
    return PurchasesModule;
  } catch (e) {
    console.warn('[RevenueCat] Native module not available:', (e as Error).message);
    PurchasesModule = false; // Mark as attempted but failed
    return null;
  }
}

/**
 * Initialize RevenueCat with the user's Supabase ID.
 * Call this after successful login.
 * Safely no-ops if the native module is not available.
 */
export async function initRevenueCat(userId: string): Promise<void> {
  if (initialized) return;

  const Purchases = getPurchases();
  if (!Purchases) return;

  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

  if (!apiKey) {
    console.warn('[RevenueCat] No API key configured for', Platform.OS);
    return;
  }

  try {
    if (__DEV__) {
      const { LOG_LEVEL } = require('react-native-purchases');
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });

    initialized = true;
    console.log('[RevenueCat] Initialized for user:', userId);
  } catch (e) {
    console.error('[RevenueCat] Init failed:', e);
  }
}

/**
 * Get available subscription offerings.
 */
export async function getOfferings(): Promise<any | null> {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return null;
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a specific package.
 */
export async function purchasePackage(
  pkg: RCPackage
): Promise<RCCustomerInfo | null> {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return null;
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
export async function getCustomerInfo(): Promise<RCCustomerInfo | null> {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return null;
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error);
    return null;
  }
}

/**
 * Restore previous purchases (e.g., after reinstall).
 */
export async function restorePurchases(): Promise<RCCustomerInfo | null> {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return null;
    return await Purchases.restorePurchases();
  } catch (error) {
    console.error('[RevenueCat] Restore failed:', error);
    return null;
  }
}

/**
 * Check if user has an active subscription entitlement.
 */
export function hasActiveSubscription(customerInfo: RCCustomerInfo): boolean {
  return Object.keys(customerInfo.entitlements.active).length > 0;
}

/**
 * Get the active entitlement ID (tier name).
 */
export function getActiveTier(customerInfo: RCCustomerInfo): string | null {
  const activeEntitlements = Object.keys(customerInfo.entitlements.active);
  if (activeEntitlements.length === 0) return null;
  return activeEntitlements[0];
}
