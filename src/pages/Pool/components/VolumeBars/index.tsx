import { useContext, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip,
  TooltipProps
} from 'recharts';
import {
  ValueType,
  NameType
} from 'recharts/types/component/DefaultTooltipContent';
import { PoolContext } from 'pages/Pool';
import {
  formatNumberWithSubscriptZeros,
  getPriceFromId,
  printUSD
} from 'utils/methods';
import { TradedBin } from 'utils/trpc';
import { Token } from 'utils/types';
import './../LiquidityBars/index.scss';

const token0Color = '#1C9D78';
const token1Color = '#783BEC';

interface LiquidityBarProps {
  bins: TradedBin[];
  aspect?: number;
}

const VolumeBars = ({ bins, aspect = 1 }: LiquidityBarProps) => {
  const getPrice = (id: number) => {
    const adjustedPrice =
      getPriceFromId(id, binStep) * 10 ** (token0.decimals - token1.decimals);
    return invertPrice ? adjustedPrice : 1 / adjustedPrice;
  };

  const { token0, token1, binStep, activeId, invertPrice } =
    useContext(PoolContext);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  const token0ColorHover = '#a2fde3';
  const token1ColorHover = '#b69be8';

  const formatTick = (t: number) => {
    const p = getPrice(t);
    return formatNumberWithSubscriptZeros(p, p < 1 ? 5 : 4);
  };

  return (
    <div className='VolumeBars LiquidityBars'>
      <ResponsiveContainer aspect={aspect}>
        <BarChart data={bins}>
          <defs>
            <linearGradient id='token0Color' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={token0Color} stopOpacity={0.9} />
              <stop offset='95%' stopColor={token0Color} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id='token1Color' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={token1Color} stopOpacity={0.9} />
              <stop offset='95%' stopColor={token1Color} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id='token0ColorHover' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor={token0ColorHover}
                stopOpacity={0.9}
              />
              <stop
                offset='95%'
                stopColor={token0ColorHover}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id='token1ColorHover' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor={token1ColorHover}
                stopOpacity={0.9}
              />
              <stop
                offset='95%'
                stopColor={token1ColorHover}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>

          <Bar
            radius={5}
            dataKey='volumeUsd'
            onMouseEnter={(_data, index) => setHoveredBin(index)}
            onMouseLeave={() => setHoveredBin(null)}
          >
            {bins.map((entry, index) => {
              const isActiveId = entry.binId === activeId;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === hoveredBin
                      ? isActiveId
                        ? 'url(#token1ColorHover)'
                        : 'url(#token0ColorHover)'
                      : isActiveId
                        ? 'url(#token1Color)'
                        : 'url(#token0Color)'
                  }
                />
              );
            })}
          </Bar>

          <XAxis
            dataKey='binId'
            axisLine={false}
            tickLine={false}
            tickFormatter={formatTick}
            minTickGap={5}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            position={{ y: 50 }}
            content={
              <CustomTooltip
                token0={token0}
                token1={token1}
                binStep={binStep}
                invertPrice={invertPrice}
              />
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VolumeBars;

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  token0: Token;
  token1: Token;
  binStep: number;
  invertPrice: boolean;
}

const CustomTooltip = ({
  token0,
  token1,
  binStep,
  invertPrice,
  active,
  payload,
  label
}: CustomTooltipProps) => {
  if (
    payload &&
    payload
      .map((pld) => pld.value)
      .reduce((a, b) => Number(a) + Number(b), 0) == 0
  )
    return null;

  if (active && payload && payload.length && label) {
    const id = parseInt(label);
    const priceAdjusted =
      getPriceFromId(id, binStep) * 10 ** (token0.decimals - token1.decimals);
    const bin = payload[0].payload as TradedBin;

    const price = invertPrice ? priceAdjusted : 1 / priceAdjusted;

    return (
      <div className='custom-recharts-tooltip'>
        <div className='tooltip-element'>
          <span className='tooltip-element-label'>
            Price (
            {invertPrice
              ? `${token1.symbol}/${token0.symbol}`
              : `${token0.symbol}/${token1.symbol}`}
            )
          </span>
          <span className='tooltip-element-value'>
            {formatNumberWithSubscriptZeros(price, price < 1 ? 5 : 4)}
          </span>
        </div>

        <div className='tooltip-element'>
          <span className='tooltip-element-label'>Trade Volume</span>
          <span className='tooltip-element-value'>
            ${printUSD(bin.volumeUsd)}
          </span>
        </div>
      </div>
    );
  }

  return null;
};
