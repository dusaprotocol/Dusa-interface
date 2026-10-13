import { Fraction } from '@dusalabs/sdk';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import PoolTitle from 'components/PoolTitle';
import Skeleton from 'components/Skeleton';
// import { PoolTitle } from 'pages/Pools';
import Tooltip from 'components/Tooltip';
import { routeNames } from 'routes';
import { printBigintIsh, printUSD } from 'utils/methods';
import { Bribe, Lock, Pool, Token } from 'utils/types';
import './index.scss';

export interface PoolTableData {
  pool: Pool;
  fees: number;
  incentives: number;
  totalRewards: number;
  apr: number;
  votes: Vote[];
  feesDetails: {
    fees0: bigint;
    fees1: bigint;
    fees0Value: number;
    fees1Value: number;
    token0: Token;
    token1: Token;
  };
  incentivesDetails: {
    bribes: Bribe[];
    bribeValues: number[];
  };
  weight: bigint;
}

interface Vote {
  lock: Lock;
  pool: any;
  weight?: number;
}

interface VotingCardProps {
  data?: PoolTableData;
  locks?: Lock[];
  totalWeight: bigint;
  onToggleSelection?: (pool: any) => void;
  isSelected?: boolean;
  loading?: boolean;
  feesLoading?: boolean;
  incentivesLoading?: boolean;
  rewardsLoading?: boolean;
  aprLoading?: boolean;
}

const VotingCard = ({
  data,
  locks,
  totalWeight,
  onToggleSelection,
  isSelected,
  loading = false,
  feesLoading = false,
  incentivesLoading = false,
  rewardsLoading = false,
  aprLoading = false
}: VotingCardProps) => {
  if (loading) {
    return (
      <div className='VotingCard skeleton-card'>
        <div className='pool-column'>
          <div className='skeleton-pool-title'>
            <Skeleton className='skeleton-token-icons' />
            <Skeleton className='skeleton-pool-name' />
          </div>
        </div>

        <div className='metric-column'>
          <div className='metric-label'>Fees</div>
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        </div>

        <div className='metric-column'>
          <div className='metric-label'>Bribes</div>
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        </div>

        <div className='metric-column'>
          <div className='metric-label'>Total Rewards</div>
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        </div>

        <div className='metric-column highlight'>
          <div className='metric-label'>vAPR</div>
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        </div>

        <div className='status-column'>
          <Skeleton className='skeleton-status' />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const {
    pool,
    fees,
    incentives,
    totalRewards,
    apr,
    votes,
    feesDetails,
    incentivesDetails,
    weight
  } = data;

  const hasSelectedVotes = votes.length > 0;

  const handleCardClick = () => {
    if (onToggleSelection) {
      onToggleSelection(pool);
    }
  };

  return (
    <div
      className={`VotingCard ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      {/* Pool Name Column */}
      <div className='pool-column'>
        <PoolTitle pool={pool} />
      </div>

      {/* Fees Column */}
      <div className='metric-column'>
        <div className='metric-label'>Fees</div>
        {feesLoading ? (
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        ) : (
          <div className='flex flex-col items-end gap-1'>
            <div className='metric-value'>~${printUSD(fees)}</div>
            {feesDetails && (
              <div className='metric-subtitle'>
                {printBigintIsh(feesDetails.token0, feesDetails.fees0)}{' '}
                {feesDetails.token0.symbol} +{' '}
                {printBigintIsh(feesDetails.token1, feesDetails.fees1)}{' '}
                {feesDetails.token1.symbol}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Incentives Column */}
      <div className='metric-column'>
        <div>
          <div className='metric-label'>
            Bribes{' '}
            <Link to={routeNames.bribes} className='ml-1 underline'>
              (Add)
            </Link>
          </div>
          {incentivesLoading ? (
            <div className='flex justify-end'>
              <Skeleton />
            </div>
          ) : incentivesDetails.bribes.length ? (
            <>
              <div className='metric-value'>
                ~$
                {printUSD(
                  incentives
                  // incentivesDetails.bribeValues.reduce((a, c) => a + c, 0)
                )}
              </div>
              {incentivesDetails.bribes.map((bribe, index) => (
                <div className='metric-subtitle' key={index}>
                  {printBigintIsh(bribe.token, bribe.amount)}{' '}
                  {bribe.token.symbol}
                </div>
              ))}
            </>
          ) : (
            <div className='metric-value no-value'>
              <span>$0</span>
            </div>
          )}
        </div>
      </div>

      {/* Total Rewards Column */}
      <div className='metric-column'>
        <div className='metric-label'>Total Rewards</div>
        {rewardsLoading ? (
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        ) : (
          <div className='metric-value'>~${printUSD(totalRewards)}</div>
        )}
      </div>

      {/* vAPR Column */}
      <div className='metric-column highlight'>
        <div className='metric-label'>vAPR</div>
        {aprLoading ? (
          <div className='flex justify-end'>
            <Skeleton />
          </div>
        ) : (
          <div className='flex gap-2'>
            <div className='metric-value'>{apr.toFixed(2)}%</div>
            <div className='metric-subtitle'>
              (
              {new Fraction(weight)
                .multiply(100n)
                .divide(totalWeight || 1n)
                .toFixed(1)}
              % Votes)
            </div>
          </div>
        )}
      </div>

      {/* Status Column */}
      <div className='status-column'>
        {isSelected ? (
          <div className='status-selected'>
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>Selected</span>
          </div>
        ) : (
          <div className='status-unselected'>
            <span>Click to select</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingCard;
