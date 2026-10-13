import { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { faSearch, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery, useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate, useParams } from 'react-router-dom';
import ConnectButton from 'components/ConnectButton';
import CopyIcon from 'components/CopyIcon';
import PageHeader from 'components/PageHeader';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useTokenValues } from 'hooks/useFetchData/tokenValue';
import useFetchDatastore from 'hooks/useFetchDatastore';
import ErrorPage from 'pages/ErrorPage';
import { routeNames } from 'routes';
import { voterSC } from 'utils/config';
import { lastEpoch } from 'utils/constants';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  getTokensFromPairAddress,
  fetchLocks,
  fetchTotalVotingPower,
  fetchLockVoteDetails,
  fetchPairFeeParameters,
  fetchBribes,
  fetchPoolWeight
} from 'utils/datastoreFetcher';
import {
  printBigintIsh,
  printAddress,
  isAddressValid,
  toFraction,
  printUSD
} from 'utils/methods';
import { DUSA_MAIN, tokens } from 'utils/tokens';
import { queryKeys, trpc } from 'utils/trpc';
import { Token } from 'utils/types';

dayjs.extend(relativeTime);

interface PoolRewards {
  fees0: bigint;
  fees1: bigint;
  fees0Value: number;
  fees1Value: number;
  feesTotal: number;
  bribesValue: number;
  totalRewards: number;
  userShare: number; // User's percentage share of the pool (0-100)
  estimatedUserRewards: number; // Estimated USD value of rewards for this user
}

interface PoolVote {
  poolAddress: string;
  weight: bigint;
  token0?: Token;
  token1?: Token;
  binStep?: number;
  rewards?: PoolRewards;
}

interface LockVotes {
  lockId: number;
  votingPower: bigint;
  lastVoted: number;
  pools: PoolVote[];
  totalWeight: bigint;
}

interface ActiveVotes {
  lockVotes: LockVotes[];
  totalVotingPower: bigint;
  totalPools: number;
}

interface PoolDetails {
  address: string;
  tokens: Token[] | null;
  binStep?: number;
}

