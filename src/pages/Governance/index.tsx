import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link, useLocation } from 'react-router-dom';
import Button from 'components/Button';
import PageHeader from 'components/PageHeader';
import { fetchProposalsWithCount } from 'datastore/governance';
import ErrorPage from 'pages/ErrorPage';
import { routeNames } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { HIDDEN_GOVERNANCE_PROPOSALS } from 'utils/constants';
import { printBigintIsh } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
dayjs.extend(relativeTime);
import './index.scss';

const ProposalSkeleton = () => (
  <div className='proposal-skeleton'>
    <div className='skeleton-infos'>
      <div className='skeleton-top'>
        <div className='skeleton skeleton-id'></div>
        <div className='skeleton skeleton-status'></div>
        <div className='skeleton skeleton-time'></div>
      </div>
      <div className='skeleton skeleton-title'></div>
    </div>
    <div className='skeleton-votes'>
      {['For', 'Abstain', 'Against'].map((vote, index) => (
        <div key={index} className='skeleton-vote'>
          <div className='skeleton-vote-details'>
            <div className='skeleton skeleton-vote-name'></div>
            <div className='skeleton skeleton-vote-percentage'></div>
          </div>
          <div className='skeleton skeleton-vote-bar'></div>
        </div>
      ))}
    </div>
  </div>
);

const Governance = () => {
  const location = useLocation();

  const {
    data: proposals,
    isLoading,
    isFetching,
    refetch: refetchProposals
  } = useQuery(['proposals-with-count'], fetchProposalsWithCount, {
    enabled: FEATURE_FLAGS.GOVERNANCE,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000 // 5 minutes
  });

  // Refresh proposals when coming back from vote page
  useEffect(() => {
    if (location.state?.fromVote) {
      refetchProposals();
      // Clear the state to prevent unnecessary refetches
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetchProposals]);

  // Memoize processed proposal data to avoid recalculations
  const processedProposals = useMemo(() => {
    if (!proposals) return [];

    return proposals
      .filter((proposal) => !HIDDEN_GOVERNANCE_PROPOSALS.includes(proposal.id))
      .map((proposal) => {
        const outOfDate = proposal.timestamp < Date.now();
        const totalVotes =
          proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

        const voteData = [
          { name: 'For', votes: proposal.forVotes },
          { name: 'Abstain', votes: proposal.abstainVotes },
          { name: 'Against', votes: proposal.againstVotes }
        ].map((vote) => {
          const percentage =
            totalVotes === 0n
              ? 0
              : (Number(vote.votes) / Number(totalVotes)) * 100;

          return {
            ...vote,
            percentage,
            formattedVotes: printBigintIsh(DUSA_MAIN, vote.votes),
            formattedPercentage: percentage.toFixed(2) + '%'
          };
        });

        return {
          ...proposal,
          outOfDate,
          totalVotes,
          voteData
        };
      });
  }, [proposals]);

  if (!FEATURE_FLAGS.GOVERNANCE) return <ErrorPage />;

  return (
    <div className='Governance'>
      <PageHeader
        title='Governance'
        description='Vote on proposals to directly get involved in Dusa protocol.'
      ></PageHeader>
      <div className='governance-container'>
        <div className='flex justify-center gap-4 mt-4'>
          <Link to={routeNames.createLock}>
            <Button variant='contained' text='Lock $DUSA to Vote' />
          </Link>
          <Link to={routeNames.createProposal}>
            <Button variant='outlined' text='Create Proposal' />
          </Link>
        </div>
        <div className='governance-content margin-governance'>
          <div className='proposals-container'>
            <div className='proposals-title'>
              <span>Proposals</span>
              {isFetching && !isLoading && (
                <div className='refresh-indicator'>
                  <span className='refresh-dot'></span>
                  <span className='refresh-text'>Updating...</span>
                </div>
              )}
            </div>
            {isLoading && (
              <div className='proposals-list'>
                {Array.from({ length: 2 }, (_, index) => (
                  <ProposalSkeleton key={index} />
                ))}
              </div>
            )}
            {!isLoading && processedProposals.length === 0 && (
              <div className='no-proposals'>No proposals found</div>
            )}
            {!isLoading && (
              <div className='proposals-list'>
                {processedProposals.map((proposal) => (
                  <Link
                    className='proposal'
                    to={`${routeNames.vote.replace(':id', proposal.id.toString())}`}
                    key={proposal.id}
                  >
                    <div className='proposal-infos'>
                      <div className='proposal-infos-top'>
                        <span>{proposal.id}:</span>
                        <div
                          className={clsx('proposal-status', proposal.status)}
                        >
                          {proposal.status.toLocaleUpperCase()}
                        </div>
                        <span>
                          {proposal.outOfDate ? 'Ended' : 'Ends'}{' '}
                          {dayjs(proposal.timestamp).fromNow()}
                        </span>
                      </div>
                      <span className='proposal-infos-title'>
                        {proposal.title}
                      </span>
                    </div>
                    <div className='proposal-votes'>
                      {proposal.voteData.map((vote) => (
                        <div className='vote' key={vote.name + proposal.id}>
                          <div className='vote-details'>
                            <span>
                              {vote.name} {vote.formattedVotes}
                            </span>
                            <span>{vote.formattedPercentage}</span>
                          </div>
                          <div className='vote-bar'>
                            <div
                              className={clsx(
                                'vote-bar-fill',
                                vote.name.toLowerCase()
                              )}
                              style={{ width: `${vote.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Governance;
