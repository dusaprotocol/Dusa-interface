import React from 'react';
import Tooltip from 'components/Tooltip';
import { SimplePoolMetrics } from 'hooks/useSimplePoolsMetrics';
import { Position } from 'utils/types';

interface APRTooltipProps {
  children: React.ReactNode;
  metrics?: SimplePoolMetrics | null;
  position?: Position;
}

const APRTooltip = ({
  children,
  metrics,
  position = 'top'
}: APRTooltipProps) => {
  // Si pas de metrics, retourner juste les children sans tooltip
  if (!metrics) {
    return <>{children}</>;
  }

  const { apr, baseAPR, rewardsAPR, airdropAPR, version } = metrics;

  const formatAPR = (value: number) => {
    // Handle NaN and invalid values
    if (isNaN(value) || !isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  // Check if values are valid numbers
  const isValidAPR = (value: number) => !isNaN(value) && isFinite(value);

  const validBaseAPR = isValidAPR(baseAPR) ? baseAPR : 0;
  const validRewardsAPR = isValidAPR(rewardsAPR) ? rewardsAPR : 0;
  const validAirdropAPR = isValidAPR(airdropAPR) ? airdropAPR : 0;
  const validTotalAPR = isValidAPR(apr) ? apr : 0;

  const tooltipContent = (
    <div className='flex gap-2 text-sm'>
      <div className='pr-2 border-gray-600 border-r font-semibold whitespace-nowrap'>
        Total APR: {formatAPR(validTotalAPR)}
      </div>

      <div className='space-y-1'>
        {version !== 'V2' && (
          <div className='flex gap-1'>
            <span className='text-gray-300 whitespace-nowrap'>Base APR:</span>
            <span className='font-medium'>{formatAPR(validBaseAPR)}</span>
          </div>
        )}

        {validRewardsAPR > 0 && (
          <div className='flex gap-1'>
            <span className='text-gray-300 whitespace-nowrap'>
              Rewards APR:
            </span>
            <span className='font-medium text-[var(--green)]'>
              {formatAPR(validRewardsAPR)}
            </span>
          </div>
        )}

        {validAirdropAPR > 0 && (
          <div className='flex gap-1'>
            <span className='text-gray-300 whitespace-nowrap'>
              Airdrop APR:
            </span>
            <span className='font-medium text-[var(--green)]'>
              {formatAPR(validAirdropAPR)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Tooltip trigger={children} position={position}>
      {tooltipContent}
    </Tooltip>
  );
};

export default APRTooltip;
