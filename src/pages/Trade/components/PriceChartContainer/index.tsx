import { useContext, useEffect, useState } from 'react';
import { faRightLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SerializeObject } from '@trpc/server/shared';
import Spinner from 'components/Spinner';
import TimePicker from 'components/TimePicker';
import { TradeContext } from 'pages/Trade';
import {
  formatNumberWithSubscriptZeros,
  printDate,
  round
} from 'utils/methods';
import { Price, trpc } from 'utils/trpc';
import { Pool, TimeWindow } from 'utils/types';
import PriceChart from '../PriceChart';
import './index.scss';

type PriceChartContainerProps = {
  pools: Pool[];
  pairAddresses: string[];
};

// make all props optional while maintaining their relationship
// type Props = PriceChartContainerProps | Record<string, never>;

const PriceChartContainer = (props: PriceChartContainerProps) => {
  const [invertDisplayOrder, setInvertDisplayOrder] = useState(false);
  const [timeWindow, setTimeWindow] = useState(TimeWindow.Day);
  const [hoverValue, setHoverValue] = useState(0);
  const [hoverDate, setHoverDate] = useState(printDate(new Date()));
  const [data, setData] = useState<SerializeObject<Price>[]>();

  const { token0, token1, pairAddress, displayChart, loading } =
    useContext(TradeContext);
  const invertPrice = !!(token0 && token1)
    ? token0.address < token1.address
    : false;

  const tokenX = invertDisplayOrder ? token1 : token0;
  const tokenY = invertDisplayOrder ? token0 : token1;

  const enabledCombinedPrice = props.pairAddresses.length > 1;

  const poolAddress = props.pairAddresses.at(0) || pairAddress;
  const getPriceQuery = trpc.getPrice.useQuery(
    { poolAddress, take: timeWindow },
    { enabled: !!poolAddress && !enabledCombinedPrice }
  );
  const getCombinedPriceQuery = trpc.getCombinedPrice.useQuery(
    { poolAddresses: props.pairAddresses || [], take: timeWindow },
    { enabled: enabledCombinedPrice }
  );

  useEffect(() => {
    const d = getPriceQuery.data || getCombinedPriceQuery.data;
    if (!d) return;
    const xor =
      (invertPrice && !invertDisplayOrder) ||
      (!invertPrice && invertDisplayOrder);
    setData(xor ? handleInvertData(d) : d);
  }, [getPriceQuery.data, getCombinedPriceQuery.data]);

  // useEffect(() => {
  //   const xor =
  //     (invertPrice && !invertDisplayOrder) ||
  //     (!invertPrice && invertDisplayOrder);
  //   setData(
  //     xor
  //       ? handleInvertData(getCombinedPriceQuery.data)
  //       : getCombinedPriceQuery.data
  //   );
  // }, []);

  useEffect(() => {
    if (data) setData((prev) => handleInvertData(prev));
  }, [invertDisplayOrder, invertPrice]);

  useEffect(() => {
    if (!data?.length) return;

    const newPrice = data[data.length - 1].close;
    setHoverValue(newPrice);
  }, [data]);

  const handleInvertData = (prevData: SerializeObject<Price>[] | undefined) =>
    prevData &&
    prevData.map((d) => ({
      ...d,
      close: 1 / d.close,
      open: 1 / d.open,
      high: 1 / d.high,
      low: 1 / d.low
    }));

  const originalPrice = data?.length ? data[0].close : 0;
  const newPrice = data?.length ? data[data.length - 1].close : 0;
  const difference =
    originalPrice > newPrice
      ? originalPrice - newPrice
      : newPrice - originalPrice;
  const change = newPrice - originalPrice;
  const changePercentage = (difference / originalPrice) * 100;

  const trpcLoading =
    (!enabledCombinedPrice && getPriceQuery.isLoading) ||
    (enabledCombinedPrice && getCombinedPriceQuery.isLoading);

  if (!tokenX || !tokenY)
    return <div className='info_no_currencies'>No currencies selected</div>;
  if (loading || trpcLoading) return <Spinner />;
  if (!enabledCombinedPrice && !pairAddress)
    return (
      <div className='info_no_currencies'>No data available for this pair</div>
    );
  const error = getPriceQuery.error || getCombinedPriceQuery.error;
  if (error || !data || !data.length) return null;

  return (
    <div
      className='PriceChartContainer'
      style={{ display: displayChart ? 'block' : 'none' }}
    >
      <div
        className={`PriceChart-info ${change > 0 ? 'positive' : 'negative'}`}
      >
        <div className='token-pair'>
          <div>
            <img src={tokenX.logoURI} alt='token-logo' />
            <div>{tokenX.symbol}</div>
            <span>/</span>
            <img src={tokenY.logoURI} alt='token-logo' />
            <div>{tokenY.symbol}</div>
          </div>
          <FontAwesomeIcon
            icon={faRightLeft}
            onClick={() => setInvertDisplayOrder((prev: boolean) => !prev)}
          />
        </div>
        <div className='tokens-price'>
          <div className='value'>
            {formatNumberWithSubscriptZeros(hoverValue, 2)}
          </div>
          {!!(change && changePercentage) && (
            <div className='price-variation'>
              {change > 0 ? '+' : ''}
              {formatNumberWithSubscriptZeros(change, 2)} (
              {change > 0 ? '+' : '-'}
              {round(changePercentage, 1)}%)
            </div>
          )}
        </div>
        <div className='time'>
          <div className='date'>{hoverDate}</div>
          <TimePicker
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
            values={[TimeWindow.Day, TimeWindow.Week, TimeWindow.Month]}
          />
        </div>
      </div>
      <PriceChart
        data={data || []}
        timeWindow={timeWindow}
        setHoverDate={setHoverDate}
        setHoverValue={setHoverValue}
        positive={change >= 0}
      />
    </div>
  );
};

export default PriceChartContainer;
