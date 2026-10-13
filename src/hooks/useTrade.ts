import { useState, useEffect } from 'react';
import { TradeV2, parseUnits, QuoterHelper, TokenAmount } from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { TradeContextProps } from 'pages/Trade';
import { CHAIN_ID, quoterV2SC } from 'utils/config';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchTokenFromAddress,
  fetchPairBinStep,
  getPairAddressTokens
} from 'utils/datastoreFetcher';
import { getTokensFromStorage } from 'utils/methods';
import { updateLastTokens } from 'utils/storage';
import { queryKeys } from 'utils/trpc';
import { Token } from 'utils/types';
import { baseClient } from 'utils/w3';
import { usePairAddress } from './useFetchData';

const useTrade = (): TradeContextProps => {
  const lastTokens = getTokensFromStorage();
  const [token0, setToken0] = useState<Token | undefined>(lastTokens[0]);
  const [token1, setToken1] = useState<Token | undefined>(lastTokens[1]);
  const [displayChart, setDisplayChart] = useState(true);
  const [bestTrade, setBestTrade] = useState<TradeV2 | undefined>();
  // const [isFromFixed, setIsFromFixed] = useState(false);
  // const [isToFixed, setIsToFixed] = useState(false);
  const route = bestTrade?.quote.pairs;

  const history = useNavigate();

  const { search } = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(search);
    const { tokenIn, tokenOut, fixIn, fixOut } = Object.fromEntries(query);
    // if (tokenIn === DUSA_.address)
    tokenIn && fetchTokenFromAddress(tokenIn).then(setToken0);
    tokenOut && fetchTokenFromAddress(tokenOut).then(setToken1);
    // console.log({ fixIn, fixOut });
    // fixIn && fixIn === 'true' && setIsFromFixed(true);
    // fixOut && fixOut === 'true' && setIsToFixed(true);
  }, [search]);

  const fetchBestTrade = async (
    qty: string | undefined,
    maxHops = 3,
    checkLegacy = false
  ) => {
    const isToken0 = true;
    if (!qty || !tokensSet) return;

    const quantity = parseUnits(qty, (isToken0 ? token0 : token1).decimals);
    const t0 = getWmasIfMas(token0);
    const t1 = getWmasIfMas(token1);
    const trade = await QuoterHelper.findBestPath(
      t0,
      false,
      t1,
      false,
      new TokenAmount(isToken0 ? token0 : token1, quantity),
      isToken0,
      maxHops,
      baseClient,
      CHAIN_ID,
      quoterV2SC,
      checkLegacy
    ).catch((error) => {
      console.log(error);
      return;
    });

    if (!trade || trade.executionPrice.denominator === 0n) {
      // Retry with checkLegacy=true if we haven't tried it yet
      if (!checkLegacy) {
        return fetchBestTrade(qty, maxHops, true);
      }

      // Retry with reduced maxHops if we've already tried with legacy
      if (maxHops > 1) {
        return fetchBestTrade(qty, maxHops - 1, false);
      }

      return;
    }
    return trade;
  };

  useEffect(() => {
    if (!token0 || !token1) return;
    fetchBestTrade('0.01').then((trade) => {
      console.log(trade);
      setBestTrade(trade);
    });
  }, [token0, token1]);

  const tokensSet = !!token0 && !!token1;

  const bsQuery = useQuery(
    ['binStep', token0?.address, token1?.address],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchPairBinStep(token0!.address, token1!.address),
    { enabled: tokensSet }
  );
  const binStep = bsQuery.data || 0;
  const pairAddressQuery = usePairAddress({ token0, token1, binStep });
  const pairAddress = pairAddressQuery.data || '';
  const loading = bsQuery.isLoading || pairAddressQuery.isInitialLoading;

  const tokensQuery = useQuery(
    [queryKeys.tokensSorted, pairAddress],
    () => getPairAddressTokens(pairAddress),
    { enabled: !!pairAddress }
  );
  const tokenXAddress = tokensQuery?.data?.[0];

  useEffect(() => {
    updateLastTokens([token0, token1]);
    history({ search: '' });
  }, [token0, token1]);

  return {
    token0,
    setToken0,
    token1,
    setToken1,
    token0DCA: token0,
    token1DCA: token1,
    setToken0DCA: setToken0,
    setToken1DCA: setToken1,
    token0Swap: token0,
    token1Swap: token1,
    setToken0Swap: setToken0,
    setToken1Swap: setToken1,
    tokenXAddress,
    binStep,
    pairAddress,
    loading,
    route,
    displayChart,
    setDisplayChart,
    // isFromFixed,
    // isToFixed,
    activeOrders: []
  };
};

export default useTrade;
