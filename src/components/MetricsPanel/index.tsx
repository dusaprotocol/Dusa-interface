import { TokenAmount } from '@dusalabs/sdk';
import { faClock, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Skeleton from 'components/Skeleton';
import Tooltip from 'components/Tooltip';
import { ProtocolTimeLibrary } from 'utils/constants';
import {
  printBigintIsh,
  printUSD,
  formatNumberWithSubscriptZeros
} from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import { Token } from 'utils/types';
dayjs.extend(relativeTime);
import './index.scss';
import { Deposits } from 'utils/types';

export interface TokenBreakdown {
  token: Token;
  amount: bigint;
  value: number;
}

interface MetricsPanelProps {
  totalVotingPower: bigint;
  totalFeesUsd: number;
  totalIncentivesUsd: number;
  feesBreakdown?: TokenBreakdown[];
  bribesBreakdown?: TokenBreakdown[];
  loading?: boolean;
  totalFeesLoading?: boolean;
  totalIncentivesLoading?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success';
  icon?: any;
  breakdown?: TokenBreakdown[];
  breakdownTitle?: string;
}

const BreakdownTooltip = ({ breakdown }: { breakdown: TokenBreakdown[] }) => {
  return (
    <div className='breakdown-tooltip-content'>
      {breakdown.map((item, index) => {
        const amountNum = new TokenAmount(
          item.token,
          item.amount
        ).toSignificant(6);
        const formattedAmount = formatNumberWithSubscriptZeros(amountNum, 3);
        return (
          <div key={`${item.token.address}-${index}`} className='breakdown-row'>
            <div className='breakdown-token'>
              <img src={item.token.logoURI} alt={item.token.symbol} />
              <span>{item.token.symbol}</span>
            </div>
            <div className='breakdown-values'>
              <span className='amount'>{formattedAmount}</span>
              <span className='value'>${printUSD(item.value)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  subtitle,
  loading = false,
  variant = 'default',
  icon,
  breakdown,
  breakdownTitle
}: MetricCardProps) => {
  const hasBreakdown = breakdown && breakdown.length > 0;

  return (
    <div className={`metric-card ${variant}`}>
      <div className='metric-header'>
        {icon && <FontAwesomeIcon icon={icon} className='metric-icon' />}
        <span className='metric-label'>{label}</span>
        {hasBreakdown && !loading && (
          <Tooltip
            trigger={
              <button
                className='info-button'
                aria-label={breakdownTitle || 'View breakdown'}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </button>
            }
            position='bottom'
          >
            <div className='breakdown-tooltip'>
              {breakdownTitle && (
                <div className='breakdown-title'>{breakdownTitle}</div>
              )}
              <BreakdownTooltip breakdown={breakdown} />
            </div>
          </Tooltip>
        )}
      </div>
      <div className='metric-content'>
        {loading ? <Skeleton /> : <span className='metric-value'>{value}</span>}
        {subtitle && <span className='metric-subtitle'>{subtitle}</span>}
      </div>
    </div>
  );
};

const MetricsPanel = ({
  totalVotingPower,
  totalFeesUsd,
  totalIncentivesUsd,
  feesBreakdown,
  bribesBreakdown,
  loading = false,
  totalFeesLoading = false,
  totalIncentivesLoading = false
}: MetricsPanelProps) => {
  const totalRewards = totalFeesUsd + totalIncentivesUsd;
  const votingPowerFormatted =
    totalVotingPower !== undefined
      ? printBigintIsh(DUSA_MAIN, totalVotingPower)
      : '0';

  return (
    <div className='MetricsPanel'>
      <div className='metrics-header'>
        <div className='voting-round-info'>
          <div className='round-indicator'>
            <FontAwesomeIcon icon={faClock} />
            <span>Current voting round</span>
          </div>
          <Tooltip
            trigger={
              <div className='translate-x-2 round-timer'>
                ends in{' '}
                {dayjs(ProtocolTimeLibrary.epochVoteEnd()).fromNow(true)}
              </div>
            }
            position='left'
          >
            <span>
              {dayjs(ProtocolTimeLibrary.epochVoteEnd()).format(
                'MMM D, YYYY [at] h:mm A'
              )}
            </span>
          </Tooltip>
        </div>
        <div className='description'>
          Voters earn a share of transaction fees and incentives for helping
          govern how emissions are distributed.
        </div>
      </div>

      <div className='metrics-grid'>
        <MetricCard
          label='Total Voting Power'
          value={votingPowerFormatted}
          subtitle='veDUSA this epoch'
          loading={!totalVotingPower && loading}
          variant='primary'
        />

        <MetricCard
          label='Total Fees'
          value={`~$${printUSD(totalFeesUsd)}`}
          subtitle='Protocol fees'
          variant='default'
          loading={totalFeesLoading}
          breakdown={feesBreakdown}
          breakdownTitle='Fees by Token'
        />

        <MetricCard
          label='Total Incentives'
          value={`~$${printUSD(totalIncentivesUsd)}`}
          subtitle='Bribes provided'
          variant='default'
          loading={totalIncentivesLoading}
          breakdown={bribesBreakdown}
          breakdownTitle='Bribes by Token'
        />

        <MetricCard
          label='Total Rewards'
          value={`~$${printUSD(totalRewards)}`}
          subtitle='Fees + Incentives'
          variant='success'
          loading={totalFeesLoading || totalIncentivesLoading}
        />
      </div>
    </div>
  );
};

export default MetricsPanel;
