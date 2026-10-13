import { useContext, useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip,
  TooltipProps,
  ReferenceLine
} from 'recharts';
import {
  ValueType,
  NameType
} from 'recharts/types/component/DefaultTooltipContent';
import { PoolContext } from 'pages/Pool';
import {
  formatNumberWithSubscriptZeros,
  getPriceFromId,
  printBigintIsh,
  toFraction
} from 'utils/methods';
import { Bin, Token } from 'utils/types';
import './index.scss';

const token0Color = '#1C9D78';
const token1Color = '#783BEC';

interface LiquidityBarProps {
  bins: Bin[];
  aspect?: number;
  batchSelected?: number[];
  activeBinDisplay?: boolean;
  // Optional props with fallback to context
  token0?: Token;
  token1?: Token;
  binStep?: number;
  activeId?: number;
  invertPrice?: boolean;
}

const LiquidityBars = ({
  bins,
  aspect = 1,
  batchSelected = undefined,
  activeBinDisplay = false,
  token0: propToken0,
  token1: propToken1,
  binStep: propBinStep,
  activeId: propActiveId,
  invertPrice: propInvertPrice
}: LiquidityBarProps) => {
  const poolContext = useContext(PoolContext);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  // Use props if provided, otherwise fall back to context
  const token0 = propToken0 ?? poolContext.token0;
  const token1 = propToken1 ?? poolContext.token1;
  const binStep = propBinStep ?? poolContext.binStep;
  const activeId = propActiveId ?? poolContext.activeId;
  const invertPrice = propInvertPrice ?? poolContext.invertPrice;

  // Validate required data
  if (!token0 || !token1 || binStep === undefined) {
    console.error('LiquidityBars: token0, token1, and binStep are required');
    return null;
  }

  const getPrice = (id: number) => {
    const adjustedPrice =
      getPriceFromId(id, binStep) * 10 ** (token0.decimals - token1.decimals);
    return invertPrice ? adjustedPrice : 1 / adjustedPrice;
  };
  const price =
    getPriceFromId(activeId || 1, binStep) *
    10 ** (token0.decimals - token1.decimals);

  const token0ColorHover = '#a2fde3';
  const token1ColorHover = '#b69be8';
  const token0ColorTransp = '#1C9D7876';
  const token1ColorTransp = '#783BEC76';

  const activeBin = bins.find((bin) => bin.id === activeId);
  const shareToken0 = new TokenAmount(token0, activeBin?.amount0 || 0n);
  const shareToken1 = new TokenAmount(token1, activeBin?.amount1 || 0n);
  const shareToken0Adjusted = shareToken0.multiply(toFraction(price));

  const denominator = shareToken0Adjusted.add(shareToken1) || 1n;
  const limit =
    Number(
      shareToken0Adjusted
        .divide(denominator.equalTo(0n) ? 1n : denominator)
        .toFixed(2)
    ) * 100;

  const formatTick = (t: number) => {
    const p = getPrice(t);
    return formatNumberWithSubscriptZeros(p, p < 1 ? 5 : 4);
  };

  return (
    <div className='LiquidityBars'>
      <div className='liquidity-section'>
        <div className='symbols-with-colors'>
          <div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: token0Color
              }}
              className='color-dot'
            ></div>
            <span>{token0.symbol}</span>
          </div>
          <div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: token1Color
              }}
              className='color-dot'
            ></div>
            <span>{token1.symbol}</span>
          </div>
        </div>
      </div>
      {activeBinDisplay && (
        <div className='liquidity-section'>
          Active Bin:{' '}
          {formatNumberWithSubscriptZeros(
            invertPrice ? price : 1 / price,
            price < 1 ? 5 : 4
          )}{' '}
          {invertPrice
            ? `${token0.symbol} / ${token1.symbol}`
            : `${token1.symbol} / ${token0.symbol}`}
        </div>
      )}
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
            <linearGradient id='activeIdColor' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={token0Color} stopOpacity={0.9} />
              <stop
                offset={`${limit}%`}
                stopColor={token0Color}
                stopOpacity={0.1}
              />

              <stop
                offset={`${limit}%`}
                stopColor={token1Color}
                stopOpacity={0.9}
              />
              <stop offset='95%' stopColor={token1Color} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id='activeIdColorHover' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor={token0ColorHover}
                stopOpacity={0.9}
              />
              <stop
                offset={`${limit}%`}
                stopColor={token0ColorHover}
                stopOpacity={0.1}
              />

              <stop
                offset={`${limit}%`}
                stopColor={token1ColorHover}
                stopOpacity={0.9}
              />
              <stop
                offset='95%'
                stopColor={token1ColorHover}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id='token0ColorTransp' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor={token0ColorTransp}
                stopOpacity={0.9}
              />
              <stop
                offset='95%'
                stopColor={token0ColorTransp}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id='token1ColorTransp' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor={token1ColorTransp}
                stopOpacity={0.9}
              />
              <stop
                offset='95%'
                stopColor={token1ColorTransp}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient
              id='activeIdColorTransp'
              x1='0'
              y1='0'
              x2='0'
              y2='1'
            >
              <stop
                offset='0%'
                stopColor={token0ColorTransp}
                stopOpacity={0.9}
              />
              <stop
                offset={`${limit}%`}
                stopColor={token0ColorTransp}
                stopOpacity={0.1}
              />

              <stop
                offset={`${limit}%`}
                stopColor={token1ColorTransp}
                stopOpacity={0.9}
              />
              <stop
                offset='95%'
                stopColor={token1ColorTransp}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>

          <Bar
            radius={5}
            dataKey='value'
            onMouseEnter={(_data, index) => setHoveredBin(index)}
            onMouseLeave={() => setHoveredBin(null)}
          >
            <ReferenceLine
              x={activeId}
              stroke='blue'
              strokeDasharray='4 4'
              label='Center'
            />
            {bins.map((entry, index) => {
              const noAmount0 = entry.amount0 === 0n;
              const noAmount1 = entry.amount1 === 0n;
              const isActiveId = !noAmount0 && !noAmount1;
              const id = entry.id;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === hoveredBin
                      ? isActiveId
                        ? 'url(#activeIdColorHover)'
                        : noAmount0
                          ? 'url(#token1ColorHover)'
                          : 'url(#token0ColorHover)'
                      : isActiveId
                        ? !batchSelected
                          ? 'url(#activeIdColor)'
                          : batchSelected.includes(id)
                            ? 'url(#activeIdColor)'
                            : 'url(#activeIdColorTransp)'
                        : noAmount0
                          ? !batchSelected
                            ? 'url(#token1Color)'
                            : batchSelected.includes(id)
                              ? 'url(#token1Color)'
                              : 'url(#token1ColorTransp)'
                          : !batchSelected
                            ? 'url(#token0Color)'
                            : batchSelected.includes(id)
                              ? 'url(#token0Color)'
                              : 'url(#token0ColorTransp)'
                  }
                />
              );
            })}
          </Bar>

          <XAxis
            dataKey='id'
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

export default LiquidityBars;

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
    const bin = payload[0].payload as Bin;

    const price = invertPrice ? priceAdjusted : 1 / priceAdjusted;

    return (
      <div className='custom-recharts-tooltip'>
        <div className='tooltip-element'>
          <span className='tooltip-element-label'>
            Price (
            {invertPrice
              ? `${token0.symbol} / ${token1.symbol}`
              : `${token1.symbol} / ${token0.symbol}`}
            )
          </span>
          <span className='tooltip-element-value'>
            {formatNumberWithSubscriptZeros(price, price < 1 ? 5 : 4)}
          </span>
        </div>
        {[bin.amount0, bin.amount1].map((amount, i) => {
          if (amount === 0n) return;
          const token = i == 0 ? token0 : token1;
          return (
            <div key={i} className='tooltip-element'>
              <span className='tooltip-element-label'>{token.symbol}</span>
              <span className='tooltip-element-value'>
                {formatNumberWithSubscriptZeros(
                  printBigintIsh(token, amount, token.decimals),
                  token.decimals
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};
