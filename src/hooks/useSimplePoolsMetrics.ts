// hooks/useSimplePoolsMetrics.ts
import { useMemo } from 'react';
import { LBPairReservesAndId, TokenAmount } from '@dusalabs/sdk';
import { useQueries } from '@tanstack/react-query';
import { FEATURE_FLAGS } from 'utils/config';
import { currentEpoch } from 'utils/constants';
import { fetchDepth } from 'utils/datastoreFetcher';
import {
  binStepToDepth,
  calculateAPR,
  calculateRewardAPR,
  calculateTVL,
  isInDusaSeason,
  toFraction
} from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import { trpc } from 'utils/trpc';
import { Pool, Token } from 'utils/types';
import { usePairsInformation } from './useFetchData/pairInformation';
import { useTokenValues } from './useFetchData/tokenValue';

export interface SimplePoolMetrics {
  poolAddress: string;
  version: 'V1' | 'V2';
  volume24h: number;
  fees24h: number;
  liquidity: number;
  apr: number;
  baseAPR: number;
  rewardsAPR: number;
  airdropAPR: number;
  hasRewards: boolean;
  isLoading: boolean;
  hasError: boolean;
  loading: {
    volume24h: boolean;
    fees24h: boolean;
    liquidity: boolean;
    apr: boolean;
  };
  errors: {
    volume24h: boolean;
    fees24h: boolean;
    liquidity: boolean;
    apr: boolean;
  };
}

export interface UseSimplePoolsMetricsResult {
  poolsMetrics: SimplePoolMetrics[];
  isLoading: boolean;
  hasErrors: boolean;
}

