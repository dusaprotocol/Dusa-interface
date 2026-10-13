import React, { useEffect, useState } from 'react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import { ErrorBoundary } from 'react-error-boundary';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import AccountDrawer from 'components/AccountDrawer';
import AccountWrapper from 'components/AccountWrapper';
import Footer from 'components/Footer';
import Headband from 'components/Headband';
import Header from 'components/Header';
import SnowOverlay from 'components/SnowOverlay';
import {
  InterfaceLevel,
  SettingsContext,
  SettingsContextType
} from 'context/SettingsContext';
import useReferralToast from 'hooks/useReferralToast';
import useTrade from 'hooks/useTrade';
import ErrorPage from 'pages/ErrorPage';
import { TradeContext } from 'pages/Trade';
import SwapCard from 'pages/Trade/components/SwapCard';
import { FEATURE_FLAGS, actualTheme, api, apiBackup } from 'utils/config';
import { setTheme } from 'utils/darkMode';
import { getTokenFromAddress } from 'utils/methods';
import {
  getInterfaceLevel,
  getInterfaceTheme,
  getIsOverlay,
  getSwapSlippage,
  getDcaSlippage,
  getAmountLiquiditySlippage,
  getPriceLiquiditySlippage,
  getAirdropMcap,
  getSimulateTx,
  setInterfaceLevel as setInterfaceLevelStorage,
  setIsOverlay as setIsOverlayStorage,
  setSwapSlippage as setSwapSlippageStorage,
  setDcaSlippage as setDcaSlippageStorage,
  setAmountLiquiditySlippage as setAmountLiquiditySlippageStorage,
  setPriceLiquiditySlippage as setPriceLiquiditySlippageStorage,
  setAirdropMcap as setAirdropMcapStorage,
  setSimulateTx as setSimulateTxStorage
} from 'utils/storage';
import { QueryKey, queryKeys, trpc } from 'utils/trpc';
import { Token } from 'utils/types';
import ScrollToTop from './ScrollToTop';
import 'react-toastify/dist/ReactToastify.css';
import './assets/sass/index.scss';
import './assets/sass/design-tokens.scss';

const isProduction = process.env.NODE_ENV === 'production';
FEATURE_FLAGS.SENTRY &&
  isProduction &&
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: 'https://848a87f408e153cdef30f942969a223b@o4508049985241088.ingest.de.sentry.io/4508202814931024',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration()
      ],
      // Tracing
      tracesSampleRate: 1.0, //  Capture 100% of the transactions
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ['localhost', 'https://app.dusa.io'],
      // Session Replay
      replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    });
  });

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      console.error(error);
      if (error.message.includes('data is undefined')) return;
      // toast.error(`Something went wrong: ${error.message}`);
    }
  }),
  defaultOptions: { queries: { refetchOnWindowFocus: false } }
});

const cacheTime = 24 * 3600000; // milliseconds in day
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage
});
const persistQueries: QueryKey[] = [
  queryKeys.pairAddress,
  queryKeys.totalSupply,
  queryKeys.tokensSorted,
  queryKeys.feeParameters
];
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: cacheTime,
  hydrateOptions: {},
  dehydrateOptions: {
    shouldDehydrateQuery: ({ queryKey }) => {
      return queryKey.some((key) => persistQueries.includes(key as any));
    }
  }
});

// Custom fetch with failover to backup API
const fetchWithFailover = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  try {
    const response = await fetch(input, init);
    // If response is ok, return it
    if (response.ok) {
      return response;
    }
    // If response is not ok (4xx, 5xx), throw to trigger failover
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    // If main API fails and backup exists, try backup
    if (apiBackup) {
      console.warn('Main API failed, attempting backup API...', error);
      const backupUrl = input.toString().replace(api, apiBackup);
      try {
        const backupResponse = await fetch(backupUrl, init);
        if (backupResponse.ok) {
          console.log('Backup API succeeded');
          return backupResponse;
        }
        throw new Error(
          `Backup API HTTP ${backupResponse.status}: ${backupResponse.statusText}`
        );
      } catch (backupError) {
        console.error('Backup API also failed', backupError);
        throw backupError;
      }
    }
    throw error;
  }
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: api,
      fetch: apiBackup ? fetchWithFailover : undefined
    })
  ]
});

const ReferralWrapper = ({ children }: { children: React.ReactNode }) => {
  // This hook will automatically detect referral codes and show toasts
  useReferralToast();
  return <>{children}</>;
};

const App = () => {
  return (
    <>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <SettingsWrapper>
            <AccountWrapper>
              <ReferralWrapper>
                <SnowOverlay />
                {FEATURE_FLAGS.PAUSE_SCREEN ? (
                  <div className='back-message'>
                    <div>
                      <span>Live at 4pm CEST</span>
                      <div className='emoji'></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {FEATURE_FLAGS.HEADBAND && <Headband />}
                    <Header />
                    <main>
                      <Outlet />
                    </main>
                    <Footer />
                  </>
                )}
                <AccountDrawer />
              </ReferralWrapper>
            </AccountWrapper>
          </SettingsWrapper>
          <ToastContainer pauseOnHover={false} theme='dark' />
          <ScrollToTop />
        </QueryClientProvider>
      </trpc.Provider>
    </>
  );
};

