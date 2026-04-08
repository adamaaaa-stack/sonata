// ============================================================
// SUBSCRIPTION MANAGEMENT — Native only (StoreKit 2 / Google Play Billing)
// Web has no paywall — all features are free on the website
// ============================================================
import { isNative } from '@/lib/platform';

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

export async function initPurchases(): Promise<void> {
  if (!isNative()) return;
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

export async function getSubscriptionState(): Promise<SubscriptionState> {
  // Web: no paywall, always subscribed
  if (!isNative()) {
    return { isSubscribed: true, trialActive: false, trialDaysRemaining: 0, expirationDate: null };
  }

  // Native: check store purchases
  if (hasActiveSubscription || localStorage.getItem('sonata_subscribed') === 'true') {
    return { isSubscribed: true, trialActive: false, trialDaysRemaining: 0, expirationDate: null };
  }

  return checkLocalTrial();
}

export async function purchaseSubscription(): Promise<boolean> {
  if (!isNative()) return true; // Web is free
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
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Purchase failed:', e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    hasActiveSubscription = false;
    const { NativePurchases } = await import('@capgo/native-purchases');
    await NativePurchases.restorePurchases();
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (hasActiveSubscription) {
      localStorage.setItem('sonata_subscribed', 'true');
    } else {
      localStorage.removeItem('sonata_subscribed');
    }
    return hasActiveSubscription;
  } catch {
    return false;
  }
}

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
