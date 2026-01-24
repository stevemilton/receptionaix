import React from 'react';
import { cn } from './utils';
import { Card } from './Card';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, title, value, change, icon, ...props }, ref) => {
    const isPositive = change && change.value >= 0;

    return (
      <Card ref={ref} className={cn('', className)} {...props}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
            {change && (
              <div className="mt-2 flex items-center text-sm">
                <span
                  className={cn(
                    'inline-flex items-center font-medium',
                    isPositive ? 'text-success-600' : 'text-error-600'
                  )}
                >
                  {isPositive ? (
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  )}
                  {Math.abs(change.value)}%
                </span>
                {change.label && (
                  <span className="ml-2 text-gray-500">{change.label}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

MetricCard.displayName = 'MetricCard';
