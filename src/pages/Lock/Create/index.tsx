import { useContext, useState } from 'react';
import { parseUnits } from '@dusalabs/sdk';
import clsx from 'clsx/lite';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import {
  faLock,
  faClock,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import { Warning } from 'components/Info';
import Modal from 'components/Modal';
import PageHeader from 'components/PageHeader';
import TokenInput from 'components/TokenInput';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { votingEscrowSC } from 'utils/config';
import {
  MAX_LOCK,
  U256_MAX,
  MIN_LOCK_DAYS,
  MAX_LOCK_YEARS
} from 'utils/constants';
import { formatNumber } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import {
  buildCreateLockTx,
  buildIncreaseAllowanceTx
} from 'utils/transactionBuilder';
import { Allowance } from 'utils/types';
import './index.scss';

// Helper function to format lock duration with special cases for exact constraints
const formatLockDuration = (unlockDate: dayjs.Dayjs): string => {
  const now = dayjs();

  // Special case 1: Exactly 7 days (minimum constraint)
  const totalDays = unlockDate.diff(now, 'day');
  if (totalDays === 6 || totalDays === 7) {
    return '7 days';
  }

  // Special cases for preset years (with tolerance for calculation precision)
  const totalYears = unlockDate.diff(now, 'year', true);
  if (totalYears >= 0.97 && totalYears <= 1.02) {
    return '1 year';
  }
  if (totalYears >= 1.97 && totalYears <= 2.02) {
    return '2 years';
  }
  if (totalYears >= 2.97 && totalYears <= 3.02) {
    return '3 years';
  }
  if (totalYears >= 3.98 && totalYears <= 4.02) {
    return '4 years';
  }

  // Regular calculation for other values
  const years = unlockDate.diff(now, 'year');
  const months = unlockDate.diff(now.add(years, 'year'), 'month');
  const days = unlockDate.diff(
    now.add(years, 'year').add(months, 'month'),
    'day'
  );

  const parts: string[] = [];

  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  // If no significant time difference, show in weeks
  if (parts.length === 0) {
    const weeks = Math.max(1, unlockDate.diff(now, 'week'));
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }

  return parts.join(', ');
};

// Function to calculate weeks from tick - now 1:1 mapping for perfect precision
const calculateWeeksFromTick = (tick: number): number => {
  // With 208 ticks, each tick equals exactly one week
  return Math.max(1, tick);
};

// Function to calculate exact unlock date based on duration value
const calculateUnlockDate = (durationValue: number): dayjs.Dayjs => {
  if (durationValue <= 1)
    // Minimum: exactly 7 days
    return dayjs().add(MIN_LOCK_DAYS, 'day');

  if (durationValue >= 208)
    // Maximum: exactly 208 weeks (MAX_LOCK)
    return dayjs().add(MAX_LOCK, 'week');

  // Perfect 1:1 mapping: tick = weeks directly
  const weeks = calculateWeeksFromTick(durationValue);
  return dayjs().add(weeks, 'week');
};

// Function to calculate equivalent weeks for voting power calculation
const calculateEquivalentWeeks = (unlockDate: dayjs.Dayjs): number => {
  return Math.max(1, unlockDate.diff(dayjs(), 'week'));
};

const CreateLock = () => {
  const [quantity, setQuantity] = useState<string | undefined>('');
  const [durationValue, setDurationValue] = useState<number>(104); // Middle value = 2 years (104 weeks)
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Store locked values for success modal
  const [lockedAmount, setLockedAmount] = useState<string>('');
  const [lockedUnlockDate, setLockedUnlockDate] =
    useState<dayjs.Dayjs>(dayjs());
  const [lockedVotingPower, setLockedVotingPower] = useState<number>(0);

  const { tokensInfo, connected } = useContext(AccountWrapperContext);
  const dusaIndex = tokensInfo?.findIndex(
    ({ token }) => token.address === DUSA_MAIN.address
  );
  const balance =
    tokensInfo && dusaIndex !== undefined && dusaIndex !== -1
      ? tokensInfo[dusaIndex].balance
      : undefined;

  // console.log({ tokensInfo, balance });
  const unlockDate = calculateUnlockDate(durationValue);
  const lockDuration = Math.abs(dayjs().diff(unlockDate));

  const allowanceQuery = useFetchAllowance({
    tokenAddress: DUSA_MAIN.address,
    spenderAddress: votingEscrowSC
  });
  const allowance = allowanceQuery.data || 0n;

  const amount = parseUnits(quantity || '0', DUSA_MAIN.decimals);

  const amountToIncreaseAllowance =
    allowanceType === 'increaseMax' ? U256_MAX : amount - allowance;

  const { submitTx, pending } = useSendTransaction({
    data: buildCreateLockTx(amount, lockDuration),
    onTxConfirmed: () => {
      // Store current values for success modal
      setLockedAmount(quantity || '0');
      setLockedUnlockDate(unlockDate);
      setLockedVotingPower(votingPower);
      setShowSuccessModal(true);
      allowanceQuery.refetch();
    }
  });
  console.log({ allowance });

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        DUSA_MAIN.address,
        votingEscrowSC,
        amountToIncreaseAllowance
      ),
      onTxConfirmed: () => allowanceQuery.refetch()
    });

  const equivalentWeeks = calculateEquivalentWeeks(unlockDate);
  const votingPower = (Number(quantity) * equivalentWeeks) / MAX_LOCK;

  const noQuantity = !quantity || Number(quantity) === 0;
  const notEnoughBalance = amount > 0n && amount > (balance || 0n);
  const disabled = notEnoughBalance || noQuantity;
  const notEnoughAllowance = allowance < amount;

  const getTextDisabled = () => {
    if (noQuantity) return 'Enter an amount';
    if (notEnoughBalance) return 'Insufficient balance';
    if (notEnoughAllowance) return 'Insufficient allowance';
    return undefined;
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    document.body.style.overflow = 'auto';
    // Reset form values after closing modal
    setQuantity('');
    setDurationValue(104); // Reset to default 2 years
  };

  return (
    <div className='CreateLock'>
      <PageHeader
        title='Create Lock'
        description='Lock your DUSA tokens to receive veDUSA and participate in governance'
      />

      <div className='create-lock-content'>
        <div className='main-content'>
          <div className='lock-form-card'>
            <h2 className='form-title'>
              <FontAwesomeIcon icon={faLock} />
              Lock Configuration
            </h2>

            <div className='form-section'>
              <label className='form-label'>Amount to Lock</label>
              <div className='token-input-wrapper'>
                <TokenInput
                  token={DUSA_MAIN}
                  balance={balance}
                  quantity={quantity}
                  changeQuantity={(value) => setQuantity(value)}
                  isError={notEnoughBalance}
                  headerText={'From'}
                />
              </div>
              {notEnoughBalance && (
                <div className='error-text'>Insufficient balance</div>
              )}
            </div>

            <div className='form-section'>
              <label className='form-label'>
                <FontAwesomeIcon icon={faClock} />
                Lock Duration
              </label>
              <div className='duration-info'>
                <div className='duration-display'>
                  <span className='duration-text'>
                    Locking for {formatLockDuration(unlockDate)} (until{' '}
                    {unlockDate.format('MMM DD, YYYY')})
                  </span>
                  <span className='voting-power'>
                    ≈ {formatNumber(votingPower)} veDUSA voting power
                  </span>
                </div>
              </div>

              <div className='duration-controls'>
                <input
                  type='range'
                  min={1}
                  max={208}
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className='duration-slider'
                />

                <div className='duration-presets'>
                  {[
                    { value: 1, label: '7 days' },
                    { value: 52, label: '1 year' },
                    { value: 104, label: '2 years' },
                    { value: 156, label: '3 years' },
                    { value: 208, label: '4 years' }
                  ].map((preset) => (
                    <Button
                      key={preset.value}
                      variant={
                        durationValue === preset.value
                          ? 'contained'
                          : 'outlined'
                      }
                      text={preset.label}
                      onClick={() => setDurationValue(preset.value)}
                      size='small'
                      className='preset-button'
                    />
                  ))}
                </div>
              </div>
            </div>

            <Warning text='Locking will give you an NFT, referred to as a veNFT. You can increase the Lock amount or extend the Lock time at any point after.' />

            <div className='action-buttons'>
              {connected && notEnoughAllowance && (
                <ButtonAllowance
                  token={DUSA_MAIN}
                  pending={pendingAllowance}
                  onClick={increaseAllowance}
                  allowanceType={allowanceType}
                  setAllowanceType={setAllowanceType}
                />
              )}

              <Button
                variant='contained'
                needConnect
                text='Create Lock'
                onClick={submitTx}
                pending={pending}
                disabled={pendingAllowance || disabled}
                disabledText={getTextDisabled()}
                className='create-lock-button'
              />
            </div>
          </div>
        </div>

        <div className='sidebar-content'>
          <div className='info-card'>
            <h3 className='info-title'>
              <FontAwesomeIcon icon={faCheckCircle} />
              How It Works
            </h3>

            {!quantity ? (
              <div className='steps-list'>
                <div className='step-item'>
                  <div className='step-number'>1</div>
                  <div className='step-content'>
                    <h4>Select Amount</h4>
                    <p>Choose the amount of DUSA tokens you want to lock.</p>
                  </div>
                </div>

                <div className='step-item'>
                  <div className='step-number'>2</div>
                  <div className='step-content'>
                    <h4>Set Duration</h4>
                    <p>
                      Select lock duration (1 week to 4 years). Longer locks =
                      more voting power.
                    </p>
                  </div>
                </div>

                <div className='step-item'>
                  <div className='step-number'>3</div>
                  <div className='step-content'>
                    <h4>Confirm Lock</h4>
                    <p>Review and confirm your lock configuration.</p>
                  </div>
                </div>

                <div className='step-item'>
                  <div className='step-number'>4</div>
                  <div className='step-content'>
                    <h4>Manage Lock</h4>
                    <p>
                      Your veNFT will appear in your dashboard for management.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='lock-summary'>
                <div className='summary-item'>
                  <span className='summary-label'>Lock Amount:</span>
                  <span className='summary-value'>
                    {formatNumber(Number(quantity))} DUSA
                  </span>
                </div>

                <div className='summary-item'>
                  <span className='summary-label'>Lock Duration:</span>
                  <span className='summary-value'>
                    {formatLockDuration(unlockDate)} (until{' '}
                    {unlockDate.format('MMM DD, YYYY')})
                  </span>
                </div>

                <div className='summary-item highlight'>
                  <span className='summary-label'>Voting Power:</span>
                  <span className='summary-value'>
                    {formatNumber(votingPower)} veDUSA
                  </span>
                </div>

                <div className='summary-item'>
                  <span className='summary-label'>Unlock Date:</span>
                  <span className='summary-value'>
                    {unlockDate.format('MMM DD, YYYY')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        showModal={showSuccessModal}
        setShowModal={setShowSuccessModal}
        title='Lock Created Successfully!'
        onClose={handleModalClose}
        variant='medium'
      >
        <div className='p-5 text-center'>
          <div className='mb-4 text-5xl'>🔒</div>
          <p className='mb-4 text-base'>
            Your DUSA tokens have been successfully locked!
          </p>
          <p className='mb-3 text-gray-600 text-sm'>
            You have received a veNFT representing your locked position.
          </p>
          <div className='bg-green-500/10 mt-4 p-3 rounded-lg'>
            <p className='mb-2 font-bold text-sm'>Lock Summary</p>
            <p className='my-1 text-sm'>
              Amount: {formatNumber(Number(lockedAmount))} DUSA
            </p>
            <p className='my-1 text-sm'>
              Duration: {formatLockDuration(lockedUnlockDate)}
            </p>
            <p className='my-1 text-sm'>
              Voting Power: {formatNumber(lockedVotingPower)} veDUSA
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CreateLock;
