import React, { useContext, useState } from 'react';
import { IFactory, TokenAmount } from '@dusalabs/sdk';
import { faMinus, faPlus, faSync } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CopyIcon from 'components/CopyIcon';
import LinkIcon from 'components/LinkIcon';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import TimePicker from 'components/TimePicker';
import { SimpleTooltip } from 'components/Tooltip';
import useResizeWindow from 'hooks/useResizeWindow';
import { PoolContext, PoolContextProps } from 'pages/Pool';
import { FEATURE_FLAGS, factorySC, factoryV2SC } from 'utils/config';
import { currentEpoch } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchBins,
  fetchDepth,
  fetchPairFeeParameters
} from 'utils/datastoreFetcher';
import {
  binStepToDepth,
  buildExplorerLink,
  isInDusaSeason,
  printAddress,
  printBigintIsh,
  printUSD,
  round,
  toFraction,
  transformBins
} from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import { queryKeys, trpc } from 'utils/trpc';
import { Bin, DayWindow, TimeWindow } from 'utils/types';
import { baseClient } from 'utils/w3';
import { Chart } from '../Chart';
import LiquidityBars from '../LiquidityBars';
import { LiquidityTable, SwapTable } from '../OperationTable';
import VolumeBars from '../VolumeBars';
import './index.scss';

dayjs.extend(relativeTime);

