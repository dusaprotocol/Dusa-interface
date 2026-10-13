import { useState, useMemo, useCallback, memo } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import {
  faChevronDown,
  faChevronUp,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery, useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import PageHeader from 'components/PageHeader';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import useFetchAllPools from 'hooks/useFetchAllPools';
import { usePairAddresses } from 'hooks/useFetchData';
import { useTokenValues } from 'hooks/useFetchData/tokenValue';
import { routeNames } from 'routes';
import { everyEpochs } from 'utils/constants';
import { getMasIfWmas, getWmasIfMas } from 'utils/coreMethods';
import {
  fetchAllUsersVotingPower,
  fetchLockVoteDetails,
  fetchLockVotingPower,
  fetchTotalVotingPower,
  fetchPairFeeParameters,
  getTokensFromPairAddress
} from 'utils/datastoreFetcher';
import {
  printBigintIsh,
  printAddress,
  printUSD,
  toFraction
} from 'utils/methods';
import { poolsV2 } from 'utils/pools';
import { DUSA_MAIN, tokens } from 'utils/tokens';
import { queryKeys, trpc } from 'utils/trpc';
import { Lock, Token } from 'utils/types';
import './index.scss';

dayjs.extend(relativeTime);

// Memoized user row component to prevent unnecessary re-renders
const UserRow = memo(
  ({
    user,
    index,
    isExpanded,
    isLoading,
    share,
    onUserClick,
    onAddressClick
  }: {
    user: { userAddress: string; totalVotingPower: bigint };
    index: number;
    isExpanded: boolean;
    isLoading: boolean;
    share: string;
    onUserClick: (address: string) => void;
    onAddressClick: (address: string) => void;
  }) => (
    <div
      className={`table-row ${isExpanded ? 'expanded' : ''}`}
      onClick={() => onUserClick(user.userAddress)}
    >
      <div className='col-rank'>
        {index === 0 && (
          <FontAwesomeIcon icon={faTrophy} className='trophy gold' />
        )}
        {index === 1 && (
          <FontAwesomeIcon icon={faTrophy} className='trophy silver' />
        )}
        {index === 2 && (
          <FontAwesomeIcon icon={faTrophy} className='trophy bronze' />
        )}
        <span className='rank-number'>#{index + 1}</span>
      </div>
      <div className='flex'>
        <div
          className='col-address clickable-address'
          data-allocation={printBigintIsh(DUSA_MAIN, user.totalVotingPower, 2)}
          data-share={share}
          onClick={(e) => {
            e.stopPropagation();
            onAddressClick(user.userAddress);
          }}
          title={`View portfolio for ${user.userAddress}`}
        >
          {printAddress(user.userAddress)}
        </div>
      </div>

      <div className='col-allocation'>
        <span className='allocation-value'>
          {printBigintIsh(DUSA_MAIN, user.totalVotingPower, 2)}
        </span>
      </div>
      <div className='col-share'>{share}%</div>
      <div className='col-expand'>
        {isLoading ? (
          <Spinner size={24} />
        ) : (
          <></>
          // <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
        )}
      </div>
    </div>
  )
);

UserRow.displayName = 'UserRow';

// Skeleton component for user rows
const UserRowSkeleton = memo(() => (
  <div className='table-row skeleton-row'>
    <div className='col-rank'>
      <div className='skeleton-circle' />
      <div className='skeleton-text skeleton-rank' />
    </div>
    <div className='flex'>
      <div className='col-address'>
        <div className='skeleton-text skeleton-address' />
      </div>
    </div>
    <div className='col-allocation'>
      <div className='skeleton-text skeleton-allocation' />
    </div>
    <div className='col-share'>
      <div className='skeleton-text skeleton-share' />
    </div>
    <div className='col-expand'>
      <div className='skeleton-circle skeleton-small' />
    </div>
  </div>
));

UserRowSkeleton.displayName = 'UserRowSkeleton';

// Skeleton for stats cards
const StatCardSkeleton = memo(() => (
  <div className='stat-card skeleton-card'>
    <div className='skeleton-text skeleton-title' />
    <div className='skeleton-text skeleton-value' />
  </div>
));

StatCardSkeleton.displayName = 'StatCardSkeleton';

// User details skeleton
const UserDetailsSkeleton = memo(() => (
  <div className='user-details'>
    <div className='details-header'>
      <div
        className='skeleton-text'
        style={{ width: '200px', height: '20px', marginBottom: '0.5rem' }}
      />
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div
          className='skeleton-text'
          style={{ width: '100px', height: '16px' }}
        />
        <div
          className='skeleton-text'
          style={{ width: '120px', height: '16px' }}
        />
      </div>
    </div>
    <div className='locks-grid'>
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className='lock-card'>
          <div className='lock-header'>
            <div
              className='skeleton-text'
              style={{ width: '80px', height: '16px' }}
            />
          </div>
          <div className='lock-info'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='info-row'>
                <div
                  className='skeleton-text'
                  style={{ width: '60px', height: '14px' }}
                />
                <div
                  className='skeleton-text'
                  style={{ width: '100px', height: '14px' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
));

UserDetailsSkeleton.displayName = 'UserDetailsSkeleton';

interface PoolVote {
  poolAddress: string;
  weight: bigint;
  token0?: Token;
  token1?: Token;
  binStep?: number;
}

interface LockDetails {
  lockId: number;
  amount: bigint;
  timestamp: number;
  permanent: boolean;
  votingPower: bigint;
  pools: PoolVote[];
  lastVoted: number;
}

interface UserDetails {
  userAddress: string;
  totalVotingPower: bigint;
  locks: Lock[];
  lockDetails: LockDetails[];
  totalPools: number;
}

const USERS_PER_PAGE = 25;

const Leaderboard = () => {
  const navigate = useNavigate();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [clickedUsers, setClickedUsers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  // Fetch V2 pools dynamically (same logic as Incentivize page)
  const allPoolsV2Query = useFetchAllPools(false);
  const fetchedV2Pools = allPoolsV2Query.data || [];

  // Create deduplication set for hardcoded pools
  const v2Set = new Set(poolsV2.map((p) => p.pairAddress.toLowerCase()));

  // Combine hardcoded + fetched V2 pools (deduplicated)
  const _pools = [
    ...poolsV2, // Hardcoded V2 pools
    ...fetchedV2Pools.filter(
      // Fetched V2 pools, deduplicated
      (p) => !v2Set.has(p.pairAddress.toLowerCase())
    )
  ];

  const { poolAddresses, poolAddressesReady } = usePairAddresses(_pools);

  // Memoize pools array to prevent recreating it on every render
  const pools = useMemo(
    () =>
      poolAddresses.map((address, i) => ({
        ..._pools[i],
        pairAddress: address
      })),
    [poolAddresses, _pools]
  );

  // Memoize end date to prevent new Date() from creating new references
  const endDate = useMemo(() => new Date().toString(), []);

  // Fetch protocol shares for each pool with optimized caching
  const feeParametersQuery = useQueries({
    queries: poolAddresses.map((address) => ({
      queryKey: [queryKeys.feeParameters, address],
      queryFn: () => fetchPairFeeParameters(address),
      enabled: !!address,
      staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
      cacheTime: 30 * 60 * 1000 // 30 minutes
    }))
  });
  const protocolShares = feeParametersQuery.map(
    (query) => query.data?.protocolShare || 0
  );
  const protocolSharesLoading = feeParametersQuery.some(
    (query) => query.isLoading
  );

  // Fetch all users with their voting power with optimized caching
  const { data: usersData, isLoading } = useQuery(
    ['allUsersVotingPower'],
    fetchAllUsersVotingPower,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000 // 10 minutes
    }
  );

  // Fetch total voting power with caching
  const { data: totalVotingPower } = useQuery(
    ['totalVotingPower'],
    fetchTotalVotingPower,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000 // 15 minutes
    }
  );

  // Memoize fees query parameters to prevent recreating queries
  const feesQueryParams = useMemo(
    () =>
      poolAddresses.map((poolAddress) => ({
        poolAddress,
        from: everyEpochs[0].from.toString(),
        to: endDate
      })),
    [poolAddresses, endDate]
  );

  // Fetch total cumulative fees from epoch 0 to current epoch with optimized caching
  const feesQuery = trpc.useQueries((t) =>
    feesQueryParams.map((params) =>
      t.getEpochFees(params, {
        enabled: !!params.poolAddress,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 15 * 60 * 1000, // 15 minutes

        retry: 2
      })
    )
  );

  const tokenValues = useTokenValues();

  // Get token values loading state (identical to Incentivize page)
  const tokensParam = tokens.map((tkn) => ({
    tokenAddress: getWmasIfMas(tkn).address,
    tokenDecimals: tkn.decimals
  }));
  const tokenValuesBatchQuery = trpc.useQueries((t) =>
    tokensParam.map((tok) =>
      t.getTokenValue(tok, {
        enabled: !!tok.tokenAddress,
        staleTime: 2 * 60 * 1000, // 2 minutes - prices change frequently
        cacheTime: 10 * 60 * 1000, // 10 minutes

        retry: 3
      })
    )
  );
  const tokenValuesLoading = tokenValuesBatchQuery.some((q) => q.isLoading);

  const fees = feesQuery.map((q) => q.data || []);

  // User details queries - persisted across page changes
  const userDetailsQueries = useQueries({
    queries: Array.from(clickedUsers).map((userAddress) => {
      const userData = usersData?.find((u) => u.userAddress === userAddress);
      const lockIds = userData?.locks.map((lock) => lock.id) || [];

      return {
        queryKey: ['userDetails', userAddress, lockIds],
        queryFn: async () => {
          if (!userData) return null;

          // Fetch voting power and vote details for each lock
          const [votingPowers, voteDetails] = await Promise.all([
            Promise.all(
              lockIds.map((id) => fetchLockVotingPower(id).catch(() => 0n))
            ),
            fetchLockVoteDetails(lockIds).catch(() => [])
          ]);

          // Fetch pool details for voted pools
          const poolAddresses = new Set<string>();
          voteDetails.forEach((detail) => {
            detail.pools.forEach((pool) => poolAddresses.add(pool));
          });

          const poolAddressArray = Array.from(poolAddresses);
          const poolDetailsPromises = poolAddressArray.map(async (address) => {
            try {
              const [tokens, feeParams] = await Promise.all([
                getTokensFromPairAddress(address).catch(() => null),
                fetchPairFeeParameters(address).catch(() => null)
              ]);
              return { address, tokens, binStep: feeParams?.binStep };
            } catch {
              return { address, tokens: null, binStep: undefined };
            }
          });

          const poolDetails = await Promise.all(poolDetailsPromises);
          const poolDetailsMap = new Map(
            poolDetails.map((p) => [p.address, p])
          );

          // Build lock details
          const lockDetails: LockDetails[] = userData.locks.map(
            (lock, index) => {
              const votingPower = votingPowers[index];
              const voteDetail = voteDetails.find((v) => v.lockId === lock.id);
              const pools: PoolVote[] = [];

              if (voteDetail) {
                voteDetail.pools.forEach((poolAddress) => {
                  const poolDetail = poolDetailsMap.get(poolAddress);
                  const weight = voteDetail.weights.get(poolAddress) || 0n;

                  pools.push({
                    poolAddress,
                    weight,
                    token0: poolDetail?.tokens?.[0],
                    token1: poolDetail?.tokens?.[1],
                    binStep: poolDetail?.binStep
                  });
                });
              }

              return {
                lockId: lock.id,
                amount: lock.amount,
                timestamp: lock.timestamp,
                permanent: lock.permanent,
                votingPower,
                pools,
                lastVoted: voteDetail?.lastVoted || 0
              };
            }
          );

          const uniquePoolsCount = new Set(
            lockDetails.flatMap((ld) => ld.pools.map((p) => p.poolAddress))
          ).size;

          return {
            userAddress: userData.userAddress,
            totalVotingPower: userData.totalVotingPower,
            locks: userData.locks,
            lockDetails,
            totalPools: uniquePoolsCount
          };
        },
        enabled: !!userData && lockIds.length > 0,
        staleTime: 3 * 60 * 1000, // 3 minutes
        cacheTime: 20 * 60 * 1000, // 20 minutes

        retry: 2
      };
    })
  });

  // Helper to get user details from queries
  const getUserDetails = (userAddress: string): UserDetails | null => {
    const query = userDetailsQueries.find(
      (q) => q.data?.userAddress === userAddress
    );
    return query?.data || null;
  };

  // Helper to check if user details are loading
  const isUserDetailsLoading = (userAddress: string): boolean => {
    if (!clickedUsers.has(userAddress)) return false;

    // Find the index of this user in the clickedUsers array to match with queries array
    const clickedUsersArray = Array.from(clickedUsers);
    const userIndex = clickedUsersArray.indexOf(userAddress);

    if (userIndex === -1 || userIndex >= userDetailsQueries.length)
      return false;

    return userDetailsQueries[userIndex]?.isLoading || false;
  };

  // Extract loading states to avoid reference changes in useMemo dependencies (identical to Incentivize page)
  const feesReady = feesQuery.every((q) => q.data !== undefined);

  // Critical data loading state (identical to Incentivize page)
  const isLoadingCriticalData =
    !poolAddressesReady ||
    allPoolsV2Query.isLoading ||
    tokenValuesLoading ||
    protocolSharesLoading ||
    feesQuery.some((q) => q.isLoading);

  // Memoize totalFees calculation to prevent recalculation on every render
  const totalFees = useMemo(() => {
    // Early return if critical data not ready
    if (isLoadingCriticalData || !feesReady) {
      return undefined;
    }

    return fees.reduce((acc, curr, index) => {
      try {
        const fees0 = curr.reduce(
          (a: bigint, c: any) => a + BigInt(c.fees0),
          0n
        );
        const fees1 = curr.reduce(
          (a: bigint, c: any) => a + BigInt(c.fees1),
          0n
        );
        const pool = pools[index];
        if (!pool) return acc;

        const { token0, token1 } = pool;
        const token0Index = tokens.findIndex(
          (t) => t.address === token0.address
        );
        const token1Index = tokens.findIndex(
          (t) => t.address === token1.address
        );
        const token0Value = tokenValues[token0Index];
        const token1Value = tokenValues[token1Index];

        // Skip if token values not available
        if (!token0Value || !token1Value) return acc;

        const v = (is0: boolean) =>
          Number(
            new TokenAmount(is0 ? token0 : token1, is0 ? fees0 : fees1)
              .multiply(BigInt(protocolShares[index] || 0))
              .divide(10000n)
              .multiply(toFraction(is0 ? token0Value : token1Value))
              .toFixed((is0 ? token0 : token1).decimals)
          );
        const fees0Value = v(true);
        const fees1Value = v(false);

        return acc + fees0Value + fees1Value;
      } catch (error) {
        console.warn(`Error calculating fees for pool ${index}:`, error);
        return acc;
      }
    }, 0);
  }, [
    fees,
    pools,
    tokenValues,
    protocolShares,
    isLoadingCriticalData,
    feesReady
  ]);

  const totalFeesLoading = isLoadingCriticalData;

  // Pagination logic
  const { paginatedUsers, hasMore } = useMemo(() => {
    if (!usersData) return { paginatedUsers: [], hasMore: false };

    const displayedUsers = showAll
      ? usersData
      : usersData.slice(0, currentPage * USERS_PER_PAGE);

    const totalPages = Math.ceil(usersData.length / USERS_PER_PAGE);
    const hasMore = currentPage < totalPages;

    return {
      paginatedUsers: displayedUsers,
      hasMore
    };
  }, [usersData, currentPage, showAll]);

  const loadMore = useCallback(() => {
    if (hasMore && !showAll) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore, showAll]);

  const showAllUsers = useCallback(() => {
    setShowAll(true);
  }, []);

  const handleUserClick = useCallback(
    (userAddress: string) => {
      // if (expandedUser === userAddress) {
      //   setExpandedUser(null);
      //   return;
      // }
      // setExpandedUser(userAddress);
      // // Add user to clicked users set to trigger query
      // if (!clickedUsers.has(userAddress)) {
      //   setClickedUsers((prev) => new Set(prev).add(userAddress));
      // }
    },
    [expandedUser, clickedUsers]
  );

  const handleAddressClick = useCallback(
    (userAddress: string) => {
      navigate(routeNames.portfolioUser.replace(':userAddress', userAddress));
    },
    [navigate]
  );

  const renderUserDetails = useCallback(
    (userAddress: string) => {
      const details = getUserDetails(userAddress);
      if (!details) return null;

      return (
        <div className='user-details'>
          <div className='details-header'>
            <h3>Lock Details for {printAddress(userAddress)}</h3>
            <div className='details-summary'>
              <span>Total Locks: {details.locks.length}</span>
              <span>Pools Voted: {details.totalPools}</span>
            </div>
          </div>

          <div className='locks-grid'>
            {details.lockDetails.map((lock) => {
              const totalWeight = lock.pools.reduce(
                (acc, pool) => acc + pool.weight,
                0n
              );
              return (
                <div key={lock.lockId} className='lock-card'>
                  <div className='lock-header'>
                    <h4>Lock #{lock.lockId}</h4>
                    {lock.permanent && (
                      <span className='permanent-badge'>Permanent</span>
                    )}
                  </div>

                  <div className='lock-info'>
                    <div className='info-row'>
                      <span className='label'>Amount:</span>
                      <span className='value'>
                        {printBigintIsh(DUSA_MAIN, lock.amount)} DUSA
                      </span>
                    </div>
                    <div className='info-row'>
                      <span className='label'>Voting Power:</span>
                      <span className='value accent'>
                        {printBigintIsh(DUSA_MAIN, lock.votingPower)}
                      </span>
                    </div>
                    {!lock.permanent && (
                      <div className='info-row'>
                        <span className='label'>Expires:</span>
                        <span className='value'>
                          {dayjs(lock.timestamp).format('MMM DD, YYYY')}
                        </span>
                      </div>
                    )}
                    {lock.lastVoted > 0 && (
                      <div className='info-row'>
                        <span className='label'>Last Voted:</span>
                        <span className='value'>
                          {dayjs(lock.lastVoted).fromNow()}
                        </span>
                      </div>
                    )}
                  </div>

                  {lock.pools.length > 0 && (
                    <div className='voted-pools'>
                      <h5>Voted Pools ({lock.pools.length})</h5>
                      <div className='pools-list'>
                        {lock.pools.map((pool) => {
                          const poolToken0 =
                            pool.token0 && getMasIfWmas(pool.token0);
                          const poolToken1 =
                            pool.token1 && getMasIfWmas(pool.token1);
                          const percentage =
                            lock.votingPower > 0n
                              ? (
                                  (Number(pool.weight) / Number(totalWeight)) *
                                  100
                                ).toFixed(2)
                              : '0';

                          return (
                            <div key={pool.poolAddress} className='pool-item'>
                              <div className='pool-tokens'>
                                {poolToken0 && poolToken1 ? (
                                  <>
                                    <div className='token-pair'>
                                      <img
                                        src={poolToken0.logoURI}
                                        alt={poolToken0.symbol}
                                      />
                                      <img
                                        src={poolToken1.logoURI}
                                        alt={poolToken1.symbol}
                                      />
                                      <span>
                                        {poolToken0.symbol} /{' '}
                                        {poolToken1.symbol}
                                      </span>
                                      {pool.binStep && (
                                        <span className='bin-step'>
                                          {pool.binStep} bps
                                        </span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <span className='unknown-pool'>
                                    {pool.poolAddress.slice(0, 8)}...
                                    {pool.poolAddress.slice(-6)}
                                  </span>
                                )}
                              </div>
                              <div className='pool-allocation'>
                                <span className='weight'>
                                  {printBigintIsh(DUSA_MAIN, pool.weight)}
                                </span>
                                <span className='percentage'>
                                  ({percentage}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [userDetailsQueries]
  );

  return (
    <div className='Leaderboard'>
      <PageHeader
        title='veDUSA Leaderboard'
        description='Top veDUSA holders and their voting allocations across the protocol'
        backTo='incentivize'
      />

      <div className='leaderboard-content'>
        <div className='leaderboard-stats'>
          {totalVotingPower !== undefined || !isLoading ? (
            <div className='stat-card primary'>
              <h3 className='mb-2'>Total veDUSA</h3>
              <p className='stat-value'>
                {totalVotingPower ? (
                  printBigintIsh(DUSA_MAIN, totalVotingPower)
                ) : (
                  <Spinner />
                )}
              </p>
            </div>
          ) : (
            <StatCardSkeleton />
          )}

          {usersData !== undefined || !isLoading ? (
            <div className='stat-card'>
              <h3 className='mb-2'>Total Holders</h3>
              <p className='stat-value'>
                {usersData?.length || (isLoading ? <Skeleton /> : 0)}
              </p>
            </div>
          ) : (
            <StatCardSkeleton />
          )}

          {totalFees !== undefined || !totalFeesLoading ? (
            <div className='stat-card'>
              <h3 className='mb-2'>Total Fees Generated</h3>
              <p className='stat-value'>
                {totalFees === undefined ? (
                  <Spinner />
                ) : (
                  '$' + printUSD(totalFees)
                )}
              </p>
              <p className='stat-subtitle'>Total since v2 launch</p>
              {totalFeesLoading && totalFees !== undefined && (
                <p
                  className='stat-subtitle'
                  style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}
                >
                  Updating...
                </p>
              )}
            </div>
          ) : (
            <StatCardSkeleton />
          )}
        </div>

        {isLoading ? (
          <div className='leaderboard-table'>
            <div className='table-header'>
              <div className='col-rank'>Rank</div>
              <div className='col-address'>
                <span className='desktop-header'>Address</span>
                <span className='mobile-header'>User Info</span>
              </div>
              <div className='col-allocation'>veDUSA Allocation</div>
              <div className='col-share'>Share</div>
              <div className='col-expand'></div>
            </div>
            <div className='table-body'>
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className='user-row-container'>
                  <UserRowSkeleton />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='leaderboard-table'>
            <div className='table-header'>
              <div className='col-rank'>Rank</div>
              <div className='col-address'>
                <span className='desktop-header'>Address</span>
                <span className='mobile-header'>User Info</span>
              </div>
              <div className='col-allocation'>veDUSA Allocation</div>
              <div className='col-share'>Share</div>
              <div className='col-expand'></div>
            </div>

            <div className='table-body'>
              {paginatedUsers?.map((user, index) => {
                const isExpanded = expandedUser === user.userAddress;
                const isLoading = isUserDetailsLoading(user.userAddress);
                const share = totalVotingPower
                  ? (
                      (Number(user.totalVotingPower) /
                        Number(totalVotingPower)) *
                      100
                    ).toFixed(2)
                  : '0';

                return (
                  <div key={user.userAddress} className='user-row-container'>
                    <UserRow
                      user={user}
                      index={index}
                      isExpanded={isExpanded}
                      isLoading={isLoading}
                      share={share}
                      onUserClick={handleUserClick}
                      onAddressClick={handleAddressClick}
                    />

                    {isExpanded &&
                      (isLoading ? (
                        <UserDetailsSkeleton />
                      ) : (
                        renderUserDetails(user.userAddress)
                      ))}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {usersData && usersData.length > USERS_PER_PAGE && (
              <div className='pagination-controls'>
                {showAll ? (
                  <div className='pagination-info'>
                    Showing all {usersData.length} users
                  </div>
                ) : (
                  <>
                    {hasMore ? (
                      <button className='load-more-btn' onClick={loadMore}>
                        Load More ({usersData.length - paginatedUsers.length}{' '}
                        remaining)
                      </button>
                    ) : (
                      <div className='pagination-info'>
                        Showing all {usersData.length} users
                      </div>
                    )}
                    {hasMore && (
                      <button className='show-all-btn' onClick={showAllUsers}>
                        Show All Users
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
