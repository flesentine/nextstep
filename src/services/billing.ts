import { Subscription } from '@/types/domain';

export const PLUS_PRODUCT_IDS = {
  monthly: 'nextstep_plus_monthly',
  annual: 'nextstep_plus_annual'
} as const;

export const PURCHASES_ENABLED = process.env.EXPO_PUBLIC_PURCHASES_ENABLED === 'true';

export interface StoreEntitlement {
  tier: 'free' | 'premium';
  status: 'inactive' | 'trial' | 'active' | 'grace' | 'expired';
  productId?: string;
  expiresAt?: string;
}

export interface BillingAdapter {
  configure(userId: string): Promise<void>;
  getEntitlement(): Promise<StoreEntitlement>;
  purchase(productId: string): Promise<StoreEntitlement>;
  restore(): Promise<StoreEntitlement>;
  openSubscriptionManagement(): Promise<void>;
}

export function hasPlusAccess(
  subscription: Subscription,
  purchasesEnabled = PURCHASES_ENABLED
) {
  if (!purchasesEnabled) return true;
  return subscription.tier === 'premium' &&
    subscription.status !== 'expired';
}

export function trackedCaseLimit(
  subscription: Subscription,
  purchasesEnabled = PURCHASES_ENABLED
) {
  return hasPlusAccess(subscription, purchasesEnabled)
    ? Number.POSITIVE_INFINITY
    : 5;
}
