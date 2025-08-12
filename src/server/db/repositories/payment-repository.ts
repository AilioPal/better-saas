import type { PaymentInterval, PaymentRecord, PaymentStatus, PaymentType } from '@/payment/types';
import db from '@/server/db';
import { payment, paymentEvent } from '@/server/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePaymentData {
  id?: string;
  priceId: string;
  type: PaymentType;
  interval?: PaymentInterval;
  userId: string;
  customerId: string;
  subscriptionId?: string;
  status: PaymentStatus;
  periodStart?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialStart?: Date;
  trialEnd?: Date;
}

export interface UpdatePaymentData {
  status?: PaymentStatus;
  subscriptionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialStart?: Date;
  trialEnd?: Date;
}

export interface CreatePaymentEventData {
  paymentId: string;
  eventType: string;
  stripeEventId?: string;
  eventData?: string;
}

export class PaymentRepository {
  /**
   * Create payment record
   */
  async create(data: CreatePaymentData): Promise<PaymentRecord> {
    const paymentId = data.id || uuidv4();

    const [result] = await db
      .insert(payment)
      .values({
        id: paymentId,
        priceId: data.priceId,
        type: data.type,
        interval: data.interval || null,
        userId: data.userId,
        customerId: data.customerId,
        subscriptionId: data.subscriptionId || null,
        status: data.status,
        periodStart: data.periodStart || null,
        periodEnd: data.periodEnd || null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || null,
        trialStart: data.trialStart || null,
        trialEnd: data.trialEnd || null,
      })
      .returning();

    return this.mapToPaymentRecord(result);
  }

  /**
   * Get payment record by ID
   */
  async findById(id: string): Promise<PaymentRecord | null> {
    const result = await db.select().from(payment).where(eq(payment.id, id)).limit(1);

    return result[0] ? this.mapToPaymentRecord(result[0]) : null;
  }

  /**
   * Get payment records by user ID
   */
  async findByUserId(userId: string): Promise<PaymentRecord[]> {
    const results = await db
      .select()
      .from(payment)
      .where(eq(payment.userId, userId))
      .orderBy(desc(payment.createdAt));

    return results.map(this.mapToPaymentRecord);
  }

  /**
   * 根据订阅 ID 获取支付记录
   */
  async findBySubscriptionId(subscriptionId: string): Promise<PaymentRecord | null> {
    const result = await db
      .select()
      .from(payment)
      .where(eq(payment.subscriptionId, subscriptionId))
      .limit(1);

    return result[0] ? this.mapToPaymentRecord(result[0]) : null;
  }

  /**
   * 根据客户 ID 获取支付记录
   */
  async findByCustomerId(customerId: string): Promise<PaymentRecord[]> {
    const results = await db
      .select()
      .from(payment)
      .where(eq(payment.customerId, customerId))
      .orderBy(desc(payment.createdAt));

    return results.map(this.mapToPaymentRecord);
  }

  /**
   * 获取用户的活跃订阅
   */
  async findActiveSubscriptionByUserId(userId: string): Promise<PaymentRecord | null> {
    const result = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.userId, userId),
          eq(payment.type, 'subscription'),
          inArray(payment.status, ['active', 'trialing', 'past_due'])
        )
      )
      .orderBy(desc(payment.createdAt))
      .limit(1);

    return result[0] ? this.mapToPaymentRecord(result[0]) : null;
  }

  /**
   * 更新支付记录
   */
  async update(id: string, data: UpdatePaymentData): Promise<PaymentRecord | null> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.subscriptionId !== undefined) updateData.subscriptionId = data.subscriptionId;
    if (data.periodStart !== undefined) updateData.periodStart = data.periodStart;
    if (data.periodEnd !== undefined) updateData.periodEnd = data.periodEnd;
    if (data.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    if (data.trialStart !== undefined) updateData.trialStart = data.trialStart;
    if (data.trialEnd !== undefined) updateData.trialEnd = data.trialEnd;

    const [result] = await db.update(payment).set(updateData).where(eq(payment.id, id)).returning();

    return result ? this.mapToPaymentRecord(result) : null;
  }

  /**
   * 删除支付记录
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(payment).where(eq(payment.id, id));

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 创建支付事件记录
   */
  async createEvent(data: CreatePaymentEventData): Promise<void> {
    await db.insert(paymentEvent).values({
      id: uuidv4(),
      paymentId: data.paymentId,
      eventType: data.eventType,
      stripeEventId: data.stripeEventId || null,
      eventData: data.eventData || null,
    });
  }

  /**
   * 检查 Stripe 事件是否已处理
   */
  async isStripeEventProcessed(stripeEventId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(paymentEvent)
      .where(eq(paymentEvent.stripeEventId, stripeEventId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * 映射数据库记录到 PaymentRecord
   */
  private mapToPaymentRecord(record: any): PaymentRecord {
    return {
      id: record.id,
      priceId: record.priceId,
      type: record.type as PaymentType,
      interval: record.interval as PaymentInterval,
      userId: record.userId,
      customerId: record.customerId,
      subscriptionId: record.subscriptionId,
      status: record.status as PaymentStatus,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      trialStart: record.trialStart,
      trialEnd: record.trialEnd,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

// Export singleton instance
export const paymentRepository = new PaymentRepository();
