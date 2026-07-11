/**
 * Subscription-tier message quotas, enforced by the inbound webhook handlers.
 * Tiers are persisted on the tenants table (subscription_tier / message_count).
 */
export const QUOTA_LIMITS: Record<string, number> = {
  Free: 50,
  Starter: 500,
  Business: 5000,
  Enterprise: Number.POSITIVE_INFINITY,
};

export function isOverQuota(tier: string | undefined, count: number | undefined): boolean {
  const limit = QUOTA_LIMITS[tier || 'Free'] ?? QUOTA_LIMITS.Free;
  return (count || 0) >= limit;
}
