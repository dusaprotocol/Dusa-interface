import { useState } from 'react';
import { parseUnits } from '@dusalabs/sdk';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import NumberInput from 'components/TokenInput/NumberInput';
import Tooltip from 'components/Tooltip';
import { useSendTransaction } from 'hooks/useSendTransaction';
import CompletionBar from 'pages/Sale/components/CompletionBar';
import {
  getIntervalFromSeconds,
  getVestingAmountAvailable,
  printBigintIsh,
  roundTokenAmount,
  unFormatPrintedNumber
} from 'utils/methods';
import { DUSA_MAIN, ntDUSA } from 'utils/tokens';
import { buildClaimVestingTx } from 'utils/transactionBuilder';
import { VestingSession } from 'utils/types';

interface VestingCardProps {
  vestingSession: VestingSession;
  refetch: () => void;
}

const VestingCard = ({ vestingSession, refetch }: VestingCardProps) => {
  const [quantity, setQuantity] = useState<string>();
  const [expanded, setExpanded] = useState(false);

  const {
    id,
    totalAmount,
    startTimestamp,
    claimedAmount,
    initialReleaseAmount,
    cliffDuration,
    linearDuration,
    tokenAddress
  } = vestingSession;

  const token = tokenAddress === ntDUSA.address ? ntDUSA : DUSA_MAIN;

  const amountAvailable = getVestingAmountAvailable(vestingSession);

  const amountToClaim = parseUnits(
    quantity ? unFormatPrintedNumber(quantity) : '0',
    token.decimals
  );

  const { submitTx, pending } = useSendTransaction({
    data: buildClaimVestingTx(id, amountToClaim),
    onTxConfirmed: () => {
      setQuantity('');
      refetch();
    }
  });

  const totalTxt = printBigintIsh(token, totalAmount);
  const availableTxt = printBigintIsh(token, amountAvailable);
  const availableQuantity = roundTokenAmount(token, amountAvailable).toString();
  const claimedTxt = printBigintIsh(token, claimedAmount);

  const vestingCompletionPercentage =
    ((Number(claimedAmount) + Number(amountAvailable)) / Number(totalAmount)) *
    100;

  return (
    <div>
      <div className='bg-[var(--third-bg)] shadow-lg px-6 pt-6 rounded-lg'>
        <div className='flex justify-between items-center mb-6'>
          <div className='flex items-center'>
            <img
              src={token.logoURI}
              alt={token.symbol}
              className='mr-2 w-6 h-6'
            />
            <h2 className='font-semibold text-lg'>Vesting</h2>
          </div>
        </div>
        <div className='flex flex-col gap-5'>
          <CompletionBar
            percentage={vestingCompletionPercentage}
            variant='small'
          />
          <div className='gap-4 grid grid-cols-3 mb-6'>
            <MetricCard title='Total' value={`${totalTxt} ${token.symbol}`} />
            <MetricCard
              title='Available'
              value={`${availableTxt} ${token.symbol}`}
              valueClass='text-green-400'
              onClick={() => setQuantity(availableQuantity)}
            />
            <MetricCard
              title='Already claimed'
              value={`${claimedTxt} ${token.symbol}`}
              valueClass='text-blue-400'
            />
          </div>
        </div>

        <div className='mb-6'>
          <div className='flex mb-2'>
            <div className='relative flex-1 mr-2'>
              <NumberInput
                headerText='From'
                token={token}
                quantity={quantity}
                changeQuantity={(q?: string) => setQuantity(q)}
                balance={amountAvailable}
                className='bg-[var(--hover-bg)] brightness-125 py-3 pr-16 pl-3 rounded-lg focus:outline-none w-full font-semibold'
                placeholder='Amount to claim'
              />
              <button
                onClick={() => setQuantity(availableQuantity)}
                className='top-1/2 right-0 absolute hover:brightness-125 p-3 text-[var(--secondary-color)] text-sm -translate-y-1/2 transform'
              >
                Max
              </button>
            </div>
            <Button
              text='Claim'
              variant='contained'
              pending={pending}
              disabled={
                !quantity ||
                quantity === '' ||
                parseUnits(quantity, token.decimals) === 0n ||
                parseUnits(quantity, token.decimals) > amountAvailable
              }
              onClick={submitTx}
              stretch={false}
              className='items-center px-10 py-2 rounded-lg font-semibold'
            />
          </div>
        </div>

        <div className='border-gray-700 border-t'>
          <button
            className='flex justify-between items-center px-4 pt-4 pb-6 w-full font-medium text-sm'
            onClick={() => setExpanded(!expanded)}
          >
            <span>More info</span>
            <FontAwesomeIcon icon={expanded ? faAngleUp : faAngleDown} />
          </button>

          {expanded && (
            <div className='space-y-3 px-4 pb-6 text-sm'>
              <InfoRow
                label='Start Date'
                value={new Date(Number(startTimestamp)).toLocaleString()}
                tooltip='Start darte of the vesting period. Includes cliff and linear phases.'
                info={startTimestamp + ' ms'}
              />
              <InfoRow
                label='Initial Release'
                value={
                  printBigintIsh(token, initialReleaseAmount) +
                  ' ' +
                  token.symbol
                }
                tooltip='Initial amount released at the start of vesting'
              />
              <InfoRow
                label='Cliff'
                value={
                  cliffDuration
                    ? getIntervalFromSeconds(Number(cliffDuration) / 1000).join(
                        ''
                      )
                    : 'No cliff'
                }
                tooltip='Duration during which no tokens can be claimed after start date'
                info={cliffDuration ? cliffDuration + ' ms' : ''}
              />
              <InfoRow
                label='Linear'
                value={getIntervalFromSeconds(
                  Number(linearDuration) / 1000
                ).join('')}
                tooltip='Duration during which tokens can be claimed linearly after the cliff'
                info={linearDuration + ' ms'}
              />
              <InfoRow
                label='Claimed'
                value={claimedTxt + ' ' + token.symbol}
                tooltip={`Total amount of ${token.symbol} already claimed from this vesting`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VestingCard;

interface MetricCardProps {
  title: string;
  value: string;
  valueClass?: string;
  onClick?: () => void;
}

const MetricCard = ({
  title,
  value,
  valueClass = 'text-white',
  onClick
}: MetricCardProps) => (
  <div
    className={clsx(
      'flex flex-col gap-1 bg-[var(--hover-bg)] brightness-125 p-4 rounded-lg text-center',
      onClick && 'cursor-pointer hover:brightness-[1.40]'
    )}
    onClick={onClick}
  >
    <span className='font-extralight text-sm'>{title}</span>
    <span className={clsx('mt-1 font-semibold text-md', valueClass)}>
      {value}
    </span>
  </div>
);

interface InfoRowProps {
  label: string;
  value: string;
  tooltip: string;
  info?: string;
}

const InfoRow = ({ label, value, tooltip, info }: InfoRowProps) => (
  <div className='flex justify-between items-center'>
    <div className='flex items-center gap-1'>
      <Tooltip trigger={<FontAwesomeIcon icon={faQuestionCircle} />}>
        <div className='leading-4'>{tooltip}</div>
      </Tooltip>
      <span>{label}</span>
    </div>
    <div className='flex flex-col items-end'>
      <span className='font-medium text-white'>{value}</span>
      {info && <span className='text-xs'>{info}</span>}
    </div>
  </div>
);
