import { useQueries, useQuery } from '@tanstack/react-query';
import { factorySC, factoryV2SC } from 'utils/config';
import { getTokensFromPairAddress } from 'utils/datastoreFetcher';
import { transformToken } from 'utils/storage';
import { queryKeys } from 'utils/trpc';
import { Pool } from 'utils/types';
import { usePairAddresses } from './useFetchData';
import useFetchDatastore from './useFetchDatastore';

const prefix = 'PAIR_INFORMATION::';
const split = (key: string) => key.substring(prefix.length).split(':');

export const useFetchAllPools = (isV1 = true) => {
  const factory = isV1 ? factorySC : factoryV2SC;
  // KEYS
  const { data: keys } = useFetchDatastore(factory, prefix);

  // POOL ADDRESSES
  const unsortedPools =
    keys?.map((k) => ({
      token0: { address: split(k)[0] },
      token1: { address: split(k)[1] },
      binStep: Number(split(k)[2])
    })) || [];
  const { poolAddresses /* , poolAddressesReady */ } = usePairAddresses(
    unsortedPools.map((p) => ({ ...p, version: isV1 ? 'V1' : 'V2' }))
  );

  // TOKENS SORTED
  const tokensSortedQuery = useQueries({
    queries: poolAddresses.map((pairAddress) => ({
      queryKey: [queryKeys.tokensSorted, pairAddress],
      queryFn: () => getTokensFromPairAddress(pairAddress),
      enabled: !!pairAddress
    }))
  });
  const tokensSortedReady =
    tokensSortedQuery.length > 0 && tokensSortedQuery.every((p) => p.data);
  const pools: Pool[] = tokensSortedReady
    ? tokensSortedQuery.map((p, i) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        token0: transformToken(p.data![0]),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        token1: transformToken(p.data![1]),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        binStep: Number(split(keys![i])[2]),
        pairAddress: poolAddresses[i],
        version: isV1 ? 'V1' : 'V2'
      }))
    : [];

  const query = useQuery(['allPools', factory], () => Promise.resolve(pools), {
    enabled: tokensSortedReady && poolAddresses.length > 0
  });
  return {
    ...query,
    isLoading: query.data?.length === 0 || query.data === undefined
  };
};

export default useFetchAllPools;
