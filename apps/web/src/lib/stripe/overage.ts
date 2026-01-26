import { getStripe } from './config';

/**
 * Report a metered usage record to Stripe for overage billing.
 * Each unit = 1 overage call at £0.50.
 *
 * Uses the Stripe API to create usage records on a metered subscription item.
 * The subscription item must be configured with metered billing in Stripe.
 */
export async function reportOverageUsage(
  subscriptionItemId: string,
  quantity: number = 1
): Promise<void> {
  const stripe = getStripe();

  // Use the raw Stripe API to create usage records
  // This works across Stripe API versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (stripe as any).subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    }
  );
}
