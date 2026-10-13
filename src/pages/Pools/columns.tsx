import React from 'react';
import {
  faCaretUp,
  faCaretDown,
  faSort
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ColumnDef } from '@tanstack/react-table';
import APRTooltip from 'components/APRTooltip';
import PoolTitle from 'components/PoolTitle';
import { SimplePoolMetrics } from 'hooks/useSimplePoolsMetrics';
import { Pool } from 'utils/types';

export interface PoolWithMetrics {
  pool: Pool;
  metrics: SimplePoolMetrics | null | undefined;
}

const SortableHeader = ({ title, column }: { title: string; column: any }) => {
  const sortDirection = column.getIsSorted();
  return (
    <div className='flex items-center gap-2 cursor-pointer select-none'>
      <span>{title}</span>
      {column.getCanSort() && (
        <span className='opacity-60 text-xs'>
          {sortDirection === 'desc' && (
            <FontAwesomeIcon
              icon={faCaretDown}
              className='text-[var(--secondary-color)]'
            />
          )}
          {sortDirection === 'asc' && (
            <FontAwesomeIcon
              icon={faCaretUp}
              className='text-[var(--secondary-color)]'
            />
          )}
          {!sortDirection && <FontAwesomeIcon icon={faSort} />}
        </span>
      )}
    </div>
  );
};

const RewardsIndicator = ({ hasRewards }: { hasRewards?: boolean }) => {
  if (hasRewards) {
    return <div className='bg-[var(--green)] rounded-full w-1 h-1' />;
  } else {
    return (
      <div className='bg-[var(--second-color)] opacity-30 rounded-full w-1 h-1' />
    );
  }
};

const MetricCell = ({
  value,
  isLoading,
  isLoadingSpecific,
  formatter = (val: number) => val.toString(),
  hasRewards,
  showRewardsIndicator = false
}: {
  value?: number;
  isLoading?: boolean;
  isLoadingSpecific?: boolean;
  formatter?: (val: number) => string;
  hasRewards?: boolean;
  showRewardsIndicator?: boolean;
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

  const colorClass = hasRewards
    ? 'text-[var(--green)]'
    : 'text-[var(--main-color)]';

  if (showRewardsIndicator) {
    return (
      <div className='flex justify-end items-center gap-2'>
        <RewardsIndicator hasRewards={hasRewards} />
        <div className='flex items-center gap-1'>
          <span
            className={`font-medium text-sm transition-colors duration-200 ${colorClass}`}
          >
            {formatter(value)}
          </span>
          {hasRewards && <span className='text-sm'>🔥</span>}
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-1'>
      <span
        className={`font-medium text-sm transition-colors duration-200 ${colorClass}`}
      >
        {formatter(value)}
      </span>
      {hasRewards && <span className='text-sm'>🔥</span>}
    </div>
  );
};

// ✅ Formatter avec symbole $
const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2
});
const formatUSD = (n: number) => usdFmt.format(n);

export const columns: ColumnDef<PoolWithMetrics>[] = [
  {
    id: 'pool',
    accessorKey: 'pool',
    header: 'Pool Name',
    enableSorting: false,
    cell: ({ row }) => {
      const { pool } = row.original;
      return <PoolTitle pool={pool} />;
    }
  },
  {
    id: 'metrics.volume24h',
    accessorKey: 'metrics.volume24h',
    header: ({ column }) => (
      <SortableHeader title='Volume (24H)' column={column} />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.metrics?.volume24h ?? 0;
      const b = rowB.original.metrics?.volume24h ?? 0;
      return a - b;
    },
    cell: ({ row }) => {
      const { metrics } = row.original;
      return (
        <MetricCell
          value={metrics?.volume24h}
          isLoading={metrics?.isLoading}
          isLoadingSpecific={metrics?.loading?.volume24h}
          formatter={formatUSD}
        />
      );
    }
  },
  {
    id: 'metrics.liquidity',
    accessorKey: 'metrics.liquidity',
    header: ({ column }) => (
      <SortableHeader title='Liquidity' column={column} />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.metrics?.liquidity ?? 0;
      const b = rowB.original.metrics?.liquidity ?? 0;
      return a - b;
    },
    cell: ({ row }) => {
      const { metrics } = row.original;
      return (
        <MetricCell
          value={metrics?.liquidity}
          isLoading={metrics?.isLoading}
          isLoadingSpecific={metrics?.loading?.liquidity}
          formatter={formatUSD}
        />
      );
    }
  },
  {
    id: 'metrics.fees24h',
    accessorKey: 'metrics.fees24h',
    header: ({ column }) => (
      <SortableHeader title='Fees (24H)' column={column} />
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.metrics?.fees24h ?? 0;
      const b = rowB.original.metrics?.fees24h ?? 0;
      return a - b;
    },
    cell: ({ row }) => {
      const { metrics } = row.original;
      return (
        <MetricCell
          value={metrics?.fees24h}
          isLoading={metrics?.isLoading}
          isLoadingSpecific={metrics?.loading?.fees24h}
          formatter={formatUSD}
        />
      );
    }
  },
  {
    id: 'metrics.apr',
    accessorKey: 'metrics.apr',
    header: ({ column }) => <SortableHeader title='APR' column={column} />,
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.metrics?.apr ?? 0;
      const b = rowB.original.metrics?.apr ?? 0;
      return a - b;
    },
    cell: ({ row }) => {
      const { metrics } = row.original;

      const cellContent = (
        <MetricCell
          value={metrics?.apr}
          isLoading={metrics?.isLoading}
          isLoadingSpecific={metrics?.loading?.apr}
          formatter={(val) => `${val.toFixed(2)}%`}
          hasRewards={metrics?.hasRewards}
          showRewardsIndicator={true}
        />
      );

      // ⚠️ Important: wrapper avec z élevé pour que le tooltip passe au-dessus
      return metrics ? (
        <APRTooltip metrics={metrics} position='left'>
          {cellContent}
        </APRTooltip>
      ) : (
        cellContent
      );
    }
  }
];
