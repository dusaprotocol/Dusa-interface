import { useContext, useState } from 'react';
import { faLock, faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import { Warning } from 'components/Info';
import Modal, { ModalProps } from 'components/Modal';
import SwitchButton from 'components/SwitchButton';
import TokenInput from 'components/TokenInput';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { MAX_LOCK, ONE_WEEK, U256_MAX } from 'utils/constants';
import { DUSA_MAIN } from 'utils/tokens';
import {
  buildIncreaseAllowanceTx,
  buildIncreaseAmountTx,
  buildIncreaseUnlockTimeTx,
  buildLockPermanentTx,
  buildPokeTx,
  buildResetTx,
  buildUnlockPermanentTx
} from 'utils/transactionBuilder';
import { Allowance, Lock } from 'utils/types';
dayjs.extend(relativeTime);
import Steps from './Steps';
// import Toggle from 'components/Toggle';
import { parseUnits, TokenAmount } from '@dusalabs/sdk';
import { governanceSC, votingEscrowSC } from 'utils/config';
import useFetchAllowance from 'hooks/useFetchAllowance';
import { argsDelimiter, fetchLockVotingPower } from 'utils/datastoreFetcher';
import { printBigintIsh } from 'utils/methods';
import useFetchDatastore from 'hooks/useFetchDatastore';
import './index.scss';

interface UpdateLockModalProps extends ModalProps {
  lock: Lock;
  showOtherModal: boolean;
  setShowOtherModal: React.Dispatch<React.SetStateAction<boolean>>;
  // updateLock: (id: number, data: { endDate: string }) => Promise<void>;
}

export const ExtendLockModal = ({
  lock,
  // updateLock,
  showOtherModal,
  setShowOtherModal,
  showModal,
  setShowModal
}: UpdateLockModalProps) => {
  const [permanent, setPermanent] = useState<boolean>(lock.permanent);
  const actualLockDuration = permanent
    ? ONE_WEEK * 52 * 4
    : Math.abs(dayjs().diff(dayjs(lock.timestamp)));
  const actualWeeks = actualLockDuration / ONE_WEEK;
  const [weeks, setWeeks] = useState<number>(actualWeeks);

  const unlockDate = dayjs().add(permanent ? MAX_LOCK : weeks, 'week');
  const lockDuration = Math.abs(dayjs().diff(unlockDate));
  const lockPermanent = useSendTransaction({
    data: buildLockPermanentTx(BigInt(lock.id))
  });
  const increaseUnlockTime = useSendTransaction({
    data: buildIncreaseUnlockTimeTx(BigInt(lock.id), BigInt(lockDuration))
  });

  const quantity = new TokenAmount(DUSA_MAIN, lock.amount).toSignificant(8);
  const isPermanent = lock.permanent;

  // const votingPower = ((Number(quantity) * actualWeeks) / MAX_LOCK).toFixed(4);
  const votingPowerQuery = useQuery(['votingPower', lock.id], () =>
    fetchLockVotingPower(lock.id)
  );
  const votingPower = votingPowerQuery.data;
  const newVotingPower = (
    (Number(quantity) * (permanent ? MAX_LOCK : weeks)) /
    MAX_LOCK
  ).toFixed(4);

  // array of 5 preset from actualWeeks to MAX_LOCK
  const presets = Array.from(
    { length: 5 },
    (_, i) => actualWeeks + (i * (MAX_LOCK - actualWeeks)) / 4
  );

  const governanceDatastoreQuery = useFetchDatastore(governanceSC);
  const datastoreKeys = governanceDatastoreQuery.data || [];

  const voteKeys = datastoreKeys.filter((key) =>
    key.startsWith(`votes::${lock.id}${argsDelimiter}`)
  );
  const hasLockVoted = voteKeys.length > 0;

  const { submitTx: submitTxPoke, pending: pendingPoke } = useSendTransaction({
    data: buildPokeTx(BigInt(lock.id))
  });

  const reset = useSendTransaction({
    data: buildResetTx(BigInt(lock.id || 0))
  });

  const unpermanentLock = useSendTransaction({
    data: buildUnlockPermanentTx(BigInt(lock.id || 0))
  });

  return (
    <Modal
      className='ExtendLockModal'
      showModal={showModal}
      setShowModal={setShowModal}
      title='Extend Lock'
    >
      <div className='Modal-body'>
        <div className='left'>
          <div className='lock-info-section'>
            <div className='lock-title'>
              <div className='lock-icon'>
                <FontAwesomeIcon icon={faClock} />
              </div>
              Extending Lock #{lock.id}
            </div>
            <div className='lock-details'>
              <div className='detail-item'>
                <span className='label'>Time Remaining</span>
                <span className='value'>
                  {lock.permanent
                    ? 'Permanent lock'
                    : dayjs(lock.timestamp).fromNow(true)}
                </span>
              </div>
              <div className='detail-item'>
                <span className='label'>Current Voting Power</span>
                <span className='value'>
                  {printBigintIsh(DUSA_MAIN, votingPower || 0n)} veDUSA
                </span>
              </div>
            </div>
          </div>

          <div className='permanent-toggle-section'>
            <div className='toggle-header'>
              <SwitchButton
                isActive={permanent}
                onClick={() => setPermanent((prev) => !prev)}
              />
              <div className='toggle-title'>Permanent Lock</div>
            </div>
            <Warning text='When activated, it sets the lock to maximum unlock time, until disabled. Once disabled, the regular vesting unlock time will apply. Maximum unlock time gives a 1-to-1 voting power to the amount of locked tokens.' />
          </div>

          {!permanent && !isPermanent && (
            <div className='input'>
              <div className='input-header'>
                Extending to{' '}
                <SimpleTooltip
                  title={unlockDate.fromNow(true)}
                  description={unlockDate.format('DD/MM/YYYY')}
                  position='top'
                />{' '}
                for {newVotingPower} veDUSA voting power
              </div>
              <input
                type='range'
                min={actualWeeks}
                max={MAX_LOCK}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
              />
              <div className='presets'>
                {presets.map((preset, i) => {
                  const text =
                    i === 0
                      ? 'Min'
                      : i === presets.length - 1
                        ? 'Max'
                        : dayjs().add(preset, 'week').fromNow(true);
                  return (
                    <div className='preset' key={preset}>
                      <Button
                        variant='text'
                        text={text}
                        onClick={() => setWeeks(preset)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Warning>
            <div>
              You can extend the lock or{' '}
              <Button
                text='increase the lock amount.'
                style={{ padding: '0' }}
                variant='text'
                onClick={() => {
                  setShowModal(false);
                  setShowOtherModal(true);
                }}
              />{' '}
              These actions will increase your voting power. The maximum lock
              time is 4 years!
            </div>
          </Warning>
        </div>

        <div className='right'>
          {!isPermanent && (
            <>
              <div className='summary-item'>
                <span>New lock time</span>
                <span>{unlockDate.format('DD/MM/YYYY')}</span>
              </div>
              <div className='summary-item'>
                <span>New estimated voting power</span>
                <span>{newVotingPower} veDUSA</span>
              </div>
              <Button
                variant='contained'
                text='Extend Lock'
                onClick={
                  permanent
                    ? lockPermanent.submitTx
                    : increaseUnlockTime.submitTx
                }
                pending={
                  permanent ? lockPermanent.pending : increaseUnlockTime.pending
                }
              />
            </>
          )}
          {isPermanent && !permanent && (
            <>
              <Button
                text='Reset before withdrawing'
                variant='outlined'
                onClick={() => {
                  reset.submitTx();
                }}
              />
              <Button
                text='Unpermanent Lock'
                variant='contained'
                onClick={() => {
                  unpermanentLock.submitTx();
                }}
              />
            </>
          )}
          {hasLockVoted &&
            !lockPermanent.pending &&
            !increaseUnlockTime.pending && (
              <>
                <Warning>
                  <div>
                    If you already voted with this lock, poke to update your
                    voting power.
                  </div>
                </Warning>
                <Button
                  variant='contained'
                  needConnect
                  text='Poke'
                  onClick={submitTxPoke}
                  pending={pendingPoke}
                />
              </>
            )}
          <Steps steps={[]} />
        </div>
      </div>
    </Modal>
  );
};

export const IncreaseLockModal = ({
  lock,
  // updateLock,
  showOtherModal,
  setShowOtherModal,
  showModal,
  setShowModal
}: UpdateLockModalProps) => {
  const [quantity, setQuantity] = useState<string | undefined>('');
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');

  const { tokensInfo, connected } = useContext(AccountWrapperContext);
  const dusaIndex = tokensInfo?.findIndex(
    ({ token }) => token.address === DUSA_MAIN.address
  );
  const balance =
    tokensInfo && dusaIndex && dusaIndex !== -1
      ? tokensInfo[dusaIndex].balance
      : undefined;

  const allowanceQuery = useFetchAllowance({
    tokenAddress: DUSA_MAIN.address,
    spenderAddress: votingEscrowSC
  });
  const allowance = allowanceQuery.data || 0n;

  const amount = parseUnits(quantity || '0', DUSA_MAIN.decimals);

  const amountToIncreaseAllowance =
    allowanceType === 'increaseMax' ? U256_MAX : amount - allowance;

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        DUSA_MAIN.address,
        votingEscrowSC,
        amountToIncreaseAllowance
      ),
      onTxConfirmed: () => allowanceQuery.refetch()
    });

  const actualQuantity = new TokenAmount(DUSA_MAIN, lock.amount).toSignificant(
    8
  );

  const actualLockDuration = lock.permanent
    ? ONE_WEEK * 52 * 4
    : Math.abs(dayjs().diff(dayjs(lock.timestamp)));
  const weeks = actualLockDuration / ONE_WEEK;
  const votingPower = ((Number(actualQuantity) * weeks) / MAX_LOCK).toFixed(4);

  const governanceDatastoreQuery = useFetchDatastore(governanceSC);
  const datastoreKeys = governanceDatastoreQuery.data || [];

  // Check if this lock has voted on any active proposal
  const voteKeys = datastoreKeys.filter((key) => key.startsWith('v::'));
  const hasLockVoted = voteKeys.some((key) =>
    key.includes(`${argsDelimiter}${lock.id}`)
  );

  const { submitTx, pending } = useSendTransaction({
    data: buildIncreaseAmountTx(BigInt(lock.id), amount),
    onTxConfirmed: () => {
      setQuantity('');
      allowanceQuery.refetch();
    }
  });

  const { submitTx: submitTxPoke, pending: pendingPoke } = useSendTransaction({
    data: buildPokeTx(BigInt(lock.id))
  });

  return (
    <Modal
      className='IncreaseLockModal'
      showModal={showModal}
      setShowModal={setShowModal}
      title='Increase Lock'
    >
      <div className='Modal-body'>
        <div className='left'>
          <div className='lock-info-section'>
            <div className='lock-title'>
              <div className='lock-icon'>
                <FontAwesomeIcon icon={faLock} />
              </div>
              Increasing Lock #{lock.id}
            </div>
            <div className='lock-details'>
              <div className='detail-item'>
                <span className='label'>Current Amount</span>
                <span className='value'>{actualQuantity} DUSA</span>
              </div>
              <div className='detail-item'>
                <span className='label'>Time Remaining</span>
                <span className='value'>
                  {lock.permanent
                    ? 'Permanent lock'
                    : dayjs(lock.timestamp).fromNow(true)}
                </span>
              </div>
              <div className='detail-item'>
                <span className='label'>Current Voting Power</span>
                <span className='value'>{votingPower} veDUSA</span>
              </div>
            </div>
          </div>

          <div className='input'>
            <TokenInput
              token={DUSA_MAIN}
              balance={balance}
              quantity={quantity}
              changeQuantity={(value) => setQuantity(value)}
              headerText='Amount to Add'
            />
          </div>

          <Warning>
            <div>
              Depositing into the lock will increase your voting power. You can
              also{' '}
              <Button
                style={{ padding: '0' }}
                variant='text'
                text='extend the lock time.'
                onClick={() => {
                  setShowModal(false);
                  setShowOtherModal(true);
                }}
              />
            </div>
          </Warning>
        </div>

        <div className='right'>
          {connected && allowance < amount && (
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
            text='Increase Lock Amount'
            onClick={submitTx}
            pending={pending}
            disabled={
              pendingAllowance ||
              allowance < amount ||
              !quantity ||
              Number(quantity) === 0
            }
          />
          {hasLockVoted && !pending && (
            <>
              <Warning>
                <div>
                  If you already voted this epoch with this lock, update your
                  incentives vote so your new veDUSA counts.
                </div>
              </Warning>
              <Button
                variant='contained'
                needConnect
                text='Update Incentives Votes'
                onClick={submitTxPoke}
                pending={pendingPoke}
              />
            </>
          )}
          <Steps steps={[]} />
        </div>
      </div>
    </Modal>
  );
};
