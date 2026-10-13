import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchPairAddress } from 'utils/datastoreFetcher';
import { cleanAddress } from 'utils/methods';
import { queryKeys } from 'utils/trpc';
import { Pool, Version } from 'utils/types';

const queryKey = queryKeys.pairAddress;

export const usePairAddress = (pool: Partial<Pool>) => {
  const { token0, token1, binStep, version } = pool;
  const query = useQuery(
    [
      queryKey,
      cleanAddress(token0?.address),
      cleanAddress(token1?.address),
      binStep,
      version
    ],

    () =>
      fetchPairAddress(
        cleanAddress(token0?.address),
        cleanAddress(token1?.address),
        binStep!,
        version!
      ).catch(() => ''),
    {
      enabled: !!token0 && !!token1 && !!binStep && !!version
    }
  );
  return query;
};

type SimpleToken = { address: string };
type SimplePool = {
  token0: SimpleToken;
  token1: SimpleToken;
  binStep: number;
  version: Version;
};
export const usePairAddresses = (pools: (Pool | SimplePool)[]) => {
  const poolAddressesQuery = useQueries({
    queries: pools.map((pool) => {
      const token0Address = cleanAddress(pool.token0.address);
      const token1Address = cleanAddress(pool.token1.address);
      return {
        queryKey: [
          queryKey,
          token0Address,
          token1Address,
          pool.binStep,
          pool.version
        ],
        // prettier-ignore
        queryFn: () => fetchPairAddress(token0Address, token1Address, pool.binStep, pool.version),
        enabled: !!token0Address && !!token1Address && !!pool.binStep
      };
    })
  });

  // Separate valid and invalid pools
  const validPoolsData: Array<{
    pool: Pool | SimplePool;
    address: string;
    index: number;
  }> = [];
  const invalidPoolsData: Array<{
    pool: Pool | SimplePool;
    index: number;
    error?: string;
  }> = [];

  poolAddressesQuery.forEach((query, index) => {
    const pool = pools[index];
    if (query.data && query.data !== null) {
      validPoolsData.push({
        pool,
        address: query.data,
        index
      });
    } else if (query.isError || (query.isSuccess && query.data === null)) {
      invalidPoolsData.push({
        pool,
        index,
        error: 'Failed to fetch pair address'
      });
    }
  });

  // Keep backward compatibility
  const poolAddresses = poolAddressesQuery.map((p) => p.data || '');
  const poolAddressesReady =
    validPoolsData.length > 0 &&
    poolAddressesQuery.every((query) => !query.isLoading);

  return {
    ...poolAddressesQuery,
    poolAddresses,
    poolAddressesReady,
    validPools: validPoolsData,
    invalidPools: invalidPoolsData,
    hasValidPools: validPoolsData.length > 0,
    totalPools: pools.length,
    validPoolsCount: validPoolsData.length,
    invalidPoolsCount: invalidPoolsData.length
  };
};
