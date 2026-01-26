'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UsageData {
  callsUsed: number;
  callsLimit: number;
  minutesUsed: number;
  minutesLimit: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  tier: { id: string; name: string } | null;
  subscriptionStatus: string;
  overageCalls: number;
  overageCharges: number;
  overageRate: number;
  isUnlimited: boolean;
  dailyBreakdown: Record<string, { calls: number; minutes: number }>;
}

function ProgressBar({
  used,
  limit,
  isUnlimited,
  label,
  unit,
}: {
  used: number;
  limit: number;
  isUnlimited: boolean;
  label: string;
  unit: string;
}) {
  const percentage = isUnlimited ? 0 : limit > 0 ? (used / limit) * 100 : 0;
  const barColor =
    percentage >= 100
      ? 'bg-red-500'
      : percentage >= 80
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <span className="text-sm text-gray-500">
          {isUnlimited ? (
            <span className="text-green-600 font-medium">Unlimited</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{Math.round(used)}</span>
              {' / '}
              {limit} {unit}
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {percentage >= 100
              ? `${Math.round(used - limit)} over limit`
              : `${Math.round(limit - used)} remaining`}
          </p>
        </>
      )}
    </div>
  );
}

function DailyChart({ data }: { data: Record<string, { calls: number; minutes: number }> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No call data for this billing period yet.
      </div>
    );
  }

  const maxCalls = Math.max(...entries.map(([, d]) => d.calls), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {entries.map(([date, d]) => {
        const height = (d.calls / maxCalls) * 100;
        const day = new Date(date).getDate();
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500">{d.calls}</span>
            <div
              className="w-full bg-primary-500 rounded-t min-h-[2px] transition-all"
              style={{ height: `${height}%` }}
              title={`${date}: ${d.calls} calls, ${Math.round(d.minutes)} mins`}
            />
            <span className="text-[10px] text-gray-400">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsage() {
      try {
        const response = await fetch('/api/usage');
        if (!response.ok) throw new Error('Failed to fetch usage');
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage');
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error || 'Failed to load usage data'}
        </div>
      </div>
    );
  }

  const callPercentage = usage.isUnlimited
    ? 0
    : usage.callsLimit > 0
    ? (usage.callsUsed / usage.callsLimit) * 100
    : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
        <p className="text-gray-600">
          {usage.tier ? `${usage.tier.name} Plan` : 'Trial'} &middot; Billing period:{' '}
          {new Date(usage.billingPeriodStart).toLocaleDateString('en-GB')} &ndash;{' '}
          {new Date(usage.billingPeriodEnd).toLocaleDateString('en-GB')}
        </p>
      </div>

      {/* Upgrade CTA at 80%+ */}
      {!usage.isUnlimited && callPercentage >= 80 && callPercentage < 100 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex items-center justify-between">
          <span>
            You&apos;ve used {Math.round(callPercentage)}% of your monthly calls. Consider upgrading to avoid overage charges.
          </span>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium whitespace-nowrap ml-4"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* Over limit warning */}
      {!usage.isUnlimited && callPercentage >= 100 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold">Call limit reached.</span>{' '}
            Calls are being forwarded to your personal phone. Additional AI-handled calls will be charged at
            &pound;{usage.overageRate.toFixed(2)}/call.
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium whitespace-nowrap ml-4"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProgressBar
          used={usage.callsUsed}
          limit={usage.callsLimit}
          isUnlimited={usage.isUnlimited}
          label="Calls This Month"
          unit="calls"
        />
        <ProgressBar
          used={usage.minutesUsed}
          limit={usage.minutesLimit}
          isUnlimited={usage.isUnlimited}
          label="Minutes This Month"
          unit="mins"
        />
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Calls</h2>
        <DailyChart data={usage.dailyBreakdown} />
      </div>

      {/* Overage Section */}
      {!usage.isUnlimited && usage.overageCalls > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overage Charges</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Overage Calls</p>
              <p className="text-2xl font-bold text-gray-900">{usage.overageCalls}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rate</p>
              <p className="text-2xl font-bold text-gray-900">&pound;{usage.overageRate.toFixed(2)}/call</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Charge</p>
              <p className="text-2xl font-bold text-red-600">&pound;{usage.overageCharges.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Overage charges are billed at the end of your billing period.
          </p>
        </div>
      )}

      {/* Plan Summary */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-gray-600">
              {usage.tier ? usage.tier.name : 'Trial'} &middot;{' '}
              <span className="capitalize">{usage.subscriptionStatus}</span>
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Manage Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
