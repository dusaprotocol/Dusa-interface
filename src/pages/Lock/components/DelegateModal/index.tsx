import { useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import {
  faVoteYea,
  faSearch,
  faUser,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import Button from 'components/Button';
import { Warning } from 'components/Info';
import LockThumbnail from 'components/LockThumbnail';
import Modal, { ModalProps } from 'components/Modal';
import Spinner from 'components/Spinner';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { fetchLocks } from 'utils/datastoreFetcher';
import { isAddressValid, printAddress } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import { buildDelegateLockTx } from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';
import { Lock } from 'utils/types';
import './index.scss';

interface DelegateCardLocksProps {
  address: string;
  onDelegate: (delegateeLockId: number) => void;
  pendingDelegateeId: number | null;
  isPending: boolean;
}

const DelegateCardLocks = ({
  address,
  onDelegate,
  pendingDelegateeId,
  isPending
}: DelegateCardLocksProps) => {
  const locksQuery = useQuery(['locks', address], () => fetchLocks(address), {
    enabled: !!address,
    retry: 2,
    staleTime: 30000
  });

  const locks = locksQuery.data || [];
  const activeLocks = locks.filter(
    (l: Lock) => l.timestamp === 0 || l.timestamp > Date.now()
  );

  if (locksQuery.isLoading) {
    return (
      <div className='delegate-card-locks loading'>
        <Spinner />
        <span>Loading locks...</span>
      </div>
    );
  }

  if (!activeLocks.length) {
    return (
      <div className='delegate-card-locks empty'>
        <Warning text='No active locks found' />
      </div>
    );
  }

  return (
    <div className='delegate-card-locks'>
      {activeLocks.map((lockItem: Lock, i: number) => (
        <div key={i} className='delegate-lock-item'>
          <div className='lock-thumbnail'>
            <LockThumbnail lock={lockItem} />
          </div>
          <Button
            text='Delegate'
            variant='contained'
            onClick={() => onDelegate(lockItem.id)}
            pending={isPending && pendingDelegateeId === lockItem.id}
          />
        </div>
      ))}
    </div>
  );
};

interface DelegateModalProps extends ModalProps {
  lock: Lock;
}

const DelegateModal = ({
  showModal,
  setShowModal,
  lock
}: DelegateModalProps) => {
  const [delegateAddress, setDelegateAddress] = useState('');
  const [page, setPage] = useState(0);
  const [pendingDelegateeId, setPendingDelegateeId] = useState<number | null>(
    null
  );
  const [expandedDelegate, setExpandedDelegate] = useState<string | null>(null);
  const pageSize = 10;

  const delegatesQuery = trpc.getDelegatees.useQuery({
    take: pageSize,
    skip: page * pageSize
  });
  const delegates = delegatesQuery.data || [];

  const delegateSearchQuery = useQuery(
    ['locks', delegateAddress],
    () => fetchLocks(delegateAddress),
    {
      enabled: isAddressValid(delegateAddress),
      retry: 2,
      staleTime: 30000 // 30 seconds
    }
  );
  const delegateSearchResults = delegateSearchQuery.data || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDelegateAddress(value);
  };

  const delegate = useSendTransaction({});

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      title='Delegate Voting Power'
      variant='large'
      className='DelegateModal'
    >
      <div className='delegate-modal-header'>
        <div className='header-icon'>
          <FontAwesomeIcon icon={faVoteYea} />
        </div>
        <div className='header-content'>
          <h2>
            <span className='header-subtitle'>
              • Delegate your lock voting power to another address
            </span>
          </h2>
        </div>
      </div>

      <div className='delegate-modal-content'>
        <div className='delegate-section'>
          <div className='section-header'>
            <h3 className='section-title'>
              <FontAwesomeIcon icon={faSearch} className='section-icon' />
              Search Delegate
            </h3>
            <p className='section-description'>
              Enter any Massa address to delegate to
            </p>
          </div>
          <div className='search-input-wrapper'>
            <div className='search-icon'>
              <FontAwesomeIcon icon={faSearch} />
            </div>
            <input
              type='text'
              className='search-input'
              placeholder='Enter delegate address...'
              onChange={handleChange}
              value={delegateAddress}
            />
          </div>

          {delegateAddress ? (
            <div className='search-results'>
              {delegateSearchQuery.isLoading ? (
                <div className='loading-state'>
                  <Spinner />
                  <span>Searching for locks...</span>
                </div>
              ) : delegateSearchResults.length ? (
                <div className='results-list'>
                  <p className='results-header'>
                    Active locks for {printAddress(delegateAddress)}
                  </p>
                  {delegateSearchResults
                    .filter(
                      (l: Lock) => l.timestamp === 0 || l.timestamp > Date.now()
                    )
                    .map((result: Lock, i: number) => (
                      <div key={i} className='result-card'>
                        <div className='result-thumbnail'>
                          <LockThumbnail lock={result} />
                        </div>
                        <Button
                          text='Delegate'
                          variant='contained'
                          onClick={() => {
                            setPendingDelegateeId(result.id);
                            delegate.submitTx(
                              buildDelegateLockTx(
                                BigInt(lock?.id || 0),
                                BigInt(result.id)
                              )
                            );
                          }}
                          pending={
                            delegate.pending && pendingDelegateeId === result.id
                          }
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className='empty-state'>
                  <Warning
                    text={`No active locks found for ${printAddress(delegateAddress)}`}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className='delegate-divider'>
          <span className='divider-text'>or</span>
        </div>

        <div className='delegate-section'>
          <div className='section-header'>
            <h3 className='section-title'>
              <FontAwesomeIcon icon={faUser} className='section-icon' />
              Available Delegates
            </h3>
            <p className='section-description'>
              Choose from popular delegates with voting power
            </p>
          </div>
          <div className='delegates-list'>
            {delegatesQuery.isLoading ? (
              <div className='loading-state'>
                <Spinner />
                <span>Loading available delegates...</span>
              </div>
            ) : delegates.length ? (
              <>
                {delegates.map((delegatee, i) => {
                  const isExpanded = expandedDelegate === delegatee.address;
                  return (
                    <div
                      key={i}
                      className={`delegate-card ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div
                        className='delegate-header'
                        onClick={() =>
                          setExpandedDelegate(
                            isExpanded ? null : delegatee.address
                          )
                        }
                      >
                        <div className='delegate-info'>
                          <div className='delegate-address'>
                            {printAddress(delegatee.address)}
                          </div>
                          <div className='delegate-power'>
                            <span className='power-value'>
                              {new TokenAmount(
                                DUSA_MAIN,
                                delegatee.votingPower
                              ).toSignificant(4)}
                            </span>
                            <span className='power-label'>
                              veDUSA voting power
                            </span>
                          </div>
                        </div>
                        <FontAwesomeIcon
                          icon={faChevronDown}
                          className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}
                        />
                      </div>
                      {isExpanded && (
                        <DelegateCardLocks
                          address={delegatee.address}
                          onDelegate={(delegateeLockId) => {
                            setPendingDelegateeId(delegateeLockId);
                            delegate.submitTx(
                              buildDelegateLockTx(
                                BigInt(lock?.id || 0),
                                BigInt(delegateeLockId)
                              )
                            );
                          }}
                          pendingDelegateeId={pendingDelegateeId}
                          isPending={delegate.pending}
                        />
                      )}
                    </div>
                  );
                })}
                <div className='pagination-controls'>
                  <Button
                    text='Previous'
                    variant='outlined'
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    stretch={false}
                  />
                  <span className='page-info'>Page {page + 1}</span>
                  <Button
                    text='Next'
                    variant='outlined'
                    onClick={() => setPage((p) => p + 1)}
                    disabled={delegates.length < pageSize}
                    stretch={false}
                  />
                </div>
              </>
            ) : (
              <div className='empty-state'>
                <Warning text='No delegates found.' />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DelegateModal;
