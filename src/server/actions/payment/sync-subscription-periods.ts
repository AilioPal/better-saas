'use server';

import { auth } from '@/lib/auth/auth';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import { StripeProvider } from '@/payment/stripe/provider';
import type { ActionResult } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import type { SubscriptionWithPeriod } from '@/types/stripe-extended';
import { headers } from 'next/headers';

const syncErrorLogger = new ErrorLogger('sync-subscription-periods');

export async function syncSubscriptionPeriods(): Promise<ActionResult<{ updated: number }>> {
  let session: { user?: { id: string } } | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    const stripeProvider = new StripeProvider();

    // Get all active subscriptions for the user that have null period dates
    const subscriptions = await paymentRepository.findByUserId(session.user.id);
    const activeSubscriptions = subscriptions.filter(
      (sub) =>
        sub.type === 'subscription' &&
        sub.subscriptionId &&
        ['active', 'trialing', 'past_due'].includes(sub.status) &&
        (!sub.periodStart || !sub.periodEnd)
    );

    let updatedCount = 0;

    for (const subscription of activeSubscriptions) {
      try {
        // Get fresh subscription data from Stripe
        if (!subscription.subscriptionId) continue;

        const stripeSubscription = await stripeProvider.getSubscription(
          subscription.subscriptionId
        );

        if (
          stripeSubscription &&
          (stripeSubscription.periodStart || stripeSubscription.periodEnd)
        ) {
          // Update the database with the correct period information
          await paymentRepository.update(subscription.id, {
            periodStart: stripeSubscription.periodStart,
            periodEnd: stripeSubscription.periodEnd,
            status: stripeSubscription.status,
            cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
          });

          updatedCount++;
        }
      } catch (error) {
        syncErrorLogger.logError(error as Error, {
          operation: 'syncSubscriptionPeriods',
          subscriptionId: subscription.subscriptionId,
          userId: session.user.id,
        });
        // Continue with other subscriptions even if one fails
      }
    }

    return {
      success: true,
      data: { updated: updatedCount },
      message: `Successfully updated ${updatedCount} subscription(s)`,
    };
  } catch (error) {
    syncErrorLogger.logError(error as Error, {
      operation: 'syncSubscriptionPeriods',
      userId: session?.user?.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步订阅期间失败',
    };
  }
}

export async function syncSingleSubscription(
  subscriptionId: string
): Promise<ActionResult<{ updated: boolean }>> {
  let session: { user?: { id: string } } | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    // Verify subscription belongs to current user
    const paymentRecord = await paymentRepository.findBySubscriptionId(subscriptionId);
    if (!paymentRecord || paymentRecord.userId !== session.user.id) {
      return {
        success: false,
        error: '订阅不存在或无权操作',
      };
    }

    const stripeProvider = new StripeProvider();

    // Get fresh subscription data directly from Stripe API with expanded data
    const { stripe } = await import('@/payment/stripe/client');
    const rawStripeSubscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'items.data.price'],
    });
    const rawStripeSubscription =
      rawStripeSubscriptionResponse as unknown as SubscriptionWithPeriod;

    // Get period information from subscription items (this is where Stripe stores the actual period info)
    const subscriptionItem = rawStripeSubscription.items?.data?.[0];

    if (!subscriptionItem?.current_period_start || !subscriptionItem?.current_period_end) {
      return {
        success: false,
        error: `Stripe 订阅项目缺少期间信息 - status: ${rawStripeSubscription.status}, created: ${new Date(rawStripeSubscription.created * 1000).toISOString()}`,
      };
    }

    // Convert timestamps to dates (use subscription item period info)
    const periodStart = new Date(subscriptionItem.current_period_start * 1000);
    const periodEnd = new Date(subscriptionItem.current_period_end * 1000);
    const trialStart = rawStripeSubscription.trial_start
      ? new Date(rawStripeSubscription.trial_start * 1000)
      : undefined;
    const trialEnd = rawStripeSubscription.trial_end
      ? new Date(rawStripeSubscription.trial_end * 1000)
      : undefined;

    // Update the database with the correct information
    await paymentRepository.update(paymentRecord.id, {
      periodStart,
      periodEnd,
      status: rawStripeSubscription.status as
        | 'active'
        | 'canceled'
        | 'past_due'
        | 'trialing'
        | 'incomplete'
        | 'incomplete_expired'
        | 'unpaid',
      cancelAtPeriodEnd: rawStripeSubscription.cancel_at_period_end,
      trialStart,
      trialEnd,
    });

    return {
      success: true,
      data: { updated: true },
      message: `订阅信息同步成功 - 期间: ${periodStart?.toLocaleDateString()} 到 ${periodEnd?.toLocaleDateString()}`,
    };
  } catch (error) {
    syncErrorLogger.logError(error as Error, {
      operation: 'syncSingleSubscription',
      subscriptionId,
      userId: session?.user?.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : '同步订阅信息失败',
    };
  }
}
