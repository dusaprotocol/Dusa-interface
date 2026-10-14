import React, {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState
} from 'react';
import {
  LimitOrder,
  QuoterHelper,
  TokenAmount,
  parseUnits
} from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import { useLocation, useNavigate } from 'react-router-dom';
// import ActiveOrders from 'components/ActiveOrders';
// import OrderHistory from 'components/OrderHistory';
import PageHeader from 'components/PageHeader';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { usePairAddress } from 'hooks/useFetchData';
import useResizeWindow from 'hooks/useResizeWindow';
import { CHAIN_ID, FEATURE_FLAGS, quoterV2SC } from 'utils/config';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchPairBinStep,
  fetchPoolVersion,
  getPairAddressTokens
} from 'utils/datastoreFetcher';
import {
  getKnownToken,
  getTokenFromAddress,
  getTokensDCAFromStorage,
  getTokensFromStorage
} from 'utils/methods';

import { updateLastTokens } from 'utils/storage';
import { POM, PUR } from 'utils/tokens';
import { queryKeys } from 'utils/trpc';
import { Pool, Token, Version } from 'utils/types';
import { baseClient } from 'utils/w3';
import ActiveOrderDCACard from './components/ActiveOrderDCACard';
import History from './components/History';
const PriceChartContainer = lazy(
  () => import('./components/PriceChartContainer')
);
import SwapCard from './components/SwapCard';
const TradingViewContainer = lazy(
  () => import('./components/TradingViewContainer')
);
import './index.scss';

export interface TradeContextProps {
  token0Swap: Token | undefined;
  setToken0Swap: React.Dispatch<React.SetStateAction<Token | undefined>>;
  token1Swap: Token | undefined;
  setToken1Swap: React.Dispatch<React.SetStateAction<Token | undefined>>;
  token0DCA: Token | undefined;
  setToken0DCA: React.Dispatch<React.SetStateAction<Token | undefined>>;
  token1DCA: Token | undefined;
  setToken1DCA: React.Dispatch<React.SetStateAction<Token | undefined>>;
  token0: Token | undefined;
  setToken0: React.Dispatch<React.SetStateAction<Token | undefined>>;
  token1: Token | undefined;
  setToken1: React.Dispatch<React.SetStateAction<Token | undefined>>;
  tokenXAddress: string | undefined;
  binStep: number;
  pairAddress: string;
  loading: boolean;
  route: string[] | undefined;
  displayChart: boolean;
  setDisplayChart: React.Dispatch<React.SetStateAction<boolean>>;
  // isFromFixed?: boolean;
  // isToFixed?: boolean;
  activeOrders: LimitOrder[] | undefined;
}

export const TradeContext = createContext<TradeContextProps>(
  {} as TradeContextProps
);

