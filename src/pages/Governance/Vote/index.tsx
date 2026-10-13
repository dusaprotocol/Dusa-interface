import { useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import Button from 'components/Button';
import PageHeader from 'components/PageHeader';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { fetchProposal } from 'datastore/governance';
import useFetchDatastore from 'hooks/useFetchDatastore';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { routeNames } from 'routes';
import { governanceSC } from 'utils/config';
import { HIDDEN_GOVERNANCE_PROPOSALS } from 'utils/constants';
import { argsDelimiter, fetchLocks } from 'utils/datastoreFetcher';
import { printBigintIsh } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import { buildVoteTx } from 'utils/transactionBuilder';
import './index.scss';

const Vote = () => {
  const { connected, connectedAddress } = useContext(AccountWrapperContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const proposalId = parseInt(id ?? '');

  // Redirect if proposal is hidden
  useEffect(() => {
    if (HIDDEN_GOVERNANCE_PROPOSALS.includes(proposalId)) {
      navigate(routeNames.governance, { replace: true });
    }
  }, [proposalId, navigate]);

  const {
    data: proposal,
    isLoading: loading,
    isFetching: isFetchingProposal,
    refetch: refetchProposal
  } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: () => fetchProposal(proposalId)
  });

  const governanceDatastoreQuery = useFetchDatastore(governanceSC);
  const datastoreKeys = governanceDatastoreQuery.data || [];

  const totalVotes = proposal
    ? proposal.forVotes + proposal.abstainVotes + proposal.againstVotes
    : 0n;

  const refetch = (shouldNavigateBack = false) => {
    // Refetch current proposal data
    refetchProposal();
    governanceDatastoreQuery.refetch();

    // Invalidate the proposals cache to refresh data on the main page
    queryClient.invalidateQueries(['proposals']);

    // Optionally navigate back to the main governance page
    if (shouldNavigateBack) {
      setTimeout(() => {
        navigate(routeNames.governance, {
          state: { fromVote: true },
          replace: true
        });
      }, 1000); // Small delay to show the vote was registered
    }
  };

  const locksQuery = useQuery(
    ['locks', connectedAddress],
    () => fetchLocks(connectedAddress),
    { enabled: connected }
  );
  const locks = locksQuery.data || [];
  const validLocks = locks.filter(
    (l) => l.timestamp === 0 || (proposal && l.timestamp > proposal.timestamp)
  );
  const lockIds = validLocks.map((lock) => lock.id);

  const voteKeys = datastoreKeys.filter((key) =>
    key.startsWith(`v::${proposalId}`)
  );

  const hasVotedPerLock: boolean[] = lockIds.map((lockId) =>
    voteKeys.includes(`v::${proposalId}${argsDelimiter}${lockId}`)
  );

  const availableLockIds = lockIds.filter(
    (_, index) => !hasVotedPerLock[index]
  );
  const hasAnyVoted = hasVotedPerLock.some((voted) => voted);
  const allVoted =
    hasVotedPerLock.length > 0 && hasVotedPerLock.every((voted) => voted);

  const { submitTx: voteForTx, pending: pendingVoteFor } = useSendTransaction({
    data: buildVoteTx(proposalId, 0, availableLockIds),
    onTxConfirmed: () => refetch()
  });

  const { submitTx: voteAgainstTx, pending: pendingVoteAgainst } =
    useSendTransaction({
      data: buildVoteTx(proposalId, 1, availableLockIds),
      onTxConfirmed: () => refetch()
    });

  const { submitTx: voteAbstainTx, pending: pendingVoteAbstain } =
    useSendTransaction({
      data: buildVoteTx(proposalId, 2, availableLockIds),
      onTxConfirmed: () => refetch()
    });

  // Extract voting powers directly from locks data (no separate queries needed)
  const votingPowers = validLocks.map((lock) => lock.votingPower);
  const totalVotingPower = votingPowers.reduce((a, b) => a + b, 0n);

  const availableVotingPower = votingPowers
    .filter((_, index) => !hasVotedPerLock[index])
    .reduce((a, b) => a + b, 0n);

  if (loading) return <Spinner />;
  return (
    <div className='Vote'>
      <PageHeader backTo='governance' />
      {!proposal ? (
        <div className='vote-container'>
          <div className='vote-content margin-vote'>
            Proposal data not detected
          </div>
        </div>
      ) : (
        <>
          <div className='vote-container'>
            <div className='vote-content margin-vote'>
              <div className='proposal-overview-container'>
                <span className='proposal-overview-title'>
                  Proposal overview
                </span>
                <div className='proposal-overview-content'>
                  <span className='proposal-title'>
                    {proposal.title} ({proposal.id})
                  </span>
                  <div className='proposal-status-container'>
                    <div className={clsx('proposal-status', proposal.status)}>
                      {proposal.status.toLocaleUpperCase()}
                    </div>
                    <span>
                      Ends on {new Date(proposal.timestamp).toString()}
                    </span>
                  </div>
                </div>
                <ReactMarkdown>{proposal.description}</ReactMarkdown>
              </div>
              <div className='vote-section'>
                <div className='your-vote'>
                  <span>Your voting infos</span>
                  <div className='voting-power'>
                    <span>Total voting power (veDUSA balance):</span>
                    <span>{printBigintIsh(DUSA_MAIN, totalVotingPower)}</span>
                  </div>
                  {availableVotingPower > 0n && (
                    <div className='voting-power'>
                      <span>Available voting power:</span>
                      <span>
                        {printBigintIsh(DUSA_MAIN, availableVotingPower)}
                      </span>
                    </div>
                  )}
                  {hasAnyVoted && (
                    <div className='voting-info'>
                      <span>
                        {allVoted
                          ? 'All your locks have voted on this proposal'
                          : `${hasVotedPerLock.filter(Boolean).length} of ${lockIds.length} locks have voted`}
                      </span>
                    </div>
                  )}
                  {allVoted ? (
                    <div className='already-voted'>
                      <span>You have already voted on this proposal</span>
                    </div>
                  ) : proposal.status === 'active' ? (
                    <div className='action-container'>
                      <Button
                        text='For'
                        variant='outlined'
                        onClick={voteForTx}
                        pending={pendingVoteFor}
                        disabled={availableVotingPower === 0n}
                        // needConnect
                      />
                      <Button
                        text='Abstain'
                        variant='outlined'
                        onClick={voteAbstainTx}
                        pending={pendingVoteAbstain}
                        disabled={availableVotingPower === 0n}
                        // needConnect
                      />
                      <Button
                        text='Against'
                        variant='outlined'
                        onClick={voteAgainstTx}
                        pending={pendingVoteAgainst}
                        disabled={availableVotingPower === 0n}
                        // needConnect
                      />
                    </div>
                  ) : (
                    <div className='already-voted'>
                      <span>The proposal voting session has ended</span>
                    </div>
                  )}

                  <div className='voting-results'>
                    <div className='voting-results-header'>
                      <span>Voting results</span>
                      {isFetchingProposal && !loading && (
                        <div className='refresh-indicator'>
                          <span className='refresh-dot'></span>
                          <span className='refresh-text'>Updating...</span>
                        </div>
                      )}
                    </div>
                    <div className='proposal-votes'>
                      {[
                        proposal.forVotes,
                        proposal.abstainVotes,
                        proposal.againstVotes
                      ].map((count, i) => {
                        const name =
                          i === 0 ? 'For' : i === 1 ? 'Abstain' : 'Against';
                        const percentage =
                          totalVotes === 0n
                            ? 0
                            : (Number(count) / Number(totalVotes)) * 100;
                        return (
                          <div className='vote' key={name + proposal.id}>
                            <div className='vote-details'>
                              <span>
                                {name} {printBigintIsh(DUSA_MAIN, count)}
                              </span>
                              <span>{percentage.toFixed(2)}%</span>
                            </div>
                            <div className='vote-bar'>
                              <div
                                className={clsx(
                                  'vote-bar-fill',
                                  name.toLowerCase()
                                )}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Vote;
