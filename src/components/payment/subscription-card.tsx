'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useI18nConfig } from '@/hooks/use-config';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import type { PaymentRecord } from '@/payment/types';
import { cancelSubscription } from '@/server/actions/payment/cancel-subscription';
import { AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

const subscriptionErrorLogger = new ErrorLogger('subscription-card');

interface SubscriptionCardProps {
  subscription: PaymentRecord;
  onUpdate?: () => void;
}

export function SubscriptionCard({ subscription, onUpdate }: SubscriptionCardProps) {
  const [isPending, startTransition] = useTransition();
  const i18nConfig = useI18nConfig();

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'unknown';
    return new Date(date).toLocaleDateString(i18nConfig.defaultLocale);
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

  const handleCancelSubscription = () => {
    startTransition(async () => {
      try {
        if (!subscription.subscriptionId) {
          toast.error('Subscription ID does not exist');
          return;
        }
        const result = await cancelSubscription(subscription.subscriptionId);
        if (result.success) {
          toast.success(result.message || 'Subscription cancelled successfully');
          onUpdate?.();
        } else {
          toast.error(result.error || 'Subscription cancellation failed');
        }
      } catch (error) {
        toast.error('Subscription cancellation failed');
        subscriptionErrorLogger.logError(error as Error, {
          operation: 'cancelSubscription',
          subscriptionId: subscription.subscriptionId,
        });
      }
    });
  };

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const isTrialing = subscription.status === 'trialing';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
            <CardDescription>Your subscription plan details</CardDescription>
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {getStatusText(subscription.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground text-sm">Billing Cycle</div>
            <div className="font-medium">
              {subscription.interval === 'month'
                ? 'Monthly'
                : subscription.interval === 'year'
                  ? 'Yearly'
                  : 'One-time'}
            </div>
          </div>

          {subscription.periodStart && subscription.periodEnd && (
            <div>
              <div className="text-muted-foreground text-sm">Current Period</div>
              <div className="font-medium text-sm">
                {formatDate(subscription.periodStart)} - {formatDate(subscription.periodEnd)}
              </div>
            </div>
          )}
        </div>

        {isTrialing && subscription.trialEnd && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <div className="text-sm">
              <span className="font-medium text-blue-500">Trial End:</span>
              <span className="ml-1">{formatDate(subscription.trialEnd)}</span>
            </div>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <div className="text-sm">
              <span className="font-medium text-yellow-500">
                Will be cancelled at the end of the period
              </span>
              {subscription.periodEnd && (
                <span className="ml-1">: {formatDate(subscription.periodEnd)}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar className="h-4 w-4" />
          <span>Subscription start time: {formatDate(subscription.createdAt)}</span>
        </div>
      </CardContent>

      {isActive && !subscription.cancelAtPeriodEnd && (
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleCancelSubscription}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Processing...' : 'Cancel Subscription'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
