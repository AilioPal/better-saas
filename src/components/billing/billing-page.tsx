'use client';

import { SubscriptionCard } from '@/components/payment/subscription-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import { getBillingInfo } from '@/server/actions/payment/get-billing-info';
import type { BillingInfo } from '@/server/actions/payment/get-billing-info';
import { syncSingleSubscription } from '@/server/actions/payment/sync-subscription-periods';
import { Calendar, CreditCard, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const billingErrorLogger = new ErrorLogger('billing-page');

export function BillingPage() {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const loadBillingInfo = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await getBillingInfo();
      if (result.success && result.data) {
        setBillingInfo(result.data);
      } else {
        setError(result.error || '获取账单信息失败');
      }
    } catch (err) {
      setError('获取账单信息失败');
      billingErrorLogger.logError(err as Error, {
        operation: 'loadBillingInfo',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSyncSubscription = useCallback(async () => {
    if (!billingInfo?.activeSubscription?.subscriptionId) {
      toast.error('没有找到订阅信息');
      return;
    }

    try {
      setSyncing(true);
      const result = await syncSingleSubscription(billingInfo.activeSubscription.subscriptionId);
      if (result.success) {
        toast.success(result.message || '订阅信息同步成功');
        await loadBillingInfo(); // Reload billing info after sync
      } else {
        toast.error(result.error || '同步订阅信息失败');
      }
    } catch (err) {
      toast.error('同步订阅信息失败');
      billingErrorLogger.logError(err as Error, {
        operation: 'syncSubscription',
        subscriptionId: billingInfo.activeSubscription.subscriptionId,
      });
    } finally {
      setSyncing(false);
    }
  }, [billingInfo?.activeSubscription?.subscriptionId, loadBillingInfo]);

  useEffect(() => {
    loadBillingInfo();
  }, [loadBillingInfo]);

  // Handle URL parameters to show payment result notifications
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('支付成功！您的订阅已激活。', {
        duration: 5000,
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } else if (canceled === 'true') {
      toast.info('支付已取消。您可以随时重新订阅。', {
        duration: 5000,
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '未知';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃';
      case 'trialing':
        return '试用中';
      case 'past_due':
        return '逾期';
      case 'canceled':
        return '已取消';
      case 'incomplete':
        return '未完成';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'trialing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'past_due':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'canceled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        </div>

        {/* Current subscription skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>

        {/* Payment history skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => `payment-skeleton-${i}`).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">账单管理</h1>
          <p className="text-muted-foreground">管理您的订阅和查看支付历史</p>
        </div>
        {billingInfo?.activeSubscription && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSubscription}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同步中...' : '同步订阅信息'}
            </Button>
          </div>
        )}
      </div>

      {/* Current subscription */}
      {billingInfo?.activeSubscription ? (
        <SubscriptionCard
          subscription={billingInfo.activeSubscription}
          onUpdate={loadBillingInfo}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>当前订阅</CardTitle>
            <CardDescription>您目前没有活跃的订阅</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">您可以在定价页面选择适合的订阅计划</p>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            支付历史
          </CardTitle>
          <CardDescription>您的所有支付记录</CardDescription>
        </CardHeader>
        <CardContent>
          {billingInfo?.paymentHistory && billingInfo.paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {billingInfo.paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {payment.type === 'subscription' ? '订阅' : '一次性支付'}
                      </span>
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusText(payment.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(payment.createdAt)}</span>
                    </div>
                    {payment.interval && (
                      <div className="text-muted-foreground text-sm">
                        计费周期：{payment.interval === 'month' ? '月付' : '年付'}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-sm">价格ID</div>
                    <div className="font-mono text-sm">{payment.priceId}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">暂无支付记录</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