const SettingsWrapper = ({ children }: { children: React.ReactNode }) => {
  const [interfaceLevel, _setInterfaceLevel] =
    useState<InterfaceLevel>(getInterfaceLevel());
  const [interfaceTheme, _setInterfaceTheme] = useState<string>(
    getInterfaceTheme() ?? actualTheme
  );
  const [isOverlay, _setIsOverlay] = useState<boolean>(getIsOverlay());
  const [swapSlippage, _setSwapSlippage] = useState<number>(getSwapSlippage());
  const [dcaSlippage, _setDcaSlippage] = useState<number>(getDcaSlippage());
  const [amountLiquiditySlippage, _setAmountLiquiditySlippage] =
    useState<number>(getAmountLiquiditySlippage());
  const [priceLiquiditySlippage, _setPriceLiquiditySlippage] = useState<number>(
    getPriceLiquiditySlippage()
  );
  const [airdropMcap, _setAirdropMcap] = useState<number>(getAirdropMcap);
  const [showHeadband, setShowHeadband] = useState(true);
  const [simulateTx, _setSimulateTx] = useState<boolean>(getSimulateTx());

  const setInterfaceLevel = (value: InterfaceLevel) => {
    _setInterfaceLevel(value);
    setInterfaceLevelStorage(value);
  };

  const setInterfaceTheme = (value: string) => {
    _setInterfaceTheme(value);
    setTheme(value);
  };

  const setIsOverlay = (value: boolean) => {
    _setIsOverlay(value);
    setIsOverlayStorage(value);
  };

  const setSwapSlippage = (value: number) => {
    _setSwapSlippage(value);
    setSwapSlippageStorage(value);
  };

  const setDcaSlippage = (value: number) => {
    _setDcaSlippage(value);
    setDcaSlippageStorage(value);
  };

  const setAmountLiquiditySlippage = (value: number) => {
    _setAmountLiquiditySlippage(value);
    setAmountLiquiditySlippageStorage(value);
  };

  const setPriceLiquiditySlippage = (value: number) => {
    _setPriceLiquiditySlippage(value);
    setPriceLiquiditySlippageStorage(value);
  };

  const setAirdropMcap = (value: number) => {
    _setAirdropMcap(value);
    setAirdropMcapStorage(value);
  };

  const setSimulateTx = (value: boolean) => {
    _setSimulateTx(value);
    setSimulateTxStorage(value);
  };

  const settings: SettingsContextType = {
    interfaceLevel,
    setInterfaceLevel,
    interfaceTheme,
    setInterfaceTheme,
    isOverlay,
    setIsOverlay,
    swapSlippage,
    setSwapSlippage,
    dcaSlippage,
    setDcaSlippage,
    amountLiquiditySlippage,
    setAmountLiquiditySlippage,
    priceLiquiditySlippage,
    setPriceLiquiditySlippage,
    airdropMcap,
    setAirdropMcap,
    showHeadband,
    setShowHeadband,
    simulateTx,
    setSimulateTx
  };

  useEffect(() => {
    setTheme(interfaceTheme);
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      <ErrorBoundary FallbackComponent={ErrorPage}>{children}</ErrorBoundary>
    </SettingsContext.Provider>
  );
};

const findListedToken = (address: string): Token | undefined => {
  try {
    return getTokenFromAddress(address);
  } catch {
    return undefined;
  }
};

const SwapWidget = () => {
  const [isFromFixed, setIsFromFixed] = useState(false);
  const [isToFixed, setIsToFixed] = useState(false);

  const { search } = useLocation();
  const tradeContext = useTrade();
  const { setToken0, setToken1 } = tradeContext;

  useEffect(() => {
    const query = new URLSearchParams(search);
    const { tokenIn, tokenOut, fixIn, fixOut } = Object.fromEntries(query);
    // The widget can be embedded by any site: only preselect (and lock) tokens
    // that are on the token list, never an arbitrary contract from the URL.
    const listedIn = tokenIn ? findListedToken(tokenIn) : undefined;
    const listedOut = tokenOut ? findListedToken(tokenOut) : undefined;
    listedIn && setToken0(listedIn);
    listedOut && setToken1(listedOut);
    listedIn && fixIn === 'true' && setIsFromFixed(true);
    listedOut && fixOut === 'true' && setIsToFixed(true);
  }, [search]);

  // if (isNaN(binStep)) return <ErrorPage />;

  return (
    <>
      <TradeContext.Provider value={tradeContext}>
        <SwapCard
          isFromFixed={isFromFixed}
          isToFixed={isToFixed}
          isDCADisabled
        />
      </TradeContext.Provider>
      <AccountDrawer />
    </>
  );
};

export const Widget = () => {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SettingsWrapper>
          <AccountWrapper>
            <SwapWidget />
          </AccountWrapper>
        </SettingsWrapper>
        <ToastContainer pauseOnHover={false} theme='dark' />
        <ScrollToTop />
      </QueryClientProvider>
    </trpc.Provider>
  );
};

export default App;
