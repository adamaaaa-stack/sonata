// ============================================================
// SUBSCRIPTION MANAGEMENT
// Web: Freemius checkout | Native: StoreKit 2 / Google Play Billing
// Syncs to Supabase for cross-device persistence
// ============================================================
import { isNative } from '@/lib/platform';
import { loadSubscription, saveSubscription } from '@/lib/supabaseData';

export interface SubscriptionState {
  isSubscribed: boolean;
  trialActive: boolean;
  trialDaysRemaining: number;
  expirationDate: string | null;
}

const TRIAL_DAYS = 7;
const PRODUCT_ID = 'sonata_monthly';
const ANDROID_PLAN_ID = 'monthly';

let hasActiveSubscription = false;
// User ID set during init for Supabase sync
let currentUserId: string | null = null;

// Initialize — set up native listeners + check Supabase
export async function initPurchases(userId?: string): Promise<void> {
  if (userId) currentUserId = userId;

  if (isNative()) {
    try {
      const { NativePurchases } = await import('@capgo/native-purchases');
      await NativePurchases.addListener('transactionUpdated', (transaction) => {
        if (transaction.productIdentifier === PRODUCT_ID && transaction.transactionId) {
          hasActiveSubscription = true;
          localStorage.setItem('sonata_subscribed', 'true');
        }
      });
      await NativePurchases.restorePurchases();
    } catch (e) {
      console.warn('Native purchases init failed:', e);
    }
  }
}

// Check subscription state: Supabase → localStorage → local trial
export async function getSubscriptionState(userId?: string): Promise<SubscriptionState> {
  const uid = userId || currentUserId;

  // 1. Check Supabase (authoritative, cross-device)
  if (uid) {
    try {
      const row = await loadSubscription(uid);
      if (row && (row.status === 'active' || row.status === 'trial')) {
        localStorage.setItem('sonata_subscribed', 'true');
        return {
          isSubscribed: true,
          trialActive: row.status === 'trial',
          trialDaysRemaining: 0,
          expirationDate: row.expires_at || null,
        };
      }
      if (row && (row.status === 'cancelled' || row.status === 'expired')) {
        localStorage.removeItem('sonata_subscribed');
        return {
          isSubscribed: false,
          trialActive: false,
          trialDaysRemaining: 0,
          expirationDate: row.expires_at || null,
        };
      }
    } catch {
      // DB unavailable — fall through to localStorage
    }
  }

  // 2. Check localStorage (offline cache)
  if (isNative()) {
    if (hasActiveSubscription || localStorage.getItem('sonata_subscribed') === 'true') {
      return { isSubscribed: true, trialActive: false, trialDaysRemaining: 0, expirationDate: null };
    }
  }
  if (!isNative() && typeof window !== 'undefined') {
    if (localStorage.getItem('sonata_subscribed') === 'true') {
      return { isSubscribed: true, trialActive: false, trialDaysRemaining: 0, expirationDate: null };
    }
  }

  // 3. Fallback: local trial
  return checkLocalTrial();
}

// Purchase — native: StoreKit/Google, web: Freemius. Saves to Supabase.
export async function purchaseSubscription(): Promise<boolean> {
  if (isNative()) {
    try {
      const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: PRODUCT_ID,
        productType: PURCHASE_TYPE.SUBS,
        planIdentifier: ANDROID_PLAN_ID,
        quantity: 1,
      });
      if (transaction?.transactionId) {
        hasActiveSubscription = true;
        localStorage.setItem('sonata_subscribed', 'true');
        // Sync to Supabase
        if (currentUserId) {
          const platform = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android';
          await saveSubscription(currentUserId, { platform, status: 'active' });
        }
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Purchase failed:', e);
      return false;
    }
  }

  // Web: Freemius checkout
  return openFreemiusCheckout();
}

// Freemius checkout for web
function openFreemiusCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    const win = window as unknown as Record<string, unknown>;
    if (!win.FS) {
      const script = document.createElement('script');
      script.src = 'https://checkout.freemius.com/js/v1/';
      script.onload = () => doFreemiusOpen(resolve);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    } else {
      doFreemiusOpen(resolve);
    }
  });
}

function doFreemiusOpen(resolve: (v: boolean) => void): void {
  const FS = (window as unknown as Record<string, unknown>).FS as {
    Checkout: new (opts: Record<string, unknown>) => {
      open: (opts: Record<string, unknown>) => void;
    };
  };
  const handler = new FS.Checkout({
    product_id: '27412',
    plan_id: '45340',
    public_key: 'pk_a254fd50651f91cca27fc33788017',
    image: 'https://learnwithsonata.com/icon.svg',
  });
  handler.open({
    name: 'Sonata',
    licenses: 1,
    trial_period: 7,
    purchaseCompleted: async (response: { user: { email: string; id: string }; license: { key: string } }) => {
      localStorage.setItem('sonata_subscribed', 'true');
      localStorage.setItem('sonata_license', response.license.key);
      localStorage.setItem('sonata_email', response.user.email);
      // Sync to Supabase
      if (currentUserId) {
        await saveSubscription(currentUserId, {
          platform: 'web',
          status: 'active',
          license_key: response.license.key,
          freemius_user_id: String(response.user.id),
          email: response.user.email,
        });
      }
      resolve(true);
    },
    success: () => {},
    cancel: () => { resolve(false); },
  });
}

// Restore previous purchases (Apple requirement)
export async function restorePurchases(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    hasActiveSubscription = false;
    const { NativePurchases } = await import('@capgo/native-purchases');
    await NativePurchases.restorePurchases();
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (hasActiveSubscription) {
      localStorage.setItem('sonata_subscribed', 'true');
      if (currentUserId) {
        const platform = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android';
        await saveSubscription(currentUserId, { platform, status: 'active' });
      }
    } else {
      localStorage.removeItem('sonata_subscribed');
    }
    return hasActiveSubscription;
  } catch {
    return false;
  }
}

// Get product info for display — never hardcode prices
export async function getProductInfo(): Promise<{ priceString: string; title: string } | null> {
  if (!isNative()) return null;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const { product } = await NativePurchases.getProduct({
      productIdentifier: PRODUCT_ID,
      productType: PURCHASE_TYPE.SUBS,
    });
    return {
      priceString: product?.priceString || '$9.99',
      title: product?.title || 'Sonata Monthly',
    };
  } catch {
    return null;
  }
}

// Local trial: 7 days from first app open
function checkLocalTrial(): SubscriptionState {
  if (typeof window === 'undefined') {
    return { isSubscribed: false, trialActive: true, trialDaysRemaining: TRIAL_DAYS, expirationDate: null };
  }
  const key = 'sonata_install_date';
  const installDate = localStorage.getItem(key);
  if (!installDate) {
    localStorage.setItem(key, new Date().toISOString());
    return { isSubscribed: false, trialActive: true, trialDaysRemaining: TRIAL_DAYS, expirationDate: null };
  }
  const daysSince = Math.floor((Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24));
  const remaining = Math.max(0, TRIAL_DAYS - daysSince);
  return {
    isSubscribed: false,
    trialActive: remaining > 0,
    trialDaysRemaining: remaining,
    expirationDate: null,
  };
}
