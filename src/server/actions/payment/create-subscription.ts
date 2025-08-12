'use server';

import { env } from '@/env';
import { auth } from '@/lib/auth/auth';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import { StripeProvider } from '@/payment/stripe/provider';
import type { ActionResult } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import { headers } from 'next/headers';

const paymentErrorLogger = new ErrorLogger('payment-subscription');

export interface CreateSubscriptionParams {
  priceId: string;
  trialDays?: number;
  successUrl?: string;
  cancelUrl?: string;
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<ActionResult<{ url?: string; subscriptionId?: string }>> {
  let session: { user?: { id: string; email: string; name?: string } } | null = null;

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

    const { priceId, trialDays, successUrl, cancelUrl } = params;
    const stripeProvider = new StripeProvider();

    // 检查用户是否已有活跃订阅
    const existingSubscription = await paymentRepository.findActiveSubscriptionByUserId(
      session.user.id
    );
    if (existingSubscription) {
      return {
        success: false,
        error: '您已有活跃的订阅',
      };
    }

    // 创建或获取 Stripe 客户
    // TODO: 从用户表获取 stripeCustomerId
    let customerId = null; // session.user.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeProvider.createCustomer(
        session.user.id,
        session.user.email,
        session.user.name || undefined
      );

      // TODO: 更新用户的 stripeCustomerId
      // await updateUserStripeCustomerId(session.user.id, customerId);
    }

    // 创建订阅
    const subscription = await stripeProvider.createSubscription({
      userId: session.user.id,
      priceId,
      customerId,
      trialPeriodDays: trialDays,
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
      },
    });

    // 保存支付记录到数据库
    await paymentRepository.create({
      id: subscription.id,
      priceId,
      type: 'subscription',
      interval: subscription.interval,
      userId: session.user.id,
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
    });

    // 记录事件
    await paymentRepository.createEvent({
      paymentId: subscription.id,
      eventType: 'created',
      eventData: JSON.stringify({
        subscriptionId: subscription.id,
        priceId,
        status: subscription.status,
      }),
    });

    // 如果订阅需要支付确认，返回客户端密钥
    if (subscription.clientSecret) {
      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
        },
        message: '订阅创建成功，请完成支付确认',
      };
    }

    // 如果是试用期或免费订阅，直接成功
    return {
      success: true,
      data: {
        subscriptionId: subscription.id,
      },
      message: '订阅创建成功',
    };
  } catch (error) {
    paymentErrorLogger.logError(error as Error, {
      operation: 'createSubscription',
      userId: session?.user?.id,
      priceId: params.priceId,
      trialDays: params.trialDays,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建订阅失败',
    };
  }
}

export async function createCheckoutSession(
  params: CreateSubscriptionParams
): Promise<ActionResult<{ url?: string; subscriptionId?: string; clientSecret?: string }>> {
  let session: { user?: { id: string; email: string; name?: string } } | null = null;

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

    const { priceId, successUrl, cancelUrl } = params;
    const stripeProvider = new StripeProvider();

    // 检查用户是否已有活跃订阅
    const existingSubscription = await paymentRepository.findActiveSubscriptionByUserId(
      session.user.id
    );
    if (existingSubscription) {
      return {
        success: false,
        error: '您已有活跃的订阅',
      };
    }

    // 创建或获取 Stripe 客户
    // TODO: 从用户表获取 stripeCustomerId
    let customerId = null; // session.user.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeProvider.createCustomer(
        session.user.id,
        session.user.email,
        session.user.name || undefined
      );
    }

    // 获取价格信息以确定是订阅还是一次性支付
    const { stripe } = await import('@/payment/stripe/client');
    const price = await stripe.prices.retrieve(priceId);

    if (price.recurring) {
      // 循环价格 - 创建 Checkout Session 用于订阅
      const checkoutSession = await stripeProvider.createSubscriptionCheckout({
        userId: session.user.id,
        priceId,
        customerId,
        successUrl: successUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancelUrl: cancelUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email,
        },
      });

      if (!checkoutSession.url) {
        return {
          success: false,
          error: '创建支付会话失败',
        };
      }

      return {
        success: true,
        data: {
          url: checkoutSession.url,
        },
        message: '正在跳转到支付页面...',
      };
    }

    // 一次性价格 - 创建支付会话
    const checkoutSession = await stripeProvider.createPayment({
      userId: session.user.id,
      priceId,
      customerId,
      successUrl: successUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancelUrl: cancelUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
      },
    });

    if (!checkoutSession.url) {
      return {
        success: false,
        error: '创建支付会话失败',
      };
    }

    return {
      success: true,
      data: {
        url: checkoutSession.url,
      },
      message: '正在跳转到支付页面...',
    };
  } catch (error) {
    paymentErrorLogger.logError(error as Error, {
      operation: 'createCheckoutSession',
      userId: session?.user?.id,
      priceId: params.priceId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建支付会话失败',
    };
  }
}