const Analytics = () => {
  const [timeWindowTVL, setTimeWindowTVL] = useState(DayWindow.WEEK);
  const [timeWindowVolume, setTimeWindowVolume] = useState(DayWindow.WEEK);

  const poolContext = useContext(PoolContext);
  const {
    loading: loadingContext,
    invertPrice,
    token0,
    token1,
    binStep,
    pairAddress,
    activeId,
    rewardData,
    airdropData,
    tvl,
    tokenReserves,
    actualTVL
  } = poolContext;

  const poolAddress = pairAddress || '';

  const depth2PercQuery = useQuery(
    ['depth2Perc', poolAddress],
    () => fetchDepth(poolAddress, binStep, activeId || 0, 200),
    { enabled: !!poolAddress && !!binStep && !!activeId }
  );
  const depth2Perc = depth2PercQuery.data;

  const queryParameters = { poolAddress, take: 10 };
  const queryOptions = {
    enabled: !!poolAddress
  };

  const swaps = trpc.getRecentSwaps.useQuery(queryParameters, queryOptions);
  const liq = trpc.getRecentLiquidity.useQuery(queryParameters, queryOptions);
  const { data: _24h } = trpc.get24H.useQuery(poolAddress, queryOptions);

  const emissions = trpc.getEmissions.useQuery({
    poolAddress,
    epoch: currentEpoch.id
  });
  const weeklyEmissions = BigInt(emissions.data || '0');

  const volumeData = trpc.getVolume.useQuery(
    { address: poolAddress, take: timeWindowVolume },
    queryOptions
  );
  const tvlData = trpc.getTVL.useQuery(
    { address: poolAddress, take: timeWindowTVL },
    queryOptions
  );

  const dusaValueQuery = trpc.getTokenValue.useQuery({
    tokenAddress: DUSA_MAIN.address,
    tokenDecimals: DUSA_MAIN.decimals
  });
  const dusaValue = dusaValueQuery.data || 0;

  const annualizedFees = (_24h?.fees || 0) * 365;

  const annualizedEmissionsUsd = Number(
    new TokenAmount(DUSA_MAIN, weeklyEmissions * 52n)
      .multiply(toFraction(dusaValue))
      .toFixed(2)
  );

  const baseAPR = (annualizedEmissionsUsd * 100) / actualTVL;
  const DEPTH = binStep ? binStepToDepth(binStep) : 0;

  const isDusaSeasonActive = isInDusaSeason();

  if (loadingContext) return <Spinner />;

  return (
    <div className='analytics'>
      <section className='stats'>
        {[
          {
            title: (
              <SimpleTooltip
                title='APR'
                description={`APR is based on $DUSA emissions voted by stakers and TVL within +/- ${DEPTH / 100}% depth.`}
                position='top'
              />
            ),
            value: !!baseAPR ? round(baseAPR).toLocaleString() + '%' : undefined
          },

          {
            title: (
              <SimpleTooltip
                title='Liquidity'
                description={`$${printUSD(actualTVL, false)} within +/- ${DEPTH / 100}% depth`}
                position='top'
              />
            ),
            value: tvl ? '$' + printUSD(tvl, false) : undefined
          },
          {
            title: '$DUSA Emissions (7D)',
            value:
              weeklyEmissions !== undefined
                ? printBigintIsh(DUSA_MAIN, weeklyEmissions) + ' DUSA'
                : undefined
          },
          {
            title: 'Volume (24H)',
            value: _24h ? '$' + printUSD(_24h.volume, false) : undefined,
            change: _24h?.volumePctChange || 0
          },
          {
            title: 'Fees (24H)',
            value: _24h ? '$' + printUSD(_24h.fees) : undefined,
            change: _24h?.feesPctChange || 0
          },
          {
            title: `${token0.symbol} Reserves`,
            value:
              tokenReserves &&
              `${printBigintIsh(token0, tokenReserves[0])} ${token0.symbol}`
          },
          {
            title: `${token1.symbol} Reserves`,
            value:
              tokenReserves &&
              `${printBigintIsh(token1, tokenReserves[1])} ${token1.symbol}`
          },
          {
            title: '+2% depth',
            value:
              depth2Perc &&
              `${printBigintIsh(token0, depth2Perc.reservesX)} ${token0.symbol}`
          },
          {
            title: '-2% depth',
            value:
              depth2Perc &&
              `${printBigintIsh(token1, depth2Perc.reservesY)} ${token1.symbol}`
          }
        ].map((stat, i) => (
          <Stat key={i} {...stat} />
        ))}
        {FEATURE_FLAGS.REWARDS && rewardData && tvl ? (
          <Stat
            title='Incentives APR'
            value={round(rewardData.apr).toLocaleString() + '%'}
          />
        ) : null}
        {FEATURE_FLAGS.POINTS_V2 && airdropData && tvl && isDusaSeasonActive ? (
          <Stat
            title='Est. JELLY Rewards APR (7D)'
            value={round(airdropData.apr).toLocaleString() + '%'}
          />
        ) : null}

        {FEATURE_FLAGS.REWARDS &&
        rewardData &&
        FEATURE_FLAGS.POINTS_V2 &&
        airdropData &&
        tvl ? (
          <Stat
            title='Total APR'
            value={
              round(
                baseAPR +
                  rewardData.apr +
                  (isDusaSeasonActive ? airdropData.apr : 0)
              ).toLocaleString() + '%'
            }
          />
        ) : null}
      </section>
      <section>
        <PoolInfo />
      </section>
      <section>
        <PoolDistribution />
      </section>
      <section>
        <BinsTraded />
      </section>
      <section>
        <Chart
          isVolume={true}
          timeWindow={timeWindowVolume}
          setTimeWindow={setTimeWindowVolume}
          {...volumeData}
        />
        <section>
          <Chart
            isVolume={false}
            timeWindow={timeWindowTVL}
            setTimeWindow={setTimeWindowTVL}
            {...tvlData}
          />
        </section>
      </section>

      <SwapTable {...swaps} invertPrice={invertPrice} />
      <LiquidityTable {...liq} invertPrice={invertPrice} />
    </div>
  );
};

export default Analytics;

interface StatProps {
  title: string | JSX.Element;
  value?: string;
  change?: number;
}