const Votes = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [isInputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { userAddress } = useParams();
  const { connected, connectedAddress } = useContext(AccountWrapperContext);

  const address = userAddress || connectedAddress;
  const isSelf = !userAddress || userAddress === connectedAddress;

  // Fetch user's locks
  const locksQuery = useQuery(
    ['locks', address],
    () => fetchLocks(address || ''),
    { enabled: !!address }
  );

  // Extract voting power directly from locks data (no separate queries needed)
  const locks = locksQuery.data || [];
  const lockIds = locks.map((lock) => lock.id);

  // Fetch detailed vote information for locks
  const voteDetailsQuery = useQuery(
    ['voteDetails', lockIds],
    () => fetchLockVoteDetails(lockIds),
    { enabled: lockIds.length > 0 }
  );

  // Fetch total voting power
  const totalVotingPowerQuery = useQuery(
    ['totalVotingPower'],
    fetchTotalVotingPower
  );

  // Fetch pool details for voted pools
  const poolAddresses = useMemo(() => {
    if (!voteDetailsQuery.data) return [];
    const addresses = new Set<string>();
    voteDetailsQuery.data.forEach((detail) => {
      detail.pools.forEach((pool) => addresses.add(pool));
    });
    return Array.from(addresses);
  }, [voteDetailsQuery.data]);

  const binStepQueries = useQueries({
    queries:
      poolAddresses.map((poolAddress) => ({
        queryKey: [queryKeys.feeParameters, poolAddress],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        queryFn: () => fetchPairFeeParameters(poolAddress!),
        enabled: !!poolAddress
      })) || []
  });

  // const versionQueries = useQueries({
  //   queries:
  //     poolAddresses.map((poolAddress) => ({
  //       queryKey: ['poolVersion', poolAddress],
  //       queryFn:  () => fetchPairVersion(poolAddress),
  //       enabled: !!poolAddress
  //     })) || []
  // });

  const poolDetailsQueries = useQueries({
    queries: poolAddresses.map((address, i) => ({
      queryKey: ['poolDetails', address],
      queryFn: async (): Promise<PoolDetails> => {
        try {
          const tokens = await getTokensFromPairAddress(address);
          const binStep = binStepQueries[i].data?.binStep || 0;
          return { address, tokens, binStep };
        } catch (error) {
          console.error(`Failed to fetch pool details for ${address}:`, error);
          return { address, tokens: null, binStep: undefined };
        }
      },
      enabled: !!address,
      staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    }))
  });

  const poolDetailsMap = useMemo(() => {
    const map = new Map<string, PoolDetails>();
    poolDetailsQueries.forEach((query) => {
      if (query.data) {
        map.set(query.data.address, query.data);
      }
    });
    return map;
  }, [poolDetailsQueries]);

  // Fetch protocol shares for fee calculation
  const { data: datastoreKeys } = useFetchDatastore(voterSC);
  const protocolShareQueries = useQueries({
    queries: poolAddresses.map((poolAddress) => ({
      queryKey: [queryKeys.feeParameters, poolAddress],
      queryFn: () => fetchPairFeeParameters(poolAddress),
      enabled: !!poolAddress
    }))
  });
  const protocolShares = protocolShareQueries.map(
    (query) => query.data?.protocolShare || 2000
  );

  // Fetch bribes for pools
  const bribesQueries = useQueries({
    queries: poolAddresses.map((poolAddress) => ({
      queryKey: ['bribes', poolAddress],
      queryFn: () => fetchBribes(poolAddress, datastoreKeys),
      enabled: !!poolAddress && !!datastoreKeys?.length
    }))
  });
  const bribes = bribesQueries.map((query) => query.data || []);

  // Fetch pool weights
  const weightQueries = useQueries({
    queries: poolAddresses.map((poolAddress) => ({
      queryKey: ['weights', poolAddress],
      queryFn: () => fetchPoolWeight(poolAddress),
      enabled: !!poolAddress
    }))
  });
  const poolWeights = weightQueries.map((query) => query.data || 0n);

  // Fetch epoch fees for pools
  const feesQuery = trpc.getEpochFeesBatch.useQuery({
    epoch: lastEpoch.id,
    poolAddresses
  });
  const fees = feesQuery.data || [];

  const tokenValues: number[] = useTokenValues();
  const tokenValuesLoading = tokenValues.some((value) => value === undefined);

  // Process active voting data grouped by lock
  const activeVotesData = useMemo((): ActiveVotes => {
    if (!locks.length || !voteDetailsQuery.data) {
      return {
        lockVotes: [],
        totalVotingPower: 0n,
        totalPools: 0
      };
    }

    const votingPowers = locks.map((lock) => lock.votingPower);
    const voteDetails = voteDetailsQuery.data;
    const lockVotesArray: LockVotes[] = [];
    let totalVotingPower = 0n;
    const uniquePools = new Set<string>();

    // Process vote details for each lock
    voteDetails.forEach((lockVoteDetail, lockIndex) => {
      const { lockId, pools, weights, lastVoted } = lockVoteDetail;
      const votingPower = votingPowers[lockIndex] || 0n;

      if (pools.length > 0) {
        const poolVotes: PoolVote[] = [];
        let totalWeight = 0n;

        pools.forEach((poolAddress) => {
          uniquePools.add(poolAddress);
          const weight = weights.get(poolAddress) || 0n;
          totalWeight += weight;
          const poolDetails = poolDetailsMap.get(poolAddress);
          const poolIndex = poolAddresses.indexOf(poolAddress);

          // Calculate rewards for this pool
          let rewards: PoolRewards | undefined;
          if (
            poolIndex >= 0 &&
            fees[poolIndex] &&
            !tokenValuesLoading &&
            poolDetails?.tokens
          ) {
            const poolFees = fees[poolIndex];
            const fees0 = BigInt(poolFees.amount0);
            const fees1 = BigInt(poolFees.amount1);

            const token0 = poolDetails.tokens[0];
            const token1 = poolDetails.tokens[1];
            const token0Index = tokens.findIndex(
              (t) => t.address === token0.address
            );
            const token1Index = tokens.findIndex(
              (t) => t.address === token1.address
            );
            const token0Value = tokenValues[token0Index] || 0;
            const token1Value = tokenValues[token1Index] || 0;
            const _protocolShare = protocolShares[poolIndex];
            const protocolShare = isNaN(_protocolShare) ? 2000 : _protocolShare;

            const calculateFeeValue = (is0: boolean, feeAmount: bigint) =>
              Number(
                new TokenAmount(is0 ? token0 : token1, feeAmount)
                  .multiply(BigInt(protocolShare))
                  .divide(10000n)
                  .multiply(toFraction(is0 ? token0Value : token1Value))
                  .toFixed((is0 ? token0 : token1).decimals)
              );

            const fees0Value = calculateFeeValue(true, fees0);
            const fees1Value = calculateFeeValue(false, fees1);
            const feesTotal = fees0Value + fees1Value;

            // Calculate bribes value
            const poolBribes = bribes[poolIndex] || [];
            let bribesValue = 0;
            for (let i = 0; i < poolBribes.length; i++) {
              const bribe = poolBribes[i];
              const bribeTokenIndex = tokens.findIndex(
                (t) => t.address === bribe.token.address
              );
              const bribeTokenValue = tokenValues[bribeTokenIndex] || 0;
              const bribeValue = Number(
                new TokenAmount(bribe.token, bribe.amount)
                  .multiply(toFraction(bribeTokenValue))
                  .toFixed(bribe.token.decimals)
              );
              bribesValue += bribeValue;
            }

            const totalRewards = feesTotal + bribesValue;

            // Calculate user's share
            const poolWeight = poolWeights[poolIndex];
            const userShare =
              poolWeight > 0n ? (Number(weight) / Number(poolWeight)) * 100 : 0;
            const estimatedUserRewards = (totalRewards * userShare) / 100;

            rewards = {
              fees0,
              fees1,
              fees0Value,
              fees1Value,
              feesTotal,
              bribesValue,
              totalRewards,
              userShare,
              estimatedUserRewards
            };
          }

          poolVotes.push({
            poolAddress,
            weight,
            token0: poolDetails?.tokens?.[0],
            token1: poolDetails?.tokens?.[1],
            binStep: poolDetails?.binStep,
            rewards
          });
        });

        lockVotesArray.push({
          lockId,
          votingPower,
          lastVoted,
          pools: poolVotes,
          totalWeight
        });

        totalVotingPower += votingPower;
      }
    });

    return {
      lockVotes: lockVotesArray,
      totalVotingPower,
      totalPools: uniquePools.size
    };
  }, [
    locks,
    voteDetailsQuery.data,
    lockIds,
    poolDetailsMap,
    poolAddresses,
    fees,
    tokenValuesLoading,
    tokenValues,
    protocolShares,
    bribes,
    poolWeights
  ]);

  console.log({ activeVotesData });

  const userTotalVotingPower = useMemo(() => {
    return locks.reduce((sum, lock) => sum + lock.votingPower, 0n);
  }, [locks]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(
        routeNames.incentivizedDashboardUser.replace(
          ':userAddress',
          searchAddress
        )
      );
      setSearchAddress('');
    }
  };

  const handleKeysPress = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Detect if user is on Mac
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  useEffect(() => {
    document.addEventListener('keydown', handleKeysPress);

    return () => {
      document.removeEventListener('keydown', handleKeysPress);
    };
  }, []);

  if (userAddress && !isAddressValid(userAddress)) {
    return <ErrorPage />;
  }

  if (!address) {
    return (
      <div className='w-full min-h-screen'>
        <PageHeader
          backTo='incentivize'
          title='Active Votes'
          description='Your votes persist until you change them or reset. They automatically apply to upcoming epochs.'
        >
          <div
            className='relative flex items-center max-w-[700px]'
            onClick={() => inputRef.current?.focus()}
          >
            <FontAwesomeIcon
              icon={faSearch}
              className='absolute ml-3 opacity-50'
            />
            <input
              ref={inputRef}
              type='text'
              placeholder='Enter an address'
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={searchAddress}
              className='w-full px-9 py-3 bg-[var(--hover-bg)] border border-[var(--secondary-color-transp)] rounded-lg text-[0.85rem] focus:border-[var(--secondary-color)] focus:outline-none'
              style={{ caretColor: 'var(--secondary-color)' }}
            />
            {isInputFocused ? (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(
                    routeNames.incentivizedDashboardUser.replace(
                      ':userAddress',
                      searchAddress
                    )
                  );
                  setSearchAddress('');
                }}
                className='absolute right-0 mr-3 text-xs cursor-pointer'
              >
                Enter
              </span>
            ) : (
              <span
                onClick={() => inputRef.current?.focus()}
                className='absolute right-0 mr-3 opacity-50 text-xs cursor-pointer'
              >
                {isMac ? 'CMD + K' : 'CTRL + K'}
              </span>
            )}
          </div>
        </PageHeader>
        <div className='mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1400px]'>
          <div className='mx-auto p-12 border border-gray-800 rounded-xl max-w-2xl text-center'>
            <h2 className='mb-4 font-bold text-2xl'>Connect Your Wallet</h2>
            <p className='mb-6 text-gray-600 dark:text-gray-400 text-lg'>
              Connect your wallet to view your voting allocations or search for
              an address above.
            </p>
            <ConnectButton stretch={false} />
          </div>
        </div>
      </div>
    );
  }

  if (locksQuery.isLoading || voteDetailsQuery.isLoading) {
    return (
      <div className='w-full min-h-screen'>
        <PageHeader
          backTo='incentivize'
          title={isSelf ? 'Your Active Votes' : 'Active Votes'}
          description='Your votes persist until you change them or reset. They automatically apply to upcoming epochs.'
        >
          <div
            className='relative flex items-center max-w-[700px]'
            onClick={() => inputRef.current?.focus()}
          >
            <FontAwesomeIcon
              icon={faSearch}
              className='absolute ml-3 opacity-50'
            />
            <input
              ref={inputRef}
              type='text'
              placeholder='Enter an address'
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={searchAddress}
              className='w-full px-9 py-3 bg-[var(--hover-bg)] border border-[var(--secondary-color-transp)] rounded-lg text-[0.85rem] focus:border-[var(--secondary-color)] focus:outline-none'
              style={{ caretColor: 'var(--secondary-color)' }}
            />
            {isInputFocused ? (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(
                    routeNames.incentivizedDashboardUser.replace(
                      ':userAddress',
                      searchAddress
                    )
                  );
                  setSearchAddress('');
                }}
                className='absolute right-0 mr-3 text-xs cursor-pointer'
              >
                Enter
              </span>
            ) : (
              <span
                onClick={() => inputRef.current?.focus()}
                className='absolute right-0 mr-3 opacity-50 text-xs cursor-pointer'
              >
                {isMac ? 'CMD + K' : 'CTRL + K'}
              </span>
            )}
          </div>
          {userAddress && isAddressValid(userAddress) && (
            <div className='flex items-center gap-2 bg-[var(--hover-bg)] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg'>
              <div>{printAddress(userAddress)}</div>
              <CopyIcon text={userAddress} />
              <FontAwesomeIcon
                icon={faX}
                onClick={() => navigate(routeNames.incentivizedDashboard)}
                className='cursor-pointer hover:text-red-500'
              />
            </div>
          )}
        </PageHeader>
        <div className='flex justify-center items-center py-20'>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen'>
      <PageHeader
        backTo='incentivize'
        title={isSelf ? 'Your Active Votes' : 'Active Votes'}
        description='Your votes persist until you change them or reset. They automatically apply to upcoming epochs.'
      >
        <div
          className='relative flex items-center max-w-[700px]'
          onClick={() => inputRef.current?.focus()}
        >
          <FontAwesomeIcon
            icon={faSearch}
            className='absolute ml-3 opacity-50'
          />
          <input
            ref={inputRef}
            type='text'
            placeholder='Enter an address'
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            value={searchAddress}
            className='w-full px-9 py-3 bg-[var(--hover-bg)] border border-[var(--secondary-color-transp)] rounded-lg text-[0.85rem] focus:border-[var(--secondary-color)] focus:outline-none'
            style={{ caretColor: 'var(--secondary-color)' }}
          />
          {isInputFocused ? (
            <span
              onMouseDown={(e) => {
                e.preventDefault();
                navigate(
                  routeNames.incentivizedDashboardUser.replace(
                    ':userAddress',
                    searchAddress
                  )
                );
                setSearchAddress('');
              }}
              className='absolute right-0 mr-3 text-xs cursor-pointer'
            >
              Enter
            </span>
          ) : (
            <span
              onClick={() => inputRef.current?.focus()}
              className='absolute right-0 mr-3 opacity-50 text-xs cursor-pointer'
            >
              CTRL + K
            </span>
          )}
        </div>
        {userAddress && isAddressValid(userAddress) && (
          <div className='flex items-center gap-2 bg-[var(--hover-bg)] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg'>
            <div>{printAddress(userAddress)}</div>
            <CopyIcon text={userAddress} />
            <FontAwesomeIcon
              icon={faX}
              onClick={() => navigate(routeNames.incentivizedDashboard)}
              className='cursor-pointer hover:text-red-500'
            />
          </div>
        )}
      </PageHeader>
      <div className='mx-auto px-4 py-8 w-full max-w-[1400px]'>
        <div className='space-y-6'>
          <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
            <div className='bg-[var(--card-background)] p-6 border border-gray-200 dark:border-gray-700 rounded-xl'>
              <h3 className='mb-4 font-semibold text-gray-900 dark:text-white text-lg'>
                {isSelf ? 'Your' : 'Total'} Voting Power
              </h3>
              <div className='flex items-baseline gap-2 mb-2'>
                <span className='font-bold text-blue-600 dark:text-blue-400 text-3xl'>
                  {printBigintIsh(DUSA_MAIN, userTotalVotingPower)}
                </span>
                <span className='text-gray-600 dark:text-gray-400'>veDUSA</span>
              </div>
              {totalVotingPowerQuery.data && userTotalVotingPower > 0n ? (
                <div className='text-gray-600 dark:text-gray-400 text-sm'>
                  {(
                    (Number(userTotalVotingPower) /
                      Number(totalVotingPowerQuery.data)) *
                    100
                  ).toFixed(4)}
                  % of total
                </div>
              ) : null}
            </div>

            <div className='bg-[var(--card-background)] p-6 border border-gray-200 dark:border-gray-700 rounded-xl'>
              <h3 className='mb-4 font-semibold text-gray-900 dark:text-white text-lg'>
                Voting Summary
              </h3>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Active Locks:
                  </span>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {activeVotesData.lockVotes.length}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Pools Voted:
                  </span>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {activeVotesData.totalPools}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Estimated Rewards Summary */}
          {activeVotesData.lockVotes.some((lock) =>
            lock.pools.some((pool) => pool.rewards)
          ) && (
            <div className='bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 p-6 border border-green-200 dark:border-green-800 rounded-xl'>
              <h3 className='mb-4 font-semibold text-gray-900 dark:text-white text-lg'>
                Estimated Rewards (Current Epoch)
              </h3>
              <div className='flex items-baseline gap-2 mb-2'>
                <span className='font-bold text-green-600 dark:text-green-400 text-3xl'>
                  $
                  {printUSD(
                    activeVotesData.lockVotes.reduce(
                      (total, lock) =>
                        total +
                        lock.pools.reduce(
                          (poolTotal, pool) =>
                            poolTotal +
                            (pool.rewards?.estimatedUserRewards || 0),
                          0
                        ),
                      0
                    )
                  )}
                </span>
              </div>
              <div className='text-gray-600 dark:text-gray-400 text-sm'>
                Total estimated rewards from fees and bribes for the current
                epoch
              </div>
              <div className='mt-3 pt-3 border-t border-green-200 dark:border-green-700'>
                <div className='gap-4 grid grid-cols-2'>
                  <div>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      From Fees
                    </div>
                    <div className='font-semibold text-gray-900 dark:text-white'>
                      $
                      {printUSD(
                        activeVotesData.lockVotes.reduce(
                          (total, lock) =>
                            total +
                            lock.pools.reduce(
                              (poolTotal, pool) =>
                                poolTotal +
                                (pool.rewards
                                  ? (pool.rewards.feesTotal *
                                      pool.rewards.userShare) /
                                    100
                                  : 0),
                              0
                            ),
                          0
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      From Bribes
                    </div>
                    <div className='font-semibold text-gray-900 dark:text-white'>
                      $
                      {printUSD(
                        activeVotesData.lockVotes.reduce(
                          (total, lock) =>
                            total +
                            lock.pools.reduce(
                              (poolTotal, pool) =>
                                poolTotal +
                                (pool.rewards
                                  ? (pool.rewards.bribesValue *
                                      pool.rewards.userShare) /
                                    100
                                  : 0),
                              0
                            ),
                          0
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className='mb-6 font-bold text-gray-900 dark:text-white text-2xl'>
              Voting Allocations by Lock
            </h2>
            {activeVotesData.lockVotes.length === 0 ? (
              <div className='bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 rounded-xl text-center'>
                <p className='text-gray-600 dark:text-gray-400 text-lg'>
                  {isSelf
                    ? 'You have no active votes. Vote for pools to direct rewards and participate in governance.'
                    : 'This address has no active votes.'}
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {activeVotesData.lockVotes.map((lockVote) => {
                  const totalWeight = lockVote.pools.reduce(
                    (sum, pool) => sum + pool.weight,
                    0n
                  );
                  return (
                    <div
                      key={lockVote.lockId}
                      className='bg-[var(--card-background)] p-6 border border-gray-200 dark:border-gray-700 rounded-xl'
                    >
                      <div className='flex sm:flex-row flex-col sm:justify-between sm:items-start mb-4'>
                        <div>
                          <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>
                            Lock #{lockVote.lockId}
                          </h3>
                          <div className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                            Voting Power:{' '}
                            {printBigintIsh(DUSA_MAIN, lockVote.votingPower)}{' '}
                            veDUSA
                          </div>
                        </div>
                        {lockVote.lastVoted > 0 && (
                          <div className='mt-2 sm:mt-0 text-gray-500 dark:text-gray-400 text-xs italic'>
                            Last updated: {dayjs(lockVote.lastVoted).fromNow()}
                          </div>
                        )}
                      </div>

                      <div className='pt-4 border-gray-200 dark:border-gray-700 border-t'>
                        <div className='mb-3 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                          Pool Allocations ({lockVote.pools.length}{' '}
                          {lockVote.pools.length === 1 ? 'pool' : 'pools'})
                        </div>
                        <div className='space-y-2'>
                          {lockVote.pools.map((pool) => {
                            const t0 = pool.token0 && getMasIfWmas(pool.token0);
                            const t1 = pool.token1 && getMasIfWmas(pool.token1);

                            const lockPerc =
                              (Number(pool.weight) / Number(totalWeight)) * 100;

                            return (
                              <div
                                key={pool.poolAddress}
                                className='flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2 p-3 rounded-lg'
                              >
                                <div className='flex items-center gap-3'>
                                  {t0 && t1 && (
                                    <div className='flex items-center -space-x-1'>
                                      <img
                                        src={t0.logoURI}
                                        alt={t0.symbol}
                                        className='border border-white dark:border-gray-700 rounded-full w-6 h-6'
                                      />
                                      <img
                                        src={t1.logoURI}
                                        alt={t1.symbol}
                                        className='border border-white dark:border-gray-700 rounded-full w-6 h-6'
                                      />
                                    </div>
                                  )}
                                  <div className='font-medium text-gray-900 dark:text-white'>
                                    {t0 && t1 ? (
                                      <>
                                        {t0.symbol} / {t1.symbol}{' '}
                                        {pool.binStep ? (
                                          <span className='bg-[var(--secondary-color)] ml-3 px-2 py-0.5 rounded-md font-mono text-[var(--primary-color)] text-xs 0.1)]'>
                                            {pool.binStep} bps
                                          </span>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className='font-mono text-sm'>
                                        {pool.poolAddress.slice(0, 8)}...
                                        {pool.poolAddress.slice(-6)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className='flex flex-col items-end gap-1'>
                                  <div className='flex items-center gap-2'>
                                    <span className='text-gray-600 dark:text-gray-400 text-sm'>
                                      Allocation:
                                    </span>
                                    <span className='font-semibold text-blue-600 dark:text-blue-400'>
                                      {printBigintIsh(DUSA_MAIN, pool.weight)}{' '}
                                      veDUSA
                                    </span>
                                  </div>
                                  {lockVote.votingPower > 0n && (
                                    <span className='text-gray-500 dark:text-gray-400 text-xs'>
                                      (
                                      {lockPerc.toFixed(
                                        lockPerc === 100 ? 0 : 2
                                      )}
                                      % of lock)
                                    </span>
                                  )}
                                  {pool.rewards && (
                                    <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-600'>
                                      <div className='text-xs text-gray-500 dark:text-gray-400'>
                                        Est. Rewards: $
                                        {printUSD(
                                          pool.rewards.estimatedUserRewards
                                        )}
                                      </div>
                                      <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                                        {pool.rewards.userShare.toFixed(1)}%
                                        share of pool
                                      </div>
                                      <div className='mt-1 text-xs text-gray-600 dark:text-gray-400'>
                                        Fees: $
                                        {printUSD(pool.rewards.feesTotal)} |
                                        Bribes: $
                                        {printUSD(pool.rewards.bribesValue)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {lockVote.totalWeight > 0n && (
                          <div className='mt-3 pt-3 border-gray-200 dark:border-gray-700 border-t'>
                            <div className='flex justify-between items-center'>
                              <span className='font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                Total Allocated:
                              </span>
                              <span className='font-semibold text-gray-900 dark:text-white'>
                                {printBigintIsh(
                                  DUSA_MAIN,
                                  lockVote.totalWeight
                                )}{' '}
                                veDUSA
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isSelf && (
                  <div className='bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 p-5 border border-blue-200 dark:border-blue-800 rounded-xl'>
                    <p className='text-gray-700 dark:text-gray-300'>
                      <span className='font-semibold text-blue-600 dark:text-blue-400'>
                        Note:
                      </span>{' '}
                      Your votes will continue to apply automatically to each
                      new epoch until you update them.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Votes;
