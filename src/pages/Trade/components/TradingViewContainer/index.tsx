import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  widget,
  ChartingLibraryWidgetOptions,
  ResolutionString,
  LibrarySymbolInfo,
  IPriceFormatter
} from 'charting_library';
import Skeleton from 'components/Skeleton';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { TradeContext } from 'pages/Trade';
import { baseApi } from 'utils/config';
import { ONE_DAY } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import { formatNumberWithSubscriptZeros, printUSD } from 'utils/methods';
import { MASSA } from 'utils/tokens';
import { trpc } from 'utils/trpc';
import './index.scss';
import { Pool } from 'utils/types';

type TradingViewContainerProps = {
  pools: Pool[];
  pairAddresses: string[];
};

// make all props optional while maintaining their relationship
// type Props = TradingViewContainerProps | Record<string, never>;

const TradingViewContainer = (props: TradingViewContainerProps) => {
  const [widgetLoading, setWidgetLoading] = useState(true);
  const { token0, token1, pairAddress } = useContext(TradeContext);
  const { connected, connectedAddress } = useContext(AccountWrapperContext);

  const enabledCombinedPrice = props.pairAddresses.length > 1;
  const symbol = enabledCombinedPrice
    ? props.pairAddresses.join(':')
    : props.pairAddresses.at(0) || pairAddress;

  const chartContainerRef =
    useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;
  const { interfaceTheme } = useContext(SettingsContext);
  const isLight = interfaceTheme === 'Winter';

  const tvWidgetRef = useRef<any>(null);

  useEffect(() => {
    if (!symbol) return;

    const tradingViewEndpoint = baseApi;
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol,
      datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(
        tradingViewEndpoint.endsWith('/')
          ? tradingViewEndpoint.slice(0, -1)
          : tradingViewEndpoint
      ),
      timeframe: '7D',
      time_frames: [
        {
          text: '7d',
          resolution: '60' as ResolutionString,
          description: '1 Week'
        },
        {
          text: '30d',
          resolution: '240' as ResolutionString,
          description: '1 Month'
        }
      ],
      interval: '60' as ResolutionString,
      container: chartContainerRef.current,
      library_path: '/charting_library/',
      locale: 'en',
      disabled_features: [
        'header_symbol_search',
        'header_compare',
        'header_saveload'
      ],
      enabled_features: ['study_templates'],
      charts_storage_url: 'https://saveload.tradingview.com',
      charts_storage_api_version: '1.1',
      client_id: 'tradingview.com',
      user_id: 'public_user_id',
      fullscreen: false,
      autosize: false,
      theme: isLight ? 'light' : 'dark',
      custom_formatters: {
        priceFormatterFactory: (
          symbolInfo: LibrarySymbolInfo | null,
          minTick: string
        ): IPriceFormatter => {
          const priceFormatter =
            tvWidgetRef.current.activeChart().priceFormatter;
          return {
            format: (price: number) => {
              return formatNumberWithSubscriptZeros(price, 4);
            }
          };
        }
      }
      // toolbar_bg: getComputedStyle(document.documentElement).getPropertyValue(
      //   '--main-bg'
      // )
      // custom_css_url: 'src/assets/css/tradingview.css'
    };

    const tvWidget = new widget(widgetOptions);
    tvWidgetRef.current = tvWidget;

    tvWidget.onChartReady(() => {
      tvWidget.applyOverrides({
        'paneProperties.backgroundType': 'solid',
        'paneProperties.background': isLight ? '#f5f5f5' : '#131722'
      });
      const from = Date.now() - 30 * ONE_DAY;
      const to = new Date().getTime();
      tvWidget
        .activeChart()
        .setVisibleRange({ from, to }, { percentRightMargin: 20 })
        .then(() => console.log('New visible range is applied'));
      setWidgetLoading(false);
    });
    return () => {
      tvWidget.remove();
    };
  }, [symbol]);

  useEffect(() => {
    if (widgetLoading) return;
    tvWidgetRef.current.applyOverrides({
      'paneProperties.background': isLight ? '#f5f5f5' : '#131722'
    });
    tvWidgetRef.current.changeTheme(isLight ? 'light' : 'dark');
  }, [isLight]);

  const token0Address = getWmasIfMas(token0 || MASSA).address;
  const token1Address = getWmasIfMas(token1 || MASSA).address;
  const { data: dataProBanner } = trpc.getProBanner24H.useQuery(
    {
      poolAddress: enabledCombinedPrice ? undefined : pairAddress,
      poolAddresses: props.pairAddresses,
      token0Address,
      token1Address
    },
    { enabled: !!pairAddress }
  );
  const userSwaps = trpc.getRecentSwapsTokens.useQuery({
    userAddress: connected ? connectedAddress : undefined,
    token0Address,
    token1Address,
    take: 100
  });
  // TODO: draw on chart

  const { priceChange, pricePctChange } = dataProBanner || {};

  // if (!token0 || !token1)
  //   return <div className='info_no_currencies'>No currencies selected</div>;
  // if (loading)
  //   return (
  //     <div className='info_no_currencies'>
  //       <Skeleton style={{ width: '100%', height: '100%' }} />
  //     </div>
  //   );
  // if (!symbol)
  //   return (
  //     <div className='info_no_currencies'>No data available for this pair</div>
  //   );

  return (
    <>
      <div className='banner-info-container'>
        <div className='banner-info-pair'>
          <div>
            <span>24h Change</span>
            {priceChange !== undefined &&
            pricePctChange !== undefined &&
            priceChange !== null &&
            pricePctChange !== null ? (
              <span
                className={
                  priceChange > 0
                    ? 'green-span'
                    : priceChange < 0
                      ? 'red-span'
                      : ''
                }
              >
                {priceChange === 0
                  ? '0'
                  : formatNumberWithSubscriptZeros(priceChange, 2)}{' '}
                ({pricePctChange > 0 && '+'}
                {pricePctChange === 0 ? '0' : (pricePctChange * 100).toFixed(1)}
                %)
              </span>
            ) : (
              <Skeleton style={{ width: '5ch' }} />
            )}
          </div>
          {[dataProBanner?.high, dataProBanner?.low].map((price, index) => (
            <div key={index}>
              <span>{index === 0 ? '24h High' : '24h Low'}</span>
              {price !== undefined && price !== null ? (
                <span>
                  {price === 0
                    ? '0'
                    : formatNumberWithSubscriptZeros(
                        price,
                        price > 1000 ? 1 : 4
                      )}{' '}
                  {token1?.symbol}/{token0?.symbol}
                </span>
              ) : (
                <Skeleton style={{ width: '5ch' }} />
              )}
            </div>
          ))}
          {[dataProBanner?.usdVolumeToken0, dataProBanner?.usdVolumeToken1].map(
            (data, index) => (
              <div key={index}>
                <span>
                  24h Volume ({index === 0 ? token0?.symbol : token1?.symbol})
                </span>
                {data?.usdVolume !== undefined ? (
                  <span
                    className={
                      data.usdVolumePctChange > 0
                        ? 'green-span'
                        : data.usdVolumePctChange < 0
                          ? 'red-span'
                          : ''
                    }
                  >
                    ${printUSD(data.usdVolume, false)} (
                    {data.usdVolumePctChange > 0 && '+'}
                    {data.usdVolumePctChange.toFixed(1)}
                    %)
                  </span>
                ) : (
                  <Skeleton style={{ width: '5ch' }} />
                )}
              </div>
            )
          )}
        </div>
      </div>
      <div ref={chartContainerRef} className='TradingViewContainer' />
    </>
  );
};

export default TradingViewContainer;
