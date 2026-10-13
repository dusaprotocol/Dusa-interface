import { createContext, useContext, useState, useMemo } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQueries, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router-dom';
import Button from 'components/Button';
import ConnectButton from 'components/ConnectButton';
import MetricsPanel, { TokenBreakdown } from 'components/MetricsPanel';
import PageHeader from 'components/PageHeader';
import SideModal from 'components/SideModal';
import VotingCard, { PoolTableData } from 'components/VotingCard';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAllPools from 'hooks/useFetchAllPools';
import { usePairAddresses } from 'hooks/useFetchData';
import { usePairsInformation } from 'hooks/useFetchData/pairInformation';
import { useTokenValues } from 'hooks/useFetchData/tokenValue';
import useFetchDatastore from 'hooks/useFetchDatastore';
import { routeNames } from 'routes';
import { voterSC } from 'utils/config';
import { epochs, lastEpoch } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchBribes,
  fetchLockVotingPower,
  fetchPairFeeParameters,
  fetchPoolWeight,
  fetchTotalVotingPower
} from 'utils/datastoreFetcher';
import { calculateAPR, roundTokenAmount, toFraction } from 'utils/methods';
import { poolsV2 } from 'utils/pools';
import { DUSA_MAIN, tokens } from 'utils/tokens';
import { queryKeys, trpc } from 'utils/trpc';
import { Lock, Token, Pool as _Pool } from 'utils/types';
import ClaimFeesModal from './components/ClaimFeesModal';
import Instructions from './components/Instructions';
import VoteModal from './components/VoteModal';
import './index.scss';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

dayjs.extend(relativeTime);

type Pool = _Pool & { pairAddress: string };

interface Vote {
  lock: Lock;
  pool: Pool;
  weight?: number;
}

interface IncentivizeContextProps {
  votes: Vote[];
  setVotes: React.Dispatch<React.SetStateAction<Vote[]>>;
  votingPowers: bigint[];
  pools: Pool[];
  poolAddressesReady: boolean;
  updateVoteWeight: (lock: Lock, pool: Pool, weight: number) => void;
  removeFromVote: (lock: Lock, pool: Pool) => void;
  addVotesForSelectedPools: (
    targetSelectedPools: Set<string>,
    targetLocks: Lock[],
    targetPools: Pool[]
  ) => void;
  protocolShares: number[];
}

export const IncentivizeContext = createContext<IncentivizeContextProps>({
  votes: [],
  setVotes: () => {
    /* Default empty function */
  },
  votingPowers: [],
  pools: [],
  poolAddressesReady: false,
  updateVoteWeight: () => {
    /* Default empty function */
  },
  removeFromVote: () => {
    /* Default empty function */
  },
  addVotesForSelectedPools: () => {
    /* Default empty function */
  },
  protocolShares: []
});

