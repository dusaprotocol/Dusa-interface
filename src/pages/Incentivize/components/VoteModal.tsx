import { useContext, useState, useEffect, useRef } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import {
  faCheck,
  faLock,
  faTrash,
  faVoteYea,
  faGripVertical
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router-dom';
import Button from 'components/Button';
import LockThumbnail from 'components/LockThumbnail';
import Modal, { ModalProps } from 'components/Modal';
import PoolTitle from 'components/PoolTitle';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useResizeWindow from 'hooks/useResizeWindow';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { routeNames } from 'routes';
import { ProtocolTimeLibrary } from 'utils/constants';
import { fetchLocksLastVoted } from 'utils/datastoreFetcher';
import { DUSA_MAIN } from 'utils/tokens';
import { buildVoteEscrowTx } from 'utils/transactionBuilder';
import { Lock, Pool } from 'utils/types';
import { IncentivizeContext } from '..';
import { ExtendLockModal, IncreaseLockModal } from './UpdateLockModals';
import './index.scss';

dayjs.extend(relativeTime);

type VoteModalProps = ModalProps & {
  selectedPools?: Set<string>;
};

interface DragData {
  type: 'pool';
  poolAddress: string;
}

const PoolDragItem = ({ pool }: { pool: Pool }) => {
  const handleDragStart = (e: React.DragEvent) => {
    const dragData: DragData = {
      type: 'pool',
      poolAddress: pool.pairAddress
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className='group flex items-center gap-2 hover:shadow-blue-500/10 hover:shadow-lg p-4 border border-gray-200/50 dark:border-gray-600/50 hover:border-blue-400 rounded-lg active:scale-[0.98] transition-all duration-300 cursor-grab active:cursor-grabbing'
      draggable
      onDragStart={handleDragStart}
    >
      <div className='flex justify-center items-center bg-gradient-to-br group-hover:bg-gradient-to-br from-blue-500/10 group-hover:from-blue-500/20 to-indigo-500/10 group-hover:to-indigo-500/20 border border-blue-500/20 group-hover:border-blue-400/40 rounded-lg w-8 h-8 text-gray-500 dark:text-gray-400 text-sm transition-all duration-300'>
        <FontAwesomeIcon icon={faGripVertical} />
      </div>
      <div className='relative flex-1 min-w-0'>
        <PoolTitle pool={pool} />
      </div>
    </div>
  );
};

const PoolSelector = ({
  lock,
  availablePools,
  addVoteForPool,
  votes,
  disabled = false
}: {
  lock: Lock;
  availablePools: Pool[];
  addVoteForPool: (pool: Pool, lock: Lock) => void;
  votes: any[];
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out pools already selected for this specific lock
  const filteredPools = availablePools.filter((pool) => {
    const isAlreadySelected = votes.some(
      (vote) =>
        vote.lock.id === lock.id && vote.pool.pairAddress === pool.pairAddress
    );
    return !isAlreadySelected;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      className='pool-selector-test'
      style={{ position: 'relative' }}
      ref={dropdownRef}
    >
      <Button
        text='➕ Add Pool'
        variant='outlined'
        className='whitespace-nowrap add-pool-mobile-btn'
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
      />

      {isOpen && (
        <div className='pool-selector-dropdown-content'>
          <div className='pool-selector-header'>
            <span className='font-medium text-sm'>
              Select a pool to vote with lock #{lock.id}:
            </span>
          </div>
          <div className='pool-selector-list'>
            {filteredPools.length === 0 ? (
              <div className='py-4 text-gray-500 text-center'>
                {availablePools.length === 0
                  ? 'No pools available'
                  : 'All available pools already selected for this lock'}
              </div>
            ) : (
              filteredPools.map((pool) => (
                <button
                  key={pool.pairAddress}
                  className='pool-selector-item'
                  onClick={() => {
                    addVoteForPool(pool, lock);
                    setIsOpen(false);
                  }}
                >
                  <PoolTitle pool={pool} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const VoteModal = (props: VoteModalProps) => {
  const { showModal, setShowModal, selectedPools } = props;

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [updateLock, _setUpdateLock] = useState<Lock | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOverLock, setDragOverLock] = useState<number | null>(null);

  // Screen size detection
  const { innerWidth } = useResizeWindow();
  const isMobile = innerWidth < 768;

  // All useContext hooks
  const contextValue = useContext(IncentivizeContext);
  const {
    pools,
    poolAddressesReady,
    votes,
    setVotes,
    updateVoteWeight,
    removeFromVote,
    votingPowers
  } = contextValue;

  const { locks: _locks, isLoading } = useContext(AccountWrapperContext);
  const locks = _locks?.filter(
    (l) => l.timestamp === 0 || l.timestamp > Date.now()
  );
  const isLoadingLocks = isLoading(['locks']);
  const lockIds = locks?.map((l) => l.id) || [];

  // Note: Removed automatic vote addition useEffect for manual drag & drop only

  // useQuery hook
  const lastVotedQuery = useQuery(
    ['lastVoted', locks],
    () => fetchLocksLastVoted(lockIds),
    { enabled: !!locks }
  );
  const lastVoted = lastVotedQuery.data || [];

  // useSendTransaction hooks
  const { submitTx: vote, pending: isVoting } = useSendTransaction({});

  // Validate context is available
  const isContextValid = contextValue && setVotes;

  // Get available pools for mobile dropdown
  const getAvailablePools = () => {
    if (!selectedPools || selectedPools.size === 0) return [];

    return Array.from(selectedPools)
      .map((poolAddress) => {
        // Try exact match first
        let found = pools.find((p) => p.pairAddress === poolAddress);

        // If not found, try case-insensitive match
        if (!found) {
          found = pools.find(
            (p) => p.pairAddress.toLowerCase() === poolAddress.toLowerCase()
          );
        }

        return found;
      })
      .filter((pool): pool is Pool => !!pool);
  };

  const availablePools = getAvailablePools();

  const addVoteForPool = (pool: Pool, lock: Lock) => {
    if (!votes) {
      return;
    }

    if (!setVotes) {
      return;
    }

    const existingVote = votes.find(
      (v) => v.lock.id === lock.id && v.pool.pairAddress === pool.pairAddress
    );

    if (existingVote) {
      return;
    }

    const newVote = {
      lock,
      pool,
      weight: 0
    };

    const newVotes = [...votes, newVote];

    setVotes(newVotes);
  };

  const getVoteError = (
    index: number,
    filteredVotes: any[],
    totalWeight: number
  ) => {
    if (!locks) return null;

    // 1. Check max voting number (from contract: 30 pools max)
    if (filteredVotes.length > 30) {
      return 'Too many pools selected (max 30)';
    }

    // 2. Check if already voted in current epoch
    const currentEpochStart = ProtocolTimeLibrary.epochStart();
    if (lastVoted[index] >= currentEpochStart) {
      return 'Already voted in current epoch';
    }

    // 3. Check voting window (not in distribute window or last hour)
    const currentTime = Date.now();
    const epochVoteStart = ProtocolTimeLibrary.epochVoteStart(currentTime);
    const epochVoteEnd = ProtocolTimeLibrary.epochVoteEnd(currentTime);

    if (currentTime <= epochVoteStart) {
      return 'Currently in distribute window';
    }

    if (currentTime >= epochVoteEnd) {
      return 'Voting disabled during the last hour of epoch';
    }

    // 4. Check weights
    if (totalWeight === 0) {
      return 'No voting power allocated';
    }
    if (totalWeight > 100) {
      return 'Total weight exceeds 100%';
    }

    return null;
  };

  const handleVote = (index: number) => {
    if (!locks) return;
    const selectedLock = locks[index];
    const selectedLockVotes =
      votes?.filter((v) => v.lock.id === selectedLock.id) || [];

    const totalWeight = selectedLockVotes.reduce(
      (acc, v) => acc + (v.weight || 0),
      0
    );

    const error = getVoteError(index, selectedLockVotes, totalWeight);
    if (error) {
      setErrors({ ...errors, [selectedLock.id]: error });
      return;
    }

    // Clear any previous errors
    const newErrors = { ...errors };
    delete newErrors[selectedLock.id];
    setErrors(newErrors);

    // Build transaction with weights as percentages (contract will handle normalization)
    // Convert to basis points (tenths of percent) to support 1 decimal place
    const normalizedWeights = selectedLockVotes.map((v) =>
      BigInt(Math.round((v.weight || 0) * 10))
    );

    const data = buildVoteEscrowTx(
      BigInt(selectedLock.id),
      selectedLockVotes.map((s) => s.pool.pairAddress),
      normalizedWeights
    );
    vote(data);
  };

  if (showExtendModal && updateLock)
    return (
      <ExtendLockModal
        lock={updateLock}
        showOtherModal={showIncreaseModal}
        setShowOtherModal={setShowIncreaseModal}
        showModal={showExtendModal}
        setShowModal={setShowExtendModal}
      />
    );
  if (showIncreaseModal && updateLock)
    return (
      <IncreaseLockModal
        lock={updateLock}
        showOtherModal={showExtendModal}
        setShowOtherModal={setShowExtendModal}
        showModal={showIncreaseModal}
        setShowModal={setShowIncreaseModal}
      />
    );

  if (!showModal) return null;

  return (
    <Modal
      setShowModal={setShowModal}
      showModal={showModal}
      className='VoteModal'
      title='Manage Your Votes'
    >
      {!isContextValid ? (
        <div className='context-error'>
          <p>❌ IncentivizeContext not available in VoteModal</p>
          <p>Please try refreshing the page.</p>
        </div>
      ) : (
        <>
          <div className='vote-modal-header'>
            <div className='header-icon'>
              <FontAwesomeIcon icon={faVoteYea} />
            </div>
            <div className='header-content'>
              <h2>
                Manage Your Votes{' '}
                <span className='header-subtitle'>
                  • Allocate voting power across pools
                </span>
              </h2>
            </div>
          </div>
          <div className='vote-modal-content'>
            <div className={`vote-modal-layout ${isMobile ? 'mobile' : ''}`}>
              {selectedPools && selectedPools.size > 0 && !isMobile ? (
                <div className='pools-column'>
                  <div className='pools-section'>
                    <div className='mb-6'>
                      <h3 className='m-0 mb-2 font-bold text-gray-900 dark:text-gray-100 text-lg'>
                        Available Pools
                      </h3>
                      <p className='m-0 text-gray-600 dark:text-gray-400 text-sm'>
                        {poolAddressesReady && availablePools.length > 0
                          ? 'Drag and drop each pool individually to the locks on the right to vote'
                          : poolAddressesReady && availablePools.length === 0
                            ? 'No valid pools found for the selected addresses'
                            : 'Loading pool addresses...'}
                      </p>
                    </div>
                    <div className='flex flex-col gap-3'>
                      {(() => {
                        // Use the availablePools from getAvailablePools function
                        const matchedPools = availablePools;

                        if (matchedPools.length === 0) {
                          return (
                            <div
                              style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: poolAddressesReady ? 'orange' : 'blue'
                              }}
                            >
                              {poolAddressesReady && pools.length > 0 ? (
                                <>
                                  ⚠️ No valid pools found for the selected
                                  addresses.
                                  <br />
                                  Selected pools: {selectedPools.size}
                                  <br />
                                  Valid pools in context: {pools.length}
                                  <br />
                                  Check console for details about invalid pools.
                                </>
                              ) : pools.length === 0 ? (
                                <>
                                  🔄 Loading pools data... ({selectedPools.size}{' '}
                                  selected)
                                  <br />
                                  Waiting for valid pool addresses...
                                </>
                              ) : (
                                <>
                                  🔄 Loading pool addresses... (
                                  {selectedPools.size} selected)
                                </>
                              )}
                            </div>
                          );
                        }

                        return matchedPools.map((pool) => (
                          <PoolDragItem key={pool.pairAddress} pool={pool} />
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className='locks-column'>
                <div className='locks-section-header'>
                  <h3 className='m-0 mb-2 font-bold text-gray-900 dark:text-gray-100 text-lg'>
                    Your Locks
                  </h3>
                  <p className='m-0 text-gray-600 dark:text-gray-400 text-sm'>
                    {isMobile
                      ? 'Use the "Add Pool" button in each lock to select pools for voting'
                      : 'Drop pools here to vote with your locks'}
                  </p>
                </div>
                <div className='locks-container'>
                  {isLoadingLocks ? (
                    <div className='loading-locks-message'>
                      <div className='loading-locks-icon'>
                        <div className='border-b-2 border-blue-500 rounded-full w-8 h-8 animate-spin'></div>
                      </div>
                      <div className='loading-locks-content'>
                        <h3>Loading Your Locks...</h3>
                        <p className='loading-locks-description'>
                          Fetching your DUSA locks from the blockchain...
                        </p>
                      </div>
                    </div>
                  ) : locks && locks.length > 0 ? (
                    locks.map((lock, index) => {
                      const filteredVotes =
                        votes?.filter((v) => v.lock.id === lock.id) || [];

                      const totalWeight = filteredVotes.reduce(
                        (acc, v) => acc + (v.weight || 0),
                        0
                      );

                      const isExpired =
                        lock.timestamp !== 0 && lock.timestamp <= Date.now();

                      const hasAlreadyVoted =
                        lastVoted[index] >= ProtocolTimeLibrary.epochStart();

                      return (
                        <div
                          className={`lock-card ${isExpired ? 'expired' : ''} ${
                            dragOverLock === lock.id ? 'drag-over' : ''
                          } ${hasAlreadyVoted ? 'disabled' : ''}`}
                          key={index}
                          onDragOver={(e) => {
                            if (hasAlreadyVoted) {
                              e.dataTransfer.dropEffect = 'none';
                              return;
                            }
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                            setDragOverLock(lock.id);
                          }}
                          onDragLeave={() => {
                            if (hasAlreadyVoted) return;
                            setDragOverLock(null);
                          }}
                          onDrop={(e) => {
                            if (hasAlreadyVoted) return;
                            e.preventDefault();
                            setDragOverLock(null);

                            try {
                              const dragDataString =
                                e.dataTransfer.getData('application/json');

                              if (!dragDataString) {
                                return;
                              }

                              const dragData: DragData =
                                JSON.parse(dragDataString);

                              if (dragData.type === 'pool') {
                                // Find the pool from our pools array using the address
                                const draggedPool = pools.find(
                                  (p) => p.pairAddress === dragData.poolAddress
                                );

                                if (!draggedPool) {
                                  return;
                                }

                                addVoteForPool(draggedPool, lock);
                              }
                            } catch (error) {
                              console.error(
                                '❌ Error parsing drag data:',
                                error
                              );
                            }
                          }}
                        >
                          <div className='lock-header'>
                            <div className='lock-info'>
                              <div className='lock-thumbnail-wrapper'>
                                <LockThumbnail lock={lock} isManagedVote />
                              </div>
                              <div className='voting-power-display'>
                                {(() => {
                                  const voteError = getVoteError(
                                    index,
                                    filteredVotes,
                                    totalWeight
                                  );
                                  const currentError = errors[lock.id];

                                  if (
                                    lastVoted[index] >=
                                    ProtocolTimeLibrary.epochStart()
                                  ) {
                                    return (
                                      <div className='status-voted'>
                                        <FontAwesomeIcon icon={faCheck} />
                                        <span>
                                          Voted{' '}
                                          {dayjs(lastVoted[index]).fromNow()}
                                        </span>
                                      </div>
                                    );
                                  }

                                  if (voteError || currentError) {
                                    return (
                                      <div className='status-error'>
                                        {currentError || voteError}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className='voting-power-info'>
                                      <span
                                        className={`power-available ${
                                          100 - totalWeight === 0
                                            ? 'power-available-complete'
                                            : 'power-available-incomplete'
                                        }`}
                                      >
                                        {Number(100 - totalWeight).toFixed(1)}%
                                        remaining
                                      </span>
                                      <Button
                                        text='Vote'
                                        variant='contained'
                                        className='vote-complete'
                                        onClick={() => handleVote(index)}
                                        disabled={totalWeight !== 100}
                                        pending={isVoting}
                                      />
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className='lock-actions'>
                              <div className='lock-buttons'>
                                {(() => {
                                  return (
                                    isMobile &&
                                    availablePools.length > 0 && (
                                      <PoolSelector
                                        lock={lock}
                                        availablePools={availablePools}
                                        addVoteForPool={addVoteForPool}
                                        votes={votes || []}
                                        disabled={hasAlreadyVoted}
                                      />
                                    )
                                  );
                                })()}
                                <Button
                                  text='Clear'
                                  variant='text'
                                  className='clear-votes-btn'
                                  onClick={() => {
                                    // Remove all votes for this lock at once
                                    const newVotes = votes.filter(
                                      (v) => v.lock.id !== lock.id
                                    );
                                    setVotes(newVotes);
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className='votes-section'>
                            {filteredVotes.length === 0 ? (
                              <div className='no-votes-message drop-zone-hint'>
                                <p>Drop pools here to vote with this lock</p>
                              </div>
                            ) : (
                              <div className='votes-list'>
                                {filteredVotes.map((v, i) => {
                                  const w = v.weight;
                                  const lockIndex = locks.findIndex(
                                    (l) => l.id === v.lock.id
                                  );
                                  const vp = votingPowers[lockIndex];
                                  return (
                                    <div key={i} className='vote-item'>
                                      <div className='vote-item-header'>
                                        <div className='pool-info'>
                                          <PoolTitle pool={v.pool} />
                                          <span className='voting-power'>
                                            Allocation:{' '}
                                            {new TokenAmount(DUSA_MAIN, vp)
                                              .multiply(
                                                BigInt(
                                                  Math.round((w || 0) * 10)
                                                )
                                              )
                                              .divide(1000n)
                                              .toSignificant(6)}{' '}
                                            veDUSA
                                          </span>
                                        </div>
                                        <button
                                          className='remove-vote-btn'
                                          onClick={() =>
                                            removeFromVote(lock, v.pool)
                                          }
                                          title='Remove this vote'
                                        >
                                          <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                      </div>

                                      <div className='weight-controls'>
                                        <span className='text-sm'>
                                          Allocate voting power to this pool:
                                        </span>
                                        <div className='flex items-center gap-2'>
                                          <div className='weight-input-wrapper'>
                                            <input
                                              type='number'
                                              className='weight-input'
                                              value={w}
                                              min='0'
                                              max='100'
                                              step='0.1'
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                // Allow empty input
                                                if (value === '') {
                                                  updateVoteWeight(
                                                    lock,
                                                    v.pool,
                                                    0
                                                  );
                                                  return;
                                                }
                                                // Only allow 1 decimal place
                                                const parsed =
                                                  parseFloat(value);
                                                if (!isNaN(parsed)) {
                                                  // Round to 1 decimal place
                                                  const rounded =
                                                    Math.round(parsed * 10) /
                                                    10;
                                                  updateVoteWeight(
                                                    lock,
                                                    v.pool,
                                                    rounded
                                                  );
                                                }
                                              }}
                                            />
                                            <span className='weight-unit'>
                                              %
                                            </span>
                                          </div>

                                          <div className='weight-presets'>
                                            {[25, 50, 75, 100].map((weight) => (
                                              <button
                                                key={weight}
                                                className={`preset-btn ${
                                                  w === weight ? 'active' : ''
                                                }`}
                                                onClick={() =>
                                                  updateVoteWeight(
                                                    lock,
                                                    v.pool,
                                                    weight
                                                  )
                                                }
                                              >
                                                {weight}%
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className='no-locks-message'>
                      <div className='no-locks-icon'>
                        <FontAwesomeIcon icon={faLock} />
                      </div>
                      <div className='no-locks-content'>
                        <h3>No Active Locks</h3>
                        <p className='no-locks-description'>
                          You need to have active DUSA locks to vote on pool
                          incentives.
                        </p>
                        <p className='no-locks-subdescription'>
                          Create a lock to participate in governance and earn
                          rewards.
                        </p>
                        <div className='no-locks-action'>
                          <Link to={routeNames.lock}>
                            <Button text='Create Lock' variant='contained' />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default VoteModal;
