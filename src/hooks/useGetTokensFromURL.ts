import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getMasIfWmas, getWmasIfMas } from 'utils/coreMethods';
import {
  fetchTokenFromAddress,
  getTokensFromPairAddress
} from 'utils/datastoreFetcher';
import { isAddressValid } from 'utils/methods';
import { transformToken } from 'utils/storage';
import { queryKeys } from 'utils/trpc';
import { Token, Version } from 'utils/types';
import { usePairAddress } from './useFetchData';

export const useFetchToken = (address: string | undefined) => {
  const query = useQuery(
    ['token', address],
    () => fetchTokenFromAddress(address ?? ''),
    { enabled: !!address && isAddressValid(address) }
  );
  return {
    ...query,
    token: query.data && getWmasIfMas(transformToken(query.data))
  };
};

const useGetTokensFromURL = () => {
  const [token0Sorted, setToken0Sorted] = useState<Token | undefined>();
  const [token1Sorted, setToken1Sorted] = useState<Token | undefined>();

  const {
    token0: t0Address,
    token1: t1Address,
    binStep: bStep,
    version: _version
  } = useParams();
  const binStep = bStep ? parseInt(bStep) : undefined;
  const version: Version = _version && _version === 'V1' ? 'V1' : 'V2';

  const { data: token0, error: error0 } = useFetchToken(t0Address);
  const { data: token1, error: error1 } = useFetchToken(t1Address);
  const pairAddressQuery = usePairAddress({ token0, token1, binStep, version });
  const pairAddress = pairAddressQuery.data || '';
  const tokensSortedQuery = useQuery(
    [queryKeys.tokensSorted, pairAddress],
    () => getTokensFromPairAddress(pairAddress),
    { enabled: !!pairAddress }
  );
  const error = error0 || error1 || tokensSortedQuery.error;

  const tokensSorted = useMemo(
    () => tokensSortedQuery.data?.map(transformToken) || [],
    [pairAddressQuery.data]
  );
  const tokensSortedReady = tokensSorted.length === 2;

  useEffect(() => {
    setToken0Sorted(undefined);
    setToken1Sorted(undefined);
  }, [t0Address, t1Address, binStep]);

  useEffect(() => {
    if (!tokensSortedReady) return;
    setToken0Sorted(getMasIfWmas(tokensSorted[0]));
    setToken1Sorted(getMasIfWmas(tokensSorted[1]));
  }, [tokensSortedReady, tokensSorted]);

  return {
    token0: token0Sorted,
    setToken0: setToken0Sorted,
    token1: token1Sorted,
    setToken1: setToken1Sorted,
    binStep,
    version,
    error
  };
};

export default useGetTokensFromURL;
