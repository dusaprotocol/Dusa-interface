import { memo } from 'react';
import clsx from 'clsx/lite';
import { Link } from 'react-router-dom';
import APRTooltip from 'components/APRTooltip';
import PoolTitle from 'components/PoolTitle';
import { SimplePoolMetrics } from 'hooks/useSimplePoolsMetrics';
import { buildPoolRoute } from 'routes';
import { printUSD } from 'utils/methods';
import { Pool } from 'utils/types';

interface PoolItemProps {
  pool: Pool;
  metrics?: SimplePoolMetrics | null;
  isSmallScreen?: boolean;
}

const PoolItem = memo(
  ({ pool, metrics, isSmallScreen = false }: PoolItemProps) => {
    if (isSmallScreen) {
      return <PoolItemMobile pool={pool} metrics={metrics} />;
    }

    return null;
  }
);

const PoolItemMobile = memo(
  ({ pool, metrics }: Pick<PoolItemProps, 'pool' | 'metrics'>) => {
    return (
      <Link
        to={buildPoolRoute(pool)}
        className='block bg-[var(--hover-bg)] hover:bg-[var(--secondary-bg)] shadow-sm hover:shadow-lg mb-6 p-8 border border-[var(--border-color)] hover:border-[var(--secondary-color)] rounded-2xl text-inherit no-underline hover:no-underline transition-all duration-300 ease-out grow'
      >
        <div className='mb-6 pb-5 border-[var(--border-color)] border-b'>
          <PoolTitle pool={pool} />
        </div>
        <div className='gap-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'>
          {[
            {
              label: 'Volume (24H)',
              value: metrics?.volume24h,
              isLoadingSpecific: metrics?.loading?.volume24h,
              formatter: printUSD
            },
            {
              label: 'Liquidity',
              value: metrics?.liquidity,
              isLoadingSpecific: metrics?.loading?.liquidity,
              formatter: printUSD
            },
            {
              label: 'Fees (24H)',
              value: metrics?.fees24h,
              isLoadingSpecific: metrics?.loading?.fees24h,
              formatter: printUSD
            },
            {
              label: 'APR',
              value: metrics?.apr,
              isLoadingSpecific: metrics?.loading?.apr,
              formatter: (val: number) => `${val.toFixed(2)}%`,
              hasRewards: metrics?.hasRewards,
              withTooltip: true
            }
          ].map((metric) => {
            const metricItem = (
              <MetricItem
                key={metric.label}
                label={metric.label}
                value={metric.value}
                isLoading={metrics?.isLoading}
                isLoadingSpecific={metric.isLoadingSpecific}
                formatter={metric.formatter}
                hasRewards={metric.hasRewards}
              />
            );

            return (
              <div
                className='flex bg-[var(--main-bg)] border border-[var(--border-color)] rounded-xl grow'
                key={metric.label}
              >
                {metric.withTooltip ? (
                  <APRTooltip metrics={metrics} position='left'>
                    {metricItem}
                  </APRTooltip>
                ) : (
                  metricItem
                )}
              </div>
            );
          })}
        </div>
      </Link>
    );
  }
);

const MetricItem = memo(
  ({
    label,
    value,
    isLoading,
    isLoadingSpecific,
    formatter = (val) => val.toString(),
    hasRewards,
    change
  }: {
    label: string;
    value?: number;
    isLoading?: boolean;
    isLoadingSpecific?: boolean;
    formatter?: (val: number) => string;
    hasRewards?: boolean;
    change?: number;
  }) => {
    return (
      <div
        className={clsx(
          'p-4 transition-all duration-300 ease-out',
          label === 'APR' && 'pr-6'
        )}
      >
        <div className='flex justify-between items-center mb-3'>
          <div className='font-semibold text-[var(--second-color)] text-xs uppercase tracking-wider'>
            {label}
          </div>
        </div>

        <div className='flex items-baseline gap-2'>
          <MetricValue
            value={value}
            isLoading={isLoading}
            isLoadingSpecific={isLoadingSpecific}
            formatter={formatter}
            hasRewards={hasRewards}
          />
          {change && (
            <span
              className={clsx(
                'font-medium text-xs',
                change > 0
                  ? 'text-[var(--green)]'
                  : 'text-[var(--second-color)]',
                label === 'APR' && 'pr-2'
              )}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    );
  }
);

const MetricValue = memo(
  ({
    value,
    isLoading,
    isLoadingSpecific,
    formatter = (val) => val.toString(),
    hasRewards
  }: {
    value?: number;
    isLoading?: boolean;
    isLoadingSpecific?: boolean;
    formatter?: (val: number) => string;
    hasRewards?: boolean;
  }) => {
    const shouldShowLoader = isLoadingSpecific ?? isLoading;

    if (shouldShowLoader) {
      return (
        <div className='bg-[var(--border-color)] rounded w-16 h-5 animate-pulse' />
      );
    }

    if (value === undefined || value === null || isNaN(value)) {
      return (
        <span className='opacity-50 text-[var(--second-color)] text-sm'>—</span>
      );
    }

    const sizeClasses =
      value > 1000000 ? 'text-base font-bold' : 'text-sm font-semibold';

    const colorClass = hasRewards
      ? 'text-[var(--green)]'
      : 'text-[var(--main-color)]';

    return (
      <div className='flex items-center gap-1'>
        <span
          className={clsx(
            'transition-colors duration-200',
            colorClass,
            sizeClasses
          )}
        >
          {formatter(value)}
        </span>
        {hasRewards && <span className='text-sm'>🔥</span>}
      </div>
    );
  }
);

export default PoolItem;