const PoolsGrid = ({
  data,
  locks,
  totalWeight,
  votes,
  selectedPools,
  onTogglePoolSelection,
  loading = false,
  feesLoading = false,
  incentivesLoading = false,
  rewardsLoading = false,
  aprLoading = false
}: {
  data?: PoolTableData[];
  locks: Lock[] | undefined;
  totalWeight: bigint;
  votes: Vote[];
  selectedPools: Set<string>;
  onTogglePoolSelection: (pool: any) => void;
  loading?: boolean;
  feesLoading?: boolean;
  incentivesLoading?: boolean;
  rewardsLoading?: boolean;
  aprLoading?: boolean;
}) => {
  if (loading) {
    // Show skeleton cards while loading
    return (
      <div className='pools-grid'>
        {Array.from({ length: 6 }, (_, index) => (
          <VotingCard
            key={`skeleton-${index}`}
            locks={locks}
            totalWeight={totalWeight}
            loading={true}
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const sortedData = [...data].sort((a, b) => {
    const afees = a.feesDetails.fees0Value + a.feesDetails.fees1Value;
    const bFees = b.feesDetails.fees0Value + b.feesDetails.fees1Value;

    return bFees - afees;
  });

  return (
    <div className='pools-grid'>
      {sortedData.map((poolData, _index) => {
        const votesAssociated = votes.filter(
          (v) => v.pool.pairAddress === poolData.pool.pairAddress
        );

        return (
          <VotingCard
            key={poolData.pool.pairAddress}
            data={{
              ...poolData,
              votes: votesAssociated
            }}
            locks={locks}
            totalWeight={totalWeight}
            onToggleSelection={onTogglePoolSelection}
            isSelected={selectedPools.has(poolData.pool.pairAddress)}
            feesLoading={feesLoading}
            incentivesLoading={incentivesLoading}
            rewardsLoading={rewardsLoading}
            aprLoading={aprLoading}
          />
        );
      })}
    </div>
  );
};

const Incentivize = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Fetch V2 pools dynamically
  const allPoolsV2Query = useFetchAllPools(false);
  const fetchedV2Pools = allPoolsV2Query.data || [];

  // Create deduplication set for hardcoded pools
  const v2Set = useMemo(
    () => new Set(poolsV2.map((p) => p.pairAddress.toLowerCase())),
    []
  );

  // Combine hardcoded + fetched V2 pools (deduplicated)
  const _pools = useMemo(
    () => [
      ...poolsV2, // Hardcoded V2 pools
      ...fetchedV2Pools.filter(
        // Fetched V2 pools, deduplicated
        (p) => !v2Set.has(p.pairAddress.toLowerCase())
      )
    ],
    [fetchedV2Pools, v2Set]
  );

  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedPools, setSelectedPools] = useState<Set<string>>(new Set());

  const pairAddressesResult = usePairAddresses(_pools);
  const { poolAddressesReady, validPools, hasValidPools } = pairAddressesResult;

  const pools: Pool[] = validPools.map((validPool) => ({
    ...validPool.pool,
    pairAddress: validPool.address,
    token0: validPool.pool.token0 as Token,
    token1: validPool.pool.token1 as Token
  }));

  const removeFromVote = (lock: Lock, pool: Pool) => {
    const newVotes = votes.filter(
      (v) => v.lock.id !== lock.id || v.pool.pairAddress !== pool.pairAddress
    );
    setVotes(newVotes);
  };

  const togglePoolSelection = (pool: Pool) => {
    const newSelectedPools = new Set(selectedPools);
    if (newSelectedPools.has(pool.pairAddress)) {
      newSelectedPools.delete(pool.pairAddress);
    } else {
      newSelectedPools.add(pool.pairAddress);
    }
    setSelectedPools(newSelectedPools);
  };

  const updateVoteWeight = (lock: Lock, pool: Pool, weight: number) => {
    const sumVotes = votes.reduce((acc, curr) => {
      if (
        curr.lock.id === lock.id &&
        curr.pool.pairAddress !== pool.pairAddress
      )
        return acc + (curr.weight || 0);
      return acc;
    }, 0);

    if (sumVotes + weight > 100) return;

    const newVotes = votes.map((v) => {
      if (v.lock.id === lock.id && v.pool.pairAddress === pool.pairAddress)
        v.weight = weight;
      return v;
    });
    setVotes(newVotes);
  };

  const addVotesForSelectedPools = (
    targetSelectedPools: Set<string>,
    targetLocks: Lock[],
    targetPools: Pool[]
  ) => {
    if (
      !targetSelectedPools.size ||
      !targetLocks.length ||
      !targetPools.length
    ) {
      return;
    }

    const selectedPoolAddresses = Array.from(targetSelectedPools);
    const newVotes: Vote[] = [];

    for (const poolAddress of selectedPoolAddresses) {
      const pool = targetPools.find((p) => p.pairAddress === poolAddress);

      if (!pool) {
        continue;
      }

      for (const lock of targetLocks) {
        const existingVote = votes.find(
          (v) =>
            v.lock.id === lock.id && v.pool.pairAddress === pool.pairAddress
        );

        if (!existingVote) {
          newVotes.push({
            lock,
            pool,
            weight: 0
          });
        }
      }
    }

    if (newVotes.length > 0) {
      setVotes((prev) => {
        const updatedVotes = [...prev, ...newVotes];

        return updatedVotes;
      });
    }
  };

  const tokenValues = useTokenValues();
  const veDusaValue =
    tokenValues[tokens.findIndex((t) => t.address === DUSA_MAIN.address)];

  // Get token values loading state
  const tokensParam = tokens.map((tkn) => ({
    tokenAddress: getWmasIfMas(tkn).address,
    tokenDecimals: tkn.decimals
  }));
  const tokenValuesBatchQuery = trpc.useQueries((t) =>
    tokensParam.map((tok) =>
      t.getTokenValue(tok, { enabled: !!tok.tokenAddress })
    )
  );
  const tokenValuesLoading = tokenValuesBatchQuery.some((q) => q.isLoading);

  const { locks: _locks, connected } = useContext(AccountWrapperContext);
  const locks = _locks?.filter(
    (lock) => lock.timestamp > Date.now() || lock.timestamp == 0
  );
  const lockIds = locks?.map((lock) => lock.id) || [];

  const votingPowerQueries = useQueries({
    queries: lockIds.map((lockId) => ({
      queryKey: ['votingPower', lockId],
      queryFn: () => fetchLockVotingPower(lockId),
      enabled: !!lockId
    }))
  });
  const votingPowers = votingPowerQueries.map((query) => query.data || 0n);

  const feeParametersQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: [queryKeys.feeParameters, pool.pairAddress],
      queryFn: () => fetchPairFeeParameters(pool.pairAddress),
      enabled: !!pool.pairAddress
    }))
  });
  const protocolShares = feeParametersQueries.map(
    (query) => query.data?.protocolShare || 0
  );

  const datastoreQuery = useFetchDatastore(voterSC);
  const datastoreKeys = datastoreQuery.data || [];

  const bribesQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['bribes', pool.pairAddress],
      queryFn: () => fetchBribes(pool.pairAddress, datastoreKeys),
      enabled: !!pool.pairAddress && datastoreKeys.length > 0
    }))
  });
  const bribes = bribesQueries.map((query) => query.data || []);

  const weightQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['weights', pool.pairAddress],
      queryFn: () => fetchPoolWeight(pool.pairAddress),
      enabled: !!pool.pairAddress
    }))
  });
  const weights = weightQueries.map((query) => query.data || 0n);
  const totalWeight = weights.reduce((acc, curr) => acc + curr, 0n);

  const feesQuery = trpc.getEpochFeesBatch.useQuery(
    {
      epoch: lastEpoch.id,
      poolAddresses: pools.map((pool) => pool.pairAddress)
    },
    { enabled: poolAddressesReady }
  );

  // Create a map from poolAddress to fees to handle missing entries
  const feesMap = useMemo(() => {
    const map = new Map<string, { amount0: string; amount1: string }>();
    (feesQuery.data || []).forEach((fee) => {
      map.set(fee.poolAddress, { amount0: fee.amount0, amount1: fee.amount1 });
    });
    return map;
  }, [feesQuery.data]);

  // Create fees array aligned with pools array
  const fees = useMemo(
    () =>
      pools.map(
        (pool) =>
          feesMap.get(pool.pairAddress) || { amount0: '0', amount1: '0' }
      ),
    [pools, feesMap]
  );

  const feesQueryLoading = feesQuery.isLoading;

  const isLoadingCriticalData =
    !hasValidPools ||
    allPoolsV2Query.isLoading ||
    tokenValuesLoading ||
    feeParametersQueries.some((q) => q.isLoading) ||
    bribesQueries.some((q) => q.isLoading) ||
    weightQueries.some((q) => q.isLoading) ||
    feesQueryLoading;

  const feesLoading =
    feesQueryLoading ||
    tokenValuesLoading ||
    feeParametersQueries.some((q) => q.isLoading);

  const incentivesLoading =
    bribesQueries.some((q) => q.isLoading) || tokenValuesLoading;

  const rewardsLoading = feesLoading || incentivesLoading;

  const aprLoading = isLoadingCriticalData;

  const totalIncentives = bribes.reduce(
    (acc, curr, _index) => {
      const poolBribes = curr;
      let bribesValue = 0;
      for (let i = 0; i < poolBribes.length; i++) {
        const bribe = poolBribes[i];
        const bribeTokenIndex = tokens.findIndex(
          (t) => t.address === bribe.token.address
        );
        const bribeTokenValue = tokenValues[bribeTokenIndex];
        const bribeValue = Number(
          new TokenAmount(bribe.token, bribe.amount)
            .multiply(toFraction(bribeTokenValue))
            .toFixed(bribe.token.decimals)
        );
        bribesValue += bribeValue;
      }
      return {
        amountUsd: acc.amountUsd + bribesValue,
        amount0: acc.amount0,
        amount1: acc.amount1
      };
    },
    { amountUsd: 0, amount0: 0n, amount1: 0n }
  );

  const totalVotingPowerQuery = useQuery(['totalVotingPower'], () =>
    fetchTotalVotingPower()
  );
  const totalVotingPower = totalVotingPowerQuery.data || 0n;

  // Calculate fees breakdown by token
  const feesBreakdown: TokenBreakdown[] = pools.reduce((acc, pool, index) => {
    const poolFees = fees[index];
    const fees0 = BigInt(poolFees?.amount0 || 0n);
    const fees1 = BigInt(poolFees?.amount1 || 0n);

    if (fees0 === 0n && fees1 === 0n) return acc;

    const token0Index = tokens.findIndex(
      (t) => t.address === pool.token0.address
    );
    const token1Index = tokens.findIndex(
      (t) => t.address === pool.token1.address
    );
    const token0Value = tokenValues[token0Index];
    const token1Value = tokenValues[token1Index];

    const calculateFeeValue = (is0: boolean, amount: bigint) => {
      const token = is0 ? pool.token0 : pool.token1;
      const tokenValue = is0 ? token0Value : token1Value;
      return Number(
        new TokenAmount(token, amount)
          .multiply(BigInt(protocolShares[index]))
          .divide(10000n)
          .multiply(toFraction(tokenValue))
          .toFixed(token.decimals)
      );
    };

    const fees0Value = calculateFeeValue(true, fees0);
    const fees1Value = calculateFeeValue(false, fees1);

    // Aggregate fees by token
    const token0Existing = acc.find(
      (item) => item.token.address === pool.token0.address
    );
    const token1Existing = acc.find(
      (item) => item.token.address === pool.token1.address
    );

    if (fees0 > 0n) {
      if (token0Existing) {
        token0Existing.amount +=
          (fees0 * BigInt(protocolShares[index])) / 10000n;
        token0Existing.value += fees0Value;
      } else {
        acc.push({
          token: pool.token0,
          amount: (fees0 * BigInt(protocolShares[index])) / 10000n,
          value: fees0Value
        });
      }
    }

    if (fees1 > 0n) {
      if (token1Existing) {
        token1Existing.amount +=
          (fees1 * BigInt(protocolShares[index])) / 10000n;
        token1Existing.value += fees1Value;
      } else {
        acc.push({
          token: pool.token1,
          amount: (fees1 * BigInt(protocolShares[index])) / 10000n,
          value: fees1Value
        });
      }
    }

    return acc;
  }, [] as TokenBreakdown[]);

  // Calculate total fees USD value
  const totalFeesUsd = feesBreakdown.reduce(
    (acc, breakdown) => acc + breakdown.value,
    0
  );

  // Calculate bribes breakdown by token
  const bribesBreakdown: TokenBreakdown[] = bribes.reduce<TokenBreakdown[]>(
    (acc, poolBribes) => {
      for (const bribe of poolBribes) {
        const existing = acc.find(
          (item) => item.token.address === bribe.token.address
        );
        const bribeTokenIndex = tokens.findIndex(
          (t) => t.address === bribe.token.address
        );
        const bribeTokenValue = tokenValues[bribeTokenIndex];
        const bribeValue = Number(
          new TokenAmount(bribe.token, bribe.amount)
            .multiply(toFraction(bribeTokenValue))
            .toFixed(bribe.token.decimals)
        );

        if (existing) {
          existing.amount += bribe.amount;
          existing.value += bribeValue;
        } else {
          acc.push({
            token: bribe.token,
            amount: bribe.amount,
            value: bribeValue
          });
        }
      }
      return acc;
    },
    [] as TokenBreakdown[]
  );

  const poolsData = pools.map((pool, index) => {
    const poolFees = fees[index];
    const fees0 = BigInt(poolFees?.amount0 || 0n);
    const fees1 = BigInt(poolFees?.amount1 || 0n);
    const token0Index = tokens.findIndex(
      (t) => t.address === pool.token0.address
    );
    const token1Index = tokens.findIndex(
      (t) => t.address === pool.token1.address
    );
    const token0Value = tokenValues[token0Index];
    const token1Value = tokenValues[token1Index];
    const v = (is0: boolean) =>
      Number(
        new TokenAmount(is0 ? pool.token0 : pool.token1, is0 ? fees0 : fees1)
          .multiply(BigInt(protocolShares[index]))
          .divide(10000n)
          .multiply(toFraction(is0 ? token0Value : token1Value))
          .toFixed((is0 ? pool.token0 : pool.token1).decimals)
      );
    const fees0Value = v(true);
    const fees1Value = v(false);
    const feesTotal = fees0Value + fees1Value;

    const poolBribes = bribes[index];
    const bribeValues: number[] = [];
    let bribesValue = 0;
    for (let i = 0; i < poolBribes.length; i++) {
      const bribe = poolBribes[i];
      const bribeTokenIndex = tokens.findIndex(
        (t) => t.address === bribe.token.address
      );
      const bribeTokenValue = tokenValues[bribeTokenIndex];
      const bribeValue = Number(
        new TokenAmount(bribe.token, bribe.amount)
          .multiply(toFraction(bribeTokenValue))
          .toFixed(bribe.token.decimals)
      );
      bribeValues.push(bribeValue);
      bribesValue += bribeValue;
    }

    const rewardsValue = feesTotal + bribesValue;

    const apr = calculateAPR(
      toFraction(rewardsValue / 7),
      veDusaValue * roundTokenAmount(DUSA_MAIN, weights[index])
    );

    return {
      pool,
      fees: feesTotal,
      incentives: bribesValue,
      totalRewards: rewardsValue,
      apr,
      votes: [],
      feesDetails: {
        fees0,
        fees1,
        fees0Value,
        fees1Value,
        token0: pool.token0,
        token1: pool.token1
      },
      incentivesDetails: {
        bribes: poolBribes,
        bribeValues
      },
      weight: weights[index]
    };
  });

  return (
    <>
      <IncentivizeContext.Provider
        value={{
          votes,
          setVotes,
          votingPowers,
          pools,
          poolAddressesReady,
          updateVoteWeight,
          removeFromVote,
          addVotesForSelectedPools,
          protocolShares
        }}
      >
        <div className='Incentivize'>
          <PageHeader
            title='Vote for Liquidity Incentives'
            description='Use your voting power to direct DUSA emissions to liquidity pools and earn rewards from fees and bribes.'
          ></PageHeader>
          <div className='flex gap-2'>
            <Button
              variant='contained'
              text='Lock $DUSA to vote'
              stretch={false}
            >
              <Link to={routeNames.createLock} />
            </Button>
            <Link
              className='flex items-center gap-2 bg-[var(--hover-bg)] hover:bg-[var(--secondary-color)] px-4 py-2 rounded-lg cursor-pointer'
              to={routeNames.incentivizedDashboard}
            >
              veDUSA dashboard
              <FontAwesomeIcon icon={faExternalLinkAlt} className='text-sm' />
            </Link>
            <Link
              className='flex items-center gap-2 bg-[var(--hover-bg)] hover:bg-[var(--secondary-color)] px-4 py-2 rounded-lg cursor-pointer'
              to={routeNames.leaderboard}
            >
              veDUSA leaderboard
              <FontAwesomeIcon icon={faExternalLinkAlt} className='text-sm' />
            </Link>
          </div>
          <div>
            <MetricsPanel
              totalVotingPower={totalVotingPower}
              totalFeesUsd={totalFeesUsd}
              totalIncentivesUsd={totalIncentives.amountUsd}
              feesBreakdown={feesBreakdown}
              bribesBreakdown={bribesBreakdown}
              loading={totalVotingPowerQuery.isLoading}
              totalFeesLoading={feesLoading}
              totalIncentivesLoading={incentivesLoading}
            />

            <div className='section-header'>
              <div className='flex flex-col justify-start gap-2'>
                <div className='flex items-center gap-2'>
                  <span className='section-title'>
                    Select Liquidity Pools for Voting
                  </span>
                  <FontAwesomeIcon
                    icon={faQuestionCircle}
                    onClick={() => {
                      setShowInstructions(!showInstructions);
                    }}
                    className='help-icon'
                  />
                  {showInstructions && (
                    <SideModal
                      isOpen={showInstructions}
                      setIsOpen={setShowInstructions}
                    >
                      <Instructions />
                    </SideModal>
                  )}
                </div>
                <span className='text-sm'>
                  Select multiple liquidity pools below if you want to split
                  your votes on several pools.
                </span>
              </div>

              {connected && (
                <div className='action-buttons'>
                  <Button
                    variant='contained'
                    text='Claim Fees'
                    className='whitespace-nowrap'
                    onClick={() => setShowClaimModal(true)}
                    disabled={false}
                  />
                  <Link to={routeNames.lock}>
                    <Button
                      variant='outlined'
                      text='Manage Locks'
                      className='whitespace-nowrap'
                    />
                  </Link>
                  <Link to={routeNames.bribes}>
                    <Button
                      variant='outlined'
                      text='Add Bribes'
                      className='whitespace-nowrap'
                    />
                  </Link>
                  {selectedPools.size > 0 && (
                    <Button
                      variant='contained'
                      text={`Manage Votes (${selectedPools.size} pools)`}
                      onClick={() => setShowVoteModal(true)}
                      className='whitespace-nowrap'
                    />
                  )}
                </div>
              )}
            </div>

            <PoolsGrid
              data={hasValidPools ? poolsData : undefined}
              locks={locks}
              totalWeight={totalWeight}
              votes={votes}
              selectedPools={selectedPools}
              onTogglePoolSelection={togglePoolSelection}
              loading={!hasValidPools}
              feesLoading={feesLoading}
              incentivesLoading={incentivesLoading}
              rewardsLoading={rewardsLoading}
              aprLoading={aprLoading}
            />
          </div>
        </div>
        {showVoteModal && (
          <VoteModal
            showModal={showVoteModal}
            setShowModal={setShowVoteModal}
            selectedPools={selectedPools}
          />
        )}
        {showClaimModal && (
          <ClaimFeesModal
            showModal={showClaimModal}
            setShowModal={setShowClaimModal}
            pools={pools}
          />
        )}
      </IncentivizeContext.Provider>
    </>
  );
};

export default Incentivize;
