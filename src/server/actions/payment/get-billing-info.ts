'use server';

import { auth } from '@/lib/auth/auth';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import type { ActionResult, PaymentRecord } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import { headers } from 'next/headers';

const billingErrorLogger = new ErrorLogger('billing-info');

export interface BillingInfo {
  activeSubscription?: PaymentRecord;
  paymentHistory: PaymentRecord[];
}

export async function getBillingInfo(): Promise<ActionResult<BillingInfo>> {
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

    // 获取用户的活跃订阅
    const activeSubscription = await paymentRepository.findActiveSubscriptionByUserId(
      session.user.id
    );

    // 获取用户的支付历史
    const paymentHistory = await paymentRepository.findByUserId(session.user.id);

    return {
      success: true,
      data: {
        activeSubscription: activeSubscription || undefined,
        paymentHistory,
      },
    };
  } catch (error) {
    billingErrorLogger.logError(error as Error, {
      operation: 'getBillingInfo',
      userId: session?.user?.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取账单信息失败',
    };
  }
}

export async function getUserSubscription(): Promise<ActionResult<PaymentRecord | null>> {
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

    const subscription = await paymentRepository.findActiveSubscriptionByUserId(session.user.id);

    return {
      success: true,
      data: subscription,
    };
  } catch (error) {
    billingErrorLogger.logError(error as Error, {
      operation: 'getUserSubscription',
      userId: session?.user?.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取用户订阅失败',
    };
  }
}