const Trade = () => {
  const lastSwapTokens = getTokensFromStorage();
  const lastDcaTokens = getTokensDCAFromStorage();
  const [token0Swap, setToken0Swap] = useState(lastSwapTokens[0]);
  const [token1Swap, setToken1Swap] = useState(lastSwapTokens[1]);
  const [token0DCA, setToken0DCA] = useState(lastDcaTokens[0]);
  const [token1DCA, setToken1DCA] = useState(lastDcaTokens[1]);
  const [displayChart, setDisplayChart] = useState(true);
  // const [historyDCA, setHistoryDCA] = useState<DCAInterface[] | undefined>();
  const [activeOrders, _setActiveOrders] = useState<LimitOrder[] | undefined>();
  // const [orderHistory, setOrderHistory] = useState<LimitOrder[] | undefined>();

  const { connectedAddress } = useContext(AccountWrapperContext);
  const { interfaceLevel } = useContext(SettingsContext);

  const { showHeadband } = useContext(SettingsContext);

  const { search } = useLocation();
  const history = useNavigate();

  const params = new URLSearchParams(search);
  const activeTab = params.get('tab') === 'DCA' ? 'DCA' : 'Swap';
  const isDcaTab = activeTab === 'DCA';

  const token0 = isDcaTab ? token0DCA : token0Swap;
  const token1 = isDcaTab ? token1DCA : token1Swap;

  const tokenUndefined = !token0 || !token1;
  const proInterface = interfaceLevel === 'pro' && !tokenUndefined;

  useEffect(() => {
    const prms = new URLSearchParams(search);
    const tokenIn = prms.get('tokenIn');
    const tokenOut = prms.get('tokenOut');
    const actvTab = prms.get('tab') === 'DCA' ? 'DCA' : 'Swap';

    // only known tokens: a link must not preselect an arbitrary (possibly fake) token
    const knownIn = tokenIn ? getKnownToken(tokenIn) : undefined;
    const knownOut = tokenOut ? getKnownToken(tokenOut) : undefined;
    if (actvTab === 'DCA') {
      knownIn && setToken0DCA(knownIn);
      knownOut && setToken1DCA(knownOut);
    } else {
      knownIn && setToken0Swap(knownIn);
      knownOut && setToken1Swap(knownOut);
    }
  }, [search]);

  useEffect(() => {
    const keep = new URLSearchParams(search).get('tab');
    history({ search: keep ? `?tab=${keep}` : '' });
  }, [token0, token1]);

  useEffect(() => {
    updateLastTokens([token0Swap, token1Swap]);
  }, [token0Swap, token1Swap]);

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
    ).catch((error) => console.log(error));

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

  const getProperQuantity = (token: Token) => {
    if (token.symbol.includes('BTC')) return '0.0005';
    if (token.symbol.includes('ETH')) return '0.01';
    if ([PUR.symbol, POM.symbol].includes(token.symbol)) return '1000000';
    return '1';
  };

  const qty = !token0 ? '' : getProperQuantity(token0);
  const bestTradeQuery = useQuery(
    ['bestTrade', token0?.address, token1?.address, qty],
    () => fetchBestTrade(qty),
    { enabled: !!token0 && !!token1 && token0.address !== token1.address }
  );
  const bestTrade = bestTradeQuery.data;
  const route = bestTrade?.quote.pairs;

  // Fetch pool versions correctly instead of assuming V2
  const poolsVersionQuery = useQuery(
    ['poolsVersions', bestTrade?.route.pairs],
    async () => {
      if (!bestTrade?.route.pairs) return [];

      const poolsWithVersions = await Promise.all(
        bestTrade.route.pairs.map(async (pair, i) => {
          try {
            const version = await fetchPoolVersion(
              pair.tokenA.address,
              pair.tokenB.address,
              Number(bestTrade.quote.binSteps[i])
            );
            return {
              token0: getTokenFromAddress(pair.tokenA.address),
              token1: getTokenFromAddress(pair.tokenB.address),
              binStep: Number(bestTrade.quote.binSteps[i]),
              pairAddress: bestTrade.quote.pairs[i],
              version
            };
          } catch (error) {
            // Fallback to V2 if version fetch fails
            return {
              token0: getTokenFromAddress(pair.tokenA.address),
              token1: getTokenFromAddress(pair.tokenB.address),
              binStep: Number(bestTrade.quote.binSteps[i]),
              pairAddress: bestTrade.quote.pairs[i],
              version: 'V2' as const
            };
          }
        })
      );
      return poolsWithVersions;
    },
    { enabled: !!bestTrade?.route.pairs }
  );
  const pools: Pool[] | undefined = poolsVersionQuery.data;

  const tokensSet = !!token0 && !!token1;
  const token0ForPair = token0 ? getWmasIfMas(token0) : undefined;
  const token1ForPair = token1 ? getWmasIfMas(token1) : undefined;

  const bsQuery = useQuery(
    ['binStep', token0?.address, token1?.address],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchPairBinStep(token0ForPair!.address, token1ForPair!.address),
    { enabled: tokensSet }
  );
  const binStep = bsQuery.data || 0;

  const versionQuery = useQuery(
    ['version', token0ForPair?.address, token1ForPair?.address],
    async () => {
      if (!token0ForPair?.address || !token1ForPair?.address) return undefined;
      return (await fetchPoolVersion(
        token0ForPair.address,
        token1ForPair.address,
        binStep
      )) as Version;
    },
    { enabled: !!token0ForPair && !!token1ForPair && !!binStep }
  );
  const version = versionQuery.data;

  const pairAddressQuery = usePairAddress({
    token0: token0ForPair,
    token1: token1ForPair,
    binStep,
    version
  });
  const pairAddress = pairAddressQuery.data || '';
  const loading = bsQuery.isLoading || pairAddressQuery.isInitialLoading;

  const tokensQuery = useQuery(
    [queryKeys.tokensSorted, pairAddress],
    () => getPairAddressTokens(pairAddress),
    { enabled: !!pairAddress }
  );
  const tokenXAddress = tokensQuery?.data?.[0];

  const { innerWidth: width } = useResizeWindow();
  const isMobile = width <= 768;

  // if (isNaN(binStep)) return <ErrorPage />;

  return (
    <div
      className={clsx(
        'Trade',
        proInterface && 'pro',
        showHeadband && 'trade-with-headband'
      )}
    >
      <TradeContext.Provider
        value={{
          token0Swap,
          setToken0Swap,
          token1Swap,
          setToken1Swap,
          token0DCA,
          setToken0DCA,
          token1DCA,
          setToken1DCA,
          token0,
          token1,
          setToken0: setToken0Swap,
          setToken1: setToken1Swap,
          tokenXAddress,
          binStep,
          pairAddress,
          loading,
          route,
          displayChart,
          setDisplayChart,
          activeOrders
        }}
      >
        {proInterface && !isMobile ? (
          <div className='pro-interface'>
            <History />
            <div className='swap-cards-container'>
              <div className='TradingView-container'>
                <Suspense fallback={null}>
                  {pools && route ? (
                    <TradingViewContainer pools={pools} pairAddresses={route} />
                  ) : bestTradeQuery.isLoading ? (
                    <div className='flex justify-center items-center gap-2 w-full h-full'>
                      <Spinner size={32} />
                      <span>Chart data is loading</span>
                    </div>
                  ) : (
                    <div className='flex justify-center items-center gap-2 w-full h-full'>
                      <span>No data available for this pair</span>
                    </div>
                  )}
                </Suspense>
              </div>
              <div
                className={clsx(
                  'swap-history-cards',
                  tokenUndefined && 'justify-center items-center'
                )}
              >
                <SwapCard />
                {(FEATURE_FLAGS.DCA || FEATURE_FLAGS.LIMIT) && (
                  <ActiveOrderDCACard />
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <PageHeader
              title='Trade'
              description='Trade tokens in an instant'
            />
            <div className='swap-container'>
              <div
                className={clsx(
                  'items-start chart-feature-container margin-swap',
                  tokenUndefined && 'justify-center items-center'
                )}
              >
                <SwapCard />
                {!tokenUndefined && (
                  <Suspense fallback={null}>
                    {pools && route ? (
                      <PriceChartContainer
                        pools={pools}
                        pairAddresses={route}
                      />
                    ) : bestTradeQuery.isLoading ? (
                      <div className='flex justify-center items-center gap-2 w-full h-full'>
                        <Spinner size={32} />
                        <span>Chart data is loading</span>
                      </div>
                    ) : (
                      <div className='flex justify-center items-center gap-2 w-full h-full'>
                        <span>No data available for this pair</span>
                      </div>
                    )}
                  </Suspense>
                )}
              </div>
            </div>
          </>
        )}
      </TradeContext.Provider>
    </div>
  );
};

export default Trade;