const Stat = (stat: StatProps) => {
  return (
    <div className='stat'>
      <div className='stat-title'>{stat.title}</div>
      <div className='stat-values'>
        {!stat.value ? (
          <Skeleton style={{ width: '10ch' }} />
        ) : (
          <>
            <div className='stat-value'>{stat.value}</div>
            {stat.change ? (
              <div
                className={`stat-change ${
                  stat.change > 0 ? 'positive' : 'negative'
                }`}
              >
                {round(stat.change)}%
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

const PoolInfo = () => {
  const { token0, token1, pairAddress, binStep, version } =
    useContext(PoolContext);
  const opts = { enabled: !!pairAddress };
  const { data: feeParameters } = useQuery(
    [queryKeys.feeParameters, pairAddress],
    () => fetchPairFeeParameters(pairAddress || ''),
    opts
  );
  const { innerWidth: windowWidth } = useResizeWindow();

  const tokenA = getWmasIfMas(token0);
  const tokenB = getWmasIfMas(token1);

  const { data: ignoredForRouting } = useQuery(
    ['ignoredForRouting'],
    () =>
      new IFactory(version === 'V1' ? factorySC : factoryV2SC, baseClient)
        .getLBPairInformation(tokenA.address, tokenB.address, binStep)
        .then((r) => r.isBlacklisted),
    opts
  );

  if (!pairAddress) return null;
  if (!feeParameters) return null;

  const baseFee =
    (feeParameters.baseFactor * feeParameters.binStep) / 1_000_000;
  const maxVariableFee =
    (feeParameters.variableFeeControl *
      (feeParameters.maxVolatilityAccumulated * feeParameters.binStep) ** 2) /
    10 ** 18;

  return (
    <div className='PoolInfo'>
      {[
        { name: tokenA.symbol, address: tokenA.address },
        { name: tokenB.symbol, address: tokenB.address },
        { name: 'Pool', address: pairAddress }
      ].map((item) => (
        <div key={item.address} className='pool-info-container'>
          <span className='pool-info-name'>{item.name}</span>
          <div className='pool-info-content'>
            <span>
              {windowWidth < 700 ? printAddress(item.address) : item.address}
            </span>
            <span className='icons'>
              <CopyIcon text={item.address} />
              <LinkIcon
                link={buildExplorerLink(item.address)}
                external={true}
              />
            </span>
          </div>
        </div>
      ))}
      {[
        { name: 'Bin step', text: feeParameters.binStep + 'bps' },
        { name: 'Pool version', text: version },
        {
          name: 'Fee',
          text: `Base: ${baseFee}%, Max: ${baseFee + maxVariableFee}%`
        },
        {
          name: 'Protocol share',
          text: feeParameters.protocolShare / 100 + '%'
        },
        {
          name: 'Ignored for routing',
          text: ignoredForRouting ? ignoredForRouting.toString() : undefined // only display if true
        }
      ].map((item, i) => (
        <React.Fragment key={i}>
          {item.text === undefined ? null : (
            <div className='pool-info-container'>
              <>
                <span className='pool-info-name'>{item.name}</span>
                <div className='pool-info-content'>
                  <span>{item.text}</span>
                </div>
              </>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const PoolDistribution = () => {
  const INITIAL_FETCH_RADIUS = 5; // Fetch 11 bins initially (5 on each side + active)

  const [radius, setRadius] = useState<number>(5); // Display radius (view window)
  const [maxFetchedRadius, setMaxFetchedRadius] =
    useState<number>(INITIAL_FETCH_RADIUS);
  const [binCache, setBinCache] = useState<Bin[]>([]);

  const context = useContext(PoolContext);
  const pairAddress = context.pairAddress;
  const activeId = context.activeId;
  const token0 = context.token0;
  const token1 = context.token1;
  const binStep = context.binStep;

  // Determine if we need to fetch more bins
  const needsMoreBins = radius > maxFetchedRadius * 0.8; // Fetch more when we're at 80% of cached range
  const fetchRadius = needsMoreBins ? radius + 20 : maxFetchedRadius;

  // Create array of bin ids to fetch
  const ids = activeId
    ? Array.from(
        { length: fetchRadius * 2 + 1 },
        (_, i) => activeId - fetchRadius + i
      )
    : undefined;

  const binsQuery = useQuery(
    ['bins', pairAddress, activeId, fetchRadius],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => fetchBins(token0, token1, pairAddress!, ids),
    {
      enabled: !!pairAddress && !!ids && !!activeId,
      // Only refetch when we need more bins
      refetchOnWindowFocus: false,
      staleTime: Infinity
    }
  );

  // Update cache when new bins are fetched
  React.useEffect(() => {
    if (binsQuery.data && binsQuery.data.length > 0) {
      const transformed = transformBins(binsQuery.data, activeId || 0);
      setBinCache(transformed);
      setMaxFetchedRadius(fetchRadius);
    }
  }, [binsQuery.data, activeId, fetchRadius]);

  // Use cached bins for display
  const bins = binCache;
  const nbBins = bins?.length ?? 0;
  const activeBinIndex =
    bins?.findIndex((bin) => bin.id === activeId) ?? Math.floor(nbBins / 2);
  const middle = activeBinIndex;

  const zoomStep = 5;
  const maxRadius = Math.floor(nbBins / 2);
  const disabledZoomIn = radius <= 1;
  const disabledZoomOut = radius >= maxRadius;

  const zoomIn = () => {
    setRadius((prev) => Math.max(1, prev - zoomStep));
  };

  const zoomOut = () => {
    const newRadius = Math.min(maxRadius, radius + zoomStep);
    setRadius(newRadius);

    // Trigger fetch of more bins if needed
    if (newRadius > maxFetchedRadius * 0.8) {
      setMaxFetchedRadius(newRadius + 20);
    }
  };

  return (
    <div className='PoolDistribution'>
      <span className='text-2xl font-bold'>Pool Distribution</span>
      {!bins || bins.length === 0 || activeBinIndex === -1 ? (
        <Spinner />
      ) : bins.filter((bin) => bin.value !== 0).length ? (
        <>
          <LiquidityBars
            aspect={4}
            bins={bins.slice(
              Math.max(0, middle - radius),
              Math.min(bins.length, middle + radius + 1)
            )}
          />
          <div className='zoom-btns'>
            <button
              disabled={disabledZoomOut || binsQuery.isFetching}
              className='zoom-btn'
              onClick={zoomOut}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <button
              disabled={disabledZoomIn || binsQuery.isFetching}
              className='zoom-btn'
              onClick={zoomIn}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              disabled={binsQuery.isRefetching}
              className='zoom-btn'
              onClick={() => binsQuery.refetch()}
            >
              <FontAwesomeIcon icon={faSync} />
            </button>
          </div>
        </>
      ) : (
        <div className='no-data'>
          <p>No data available for this pool.</p>
        </div>
      )}
    </div>
  );
};

const BinsTraded = () => {
  const { pairAddress } = useContext(PoolContext);
  const poolAddress = pairAddress || '';
  const [timeWindow, setTimeWindow] = useState(TimeWindow.Day);
  const { data: bins } = trpc.getBinsTraded.useQuery({
    address: poolAddress,
    take: timeWindow
  });
  const validBins = bins?.filter((bin) => bin.volumeUsd !== 0) ?? [];

  return (
    <div className='BinsTraded ChartContainer'>
      <div className='chart-header'>
        <h2>Bins Traded</h2>
        <TimePicker
          timeWindow={timeWindow}
          setTimeWindow={setTimeWindow}
          values={[TimeWindow.Day, TimeWindow.Week, TimeWindow.Month]}
        />
      </div>
      {!bins ? (
        <Spinner />
      ) : validBins.length ? (
        <>
          <VolumeBars aspect={4} bins={bins} />
        </>
      ) : (
        <div className='no-data'>
          <p>No data available for this pool.</p>
        </div>
      )}
    </div>
  );
};