const useSimplePoolsMetrics = (pools: Pool[]): UseSimplePoolsMetricsResult => {
  const utils = trpc.useUtils();

  const poolAddresses = useMemo(() => pools.map((p) => p.pairAddress), [pools]);

  const queries24H = useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['get24H', pool.pairAddress.toLowerCase()],
      queryFn: () => utils.get24H.fetch(pool.pairAddress),
      enabled: !!pool.pairAddress
    }))
  });

  const data24hByAddress = useMemo(() => {
    const m = new Map<string, { volume: number; fees: number }>();
    pools.forEach((pool, i) => {
      const d = queries24H[i]?.data;
      m.set(pool.pairAddress.toLowerCase(), {
        volume: Number(d?.volume ?? 0),
        fees: Number(d?.fees ?? 0)
      });
    });
    return m;
  }, [pools, queries24H]);

  const allTokens = useMemo(() => {
    const seen = new Set<string>();
    const out: Token[] = [];
    const add = (t: Token) => {
      if (!t.address) {
        console.warn('Token with undefined address encountered, skipping:', t);
        return;
      }
      const key = `${t.chainId ?? ''}:${t.address.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    };
    for (const p of pools) {
      add(p.token0);
      add(p.token1);
    }
    return out;
  }, [pools]);

  const tokenValues = useTokenValues(allTokens);

  const tokenIndexByAddress = useMemo(() => {
    const m = new Map<string, number>();
    allTokens.forEach((t, i) => m.set(t.address.toLowerCase(), i));
    return m;
  }, [allTokens]);

  const pairsInformationQuery = usePairsInformation(poolAddresses);

  const pairsInfoByAddress = useMemo(() => {
    const m = new Map<
      string,
      | {
          reserveX: bigint;
          reserveY: bigint;
          activeId: number;
        }
      | undefined
    >();
    pools.forEach((pool, i) => {
      const data = pairsInformationQuery[i]?.data as
        | (LBPairReservesAndId & { activeId: number })
        | undefined;
      m.set(pool.pairAddress.toLowerCase(), data);
    });
    return m;
  }, [pools, pairsInformationQuery]);

  const pairsStateByAddress = useMemo(() => {
    const m = new Map<
      string,
      { isLoading: boolean; isSuccess: boolean; isError: boolean }
    >();
    pools.forEach((pool, i) => {
      const q = pairsInformationQuery[i];
      m.set(pool.pairAddress.toLowerCase(), {
        isLoading: !!q?.isLoading,
        isSuccess: !!q?.isSuccess,
        isError: !!q?.isError
      });
    });
    return m;
  }, [pools, pairsInformationQuery]);

  const depths = useMemo(
    () => pools.map((pool) => binStepToDepth(pool.binStep)),
    [pools]
  );

  const activeIds = useMemo(
    () =>
      pools.map((pool) => {
        const info = pairsInfoByAddress.get(pool.pairAddress.toLowerCase());
        return info?.activeId;
      }),
    [pools, pairsInfoByAddress]
  );

  const depthQuery = useQueries({
    queries: pools.map((pool, i) => ({
      queryKey: [
        'depth',
        depths[i],
        activeIds[i] ?? null,
        pool.pairAddress.toLowerCase()
      ],
      queryFn: () =>
        fetchDepth(
          pool.pairAddress,
          pool.binStep,
          activeIds[i] as number,
          depths[i]
        ),
      enabled:
        !!pool.pairAddress &&
        activeIds[i] !== undefined &&
        activeIds[i] !== null
    }))
  });

  const depthByAddress = useMemo(() => {
    const m = new Map<
      string,
      | {
          reservesX: bigint;
          reservesY: bigint;
        }
      | undefined
    >();
    pools.forEach((pool, i) => {
      const d = depthQuery[i]?.data as
        | { reservesX: bigint; reservesY: bigint }
        | undefined;
      m.set(pool.pairAddress.toLowerCase(), d);
    });
    return m;
  }, [pools, depthQuery]);

  const rewardsQuery = trpc.useQueries((t) =>
    pools.map((pool) =>
      t.getRewardPool(
        { poolAddress: pool.pairAddress, epoch: currentEpoch.id },
        { enabled: !!pool.pairAddress && FEATURE_FLAGS.REWARDS }
      )
    )
  );

  const rewardsByAddress = useMemo(() => {
    const m = new Map<string, any>();
    pools.forEach((pool, i) => {
      m.set(pool.pairAddress.toLowerCase(), rewardsQuery[i]?.data);
    });
    return m;
  }, [pools, rewardsQuery]);

  const { data: airdropDatas, isLoading: airdropLoading } =
    trpc.getPointsAPR2Batch.useQuery(
      { poolAddresses: pools.map((p) => p.pairAddress) },
      { enabled: FEATURE_FLAGS.POINTS_V2 }
    );

  const airdropByAddress = useMemo(() => {
    const m = new Map<string, any>();
    if (airdropDatas) {
      for (const row of airdropDatas) {
        m.set(row.poolAddress.toLowerCase(), row);
      }
    }
    return m;
  }, [airdropDatas]);

  const poolsMetrics: SimplePoolMetrics[] = useMemo(() => {
    return pools.map((pool, i) => {
      const addr = pool.pairAddress.toLowerCase();

      const q24 = queries24H[i];
      const qPairsState = pairsStateByAddress.get(addr);
      const qDepth = depthQuery[i];
      const qRewards = rewardsQuery[i];

      const day = data24hByAddress.get(addr);
      const volume24h = Number(day?.volume ?? 0);
      const fees24h = Number(day?.fees ?? 0);

      const tvlData = pairsInfoByAddress.get(addr);
      const reservesX = tvlData?.reserveX ?? 0n;
      const reservesY = tvlData?.reserveY ?? 0n;

      const token0Idx = tokenIndexByAddress.get(
        pool.token0.address.toLowerCase()
      );
      const token1Idx = tokenIndexByAddress.get(
        pool.token1.address.toLowerCase()
      );
      const token0Value =
        token0Idx !== undefined ? tokenValues[token0Idx] : undefined;
      const token1Value =
        token1Idx !== undefined ? tokenValues[token1Idx] : undefined;
      const tokenPricesReady =
        token0Idx !== undefined &&
        token1Idx !== undefined &&
        token0Value !== undefined &&
        token1Value !== undefined;

      const dollarReserve = tokenPricesReady
        ? calculateTVL(
            new TokenAmount(pool.token0, reservesX),
            new TokenAmount(pool.token1, reservesY),
            token0Value || 0,
            token1Value || 0
          )
        : 0;

      const depthData = depthByAddress.get(addr);
      const depthDollarReserve = tokenPricesReady
        ? calculateTVL(
            new TokenAmount(pool.token0, depthData?.reservesX ?? 0n),
            new TokenAmount(pool.token1, depthData?.reservesY ?? 0n),
            token0Value || 0,
            token1Value || 0
          )
        : 0;

      // Helper function to validate and sanitize APR values
      const sanitizeAPR = (value: number): number => {
        if (isNaN(value) || !isFinite(value) || value < 0) return 0;
        // Cap unrealistic APR values at 10000% (100x)
        return Math.min(value, 10000);
      };

      const baseAPR = sanitizeAPR(
        depthDollarReserve > 0 ? (fees24h * 365 * 100) / depthDollarReserve : 0
      );

      const rewardsData = rewardsByAddress.get(addr);
      let rewardsAPR = 0;
      try {
        if (FEATURE_FLAGS.REWARDS && rewardsData && depthDollarReserve > 0) {
          const calculatedRewardsAPR = calculateRewardAPR(
            rewardsData.rewardTokens,
            currentEpoch,
            depthDollarReserve
          );
          rewardsAPR = sanitizeAPR(calculatedRewardsAPR);
        }
      } catch (error) {
        console.warn('Error calculating rewards APR:', error);
        rewardsAPR = 0;
      }

      const dollarReservePositive = dollarReserve > 0 ? dollarReserve : 0;
      const depthToTVLRatio =
        dollarReservePositive > 0
          ? Math.min(depthDollarReserve / dollarReservePositive, 1) // Cap at 1 to avoid ratio > 100%
          : 0;

      const weeklyMetrics = airdropByAddress.get(addr);
      const weeklyTVL = weeklyMetrics?.lastAvgTVL?._avg.usdLocked || 0;
      const depthWeeklyTVL = weeklyTVL * depthToTVLRatio;
      const potentialMakerPoints = weeklyMetrics?.pointsDistributed || 0;

      const dusaIdx = tokenIndexByAddress.get(DUSA_MAIN.address.toLowerCase());
      const dusaUsd = dusaIdx !== undefined ? tokenValues[dusaIdx] : undefined;
      const potentialMakerAirdrop = potentialMakerPoints * (dusaUsd ?? 0);

      let airdropAPR = 0;
      try {
        if (
          FEATURE_FLAGS.POINTS_V2 &&
          weeklyMetrics &&
          isInDusaSeason() &&
          depthWeeklyTVL > 0
        ) {
          const calculatedAirdropAPR = calculateAPR(
            toFraction((potentialMakerAirdrop || 0) / 7),
            depthWeeklyTVL
          );
          airdropAPR = sanitizeAPR(calculatedAirdropAPR);
        }
      } catch (error) {
        console.warn('Error calculating airdrop APR:', error);
        airdropAPR = 0;
      }

      const totalAPR = sanitizeAPR(baseAPR + rewardsAPR + airdropAPR);

      const volumeLoaded = !!q24?.isSuccess;
      const volumeError = !!q24?.isError;

      const feesLoaded = !!q24?.isSuccess;
      const feesError = !!q24?.isError;

      const liquidityLoaded = !!qPairsState?.isSuccess && tokenPricesReady;
      const liquidityError = !!qPairsState?.isError;

      const rewardsLoaded = !FEATURE_FLAGS.REWARDS || !!qRewards?.isSuccess;
      const rewardsErr = FEATURE_FLAGS.REWARDS ? !!qRewards?.isError : false;
      const depthLoaded = !!qDepth?.isSuccess;
      const depthErr = !!qDepth?.isError;
      const pointsLoaded =
        !FEATURE_FLAGS.POINTS_V2 || !isInDusaSeason() || !!airdropDatas;
      const aprLoaded =
        volumeLoaded &&
        liquidityLoaded &&
        depthLoaded &&
        rewardsLoaded &&
        pointsLoaded;
      const aprError = volumeError || liquidityError || depthErr || rewardsErr;

      const rowLoading =
        !!q24?.isLoading ||
        !!qPairsState?.isLoading ||
        !!qDepth?.isLoading ||
        !!qRewards?.isLoading ||
        airdropLoading;

      const rowError =
        volumeError || feesError || liquidityError || depthErr || rewardsErr;

      const version = String(pool.version).toUpperCase() as 'V1' | 'V2';

      return {
        poolAddress: pool.pairAddress,
        version,
        volume24h,
        fees24h,
        liquidity: dollarReserve,
        apr: totalAPR,
        baseAPR,
        rewardsAPR,
        airdropAPR,
        hasRewards: rewardsAPR + airdropAPR > 0,
        isLoading: rowLoading,
        hasError: rowError,
        loading: {
          volume24h: !volumeLoaded,
          fees24h: !feesLoaded,
          liquidity: !liquidityLoaded,
          apr: !aprLoaded
        },
        errors: {
          volume24h: volumeError,
          fees24h: feesError,
          liquidity: liquidityError,
          apr: aprError
        }
      };
    });
  }, [
    pools,
    tokenValues,
    tokenIndexByAddress,
    data24hByAddress,
    pairsInfoByAddress,
    pairsStateByAddress,
    depthByAddress,
    queries24H,
    depthQuery,
    rewardsQuery,
    rewardsByAddress,
    airdropDatas,
    airdropLoading
  ]);

  const isLoading = useMemo(() => {
    const anyPairsLoading = pools.some(
      (p) => pairsStateByAddress.get(p.pairAddress.toLowerCase())?.isLoading
    );
    return (
      queries24H.some((q) => q.isLoading) ||
      rewardsQuery.some((q) => q.isLoading) ||
      anyPairsLoading ||
      depthQuery.some((q) => q.isLoading) ||
      airdropLoading
    );
  }, [
    pools,
    queries24H,
    rewardsQuery,
    pairsStateByAddress,
    depthQuery,
    airdropLoading
  ]);

  const hasErrors = useMemo(() => {
    const anyPairsError = pools.some(
      (p) => pairsStateByAddress.get(p.pairAddress.toLowerCase())?.isError
    );
    return (
      queries24H.some((q) => q.isError) ||
      rewardsQuery.some((q) => q.isError) ||
      anyPairsError ||
      depthQuery.some((q) => q.isError)
    );
  }, [pools, queries24H, rewardsQuery, pairsStateByAddress, depthQuery]);

  return {
    poolsMetrics,
    isLoading,
    hasErrors
  };
};

export default useSimplePoolsMetrics;
