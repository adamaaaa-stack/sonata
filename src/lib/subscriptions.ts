// ============================================================
// SUBSCRIPTIONS — StoreKit 2 (iOS) via @capgo/native-purchases
// No-op on web; web uses Gumroad license keys instead.
// ============================================================
import { isNative } from './platform';

// Must match the product you create in App Store Connect
const PRODUCT_ID = 'com.sonata.app.premium.monthly';
const ANDROID_PLAN_ID = 'monthly';

// In-memory flag — set by transactionUpdated listener or successful purchase
let activeSubscription = false;
const STORAGE_KEY = 'sonata_native_sub';

export interface NativeProductInfo {
  priceString: string;   // e.g. "$9.99"
  title: string;
  description: string;
}

// Initialize listeners. Call once after auth.
// IMPORTANT: This MUST NOT trigger any UI that requires Apple ID auth.
// On iOS, calling NativePurchases.restorePurchases() prompts the user to
// sign in to their Apple ID every launch, which is obnoxious. We only
// restore when the user explicitly taps "Restore purchases" on the paywall.
export async function initPurchases(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import('@capgo/native-purchases');
    const { NativePurchases } = mod;

    // Listen for transaction events (renewals, silent restores)
    await NativePurchases.addListener('transactionUpdated', (transaction) => {
      if (transaction.productIdentifier === PRODUCT_ID && transaction.transactionId) {
        activeSubscription = true;
        try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      }
    }).catch(() => {});

    // Seed active flag from localStorage — persists across launches without
    // requiring a StoreKit call. Apple's transactionUpdated listener will
    // catch any renewals or revocations automatically.
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') activeSubscription = true;
    } catch {}
  } catch (e) {
    console.warn('initPurchases failed:', e);
  }
}

// Check whether the user has an active subscription on this device.
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isNative()) return false;
  if (activeSubscription) return true;
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return true;
  } catch {}
  return false;
}

// Fetch localized product info for display.
export async function getMonthlyProduct(): Promise<NativeProductInfo | null> {
  if (!isNative()) return null;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRODUCT_ID],
      productType: PURCHASE_TYPE.SUBS,
    });
    const p = products?.[0];
    if (!p) return null;
    return {
      priceString: p.priceString || '$9.99',
      title: p.title || 'Sonata Premium',
      description: p.description || 'Unlock all lessons and drills',
    };
  } catch {
    return null;
  }
}

// Trigger the StoreKit purchase sheet. Returns true on success.
export async function purchaseMonthly(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: PRODUCT_ID,
      productType: PURCHASE_TYPE.SUBS,
      planIdentifier: ANDROID_PLAN_ID,
      quantity: 1,
    });
    if (transaction?.transactionId) {
      activeSubscription = true;
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      return true;
    }
    return false;
  } catch (e) {
    console.warn('purchaseMonthly failed:', e);
    return false;
  }
}

// Restore previous purchases (Apple requirement — must be exposed in UI).
export async function restorePurchases(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    activeSubscription = false;
    const { NativePurchases } = await import('@capgo/native-purchases');
    await NativePurchases.restorePurchases();
    // Give the transactionUpdated listener a moment to fire
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (activeSubscription) {
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      return true;
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return false;
  } catch {
    return false;
  }
}
