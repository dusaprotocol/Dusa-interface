import { useMemo, useState } from 'react';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import { faChartLine, faDollar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Line
} from 'recharts';
import TimePicker from 'components/TimePicker';
import CustomTooltipComponent from 'components/Tooltip';
import EmptyGraph from 'pages/JELLY/components/Graphs/EmptyGraph';
import {
  formatNumberWithSubscriptZeros,
  parseSlot,
  printDate,
  roundTokenAmount
} from 'utils/methods';
import { dCA } from 'utils/trpc';
import { NumberWindow, Token } from 'utils/types';

interface PerformanceChartProps {
  dcaSelected: dCA;
  tokenIn: Token;
  tokenOut: Token;
}

const PerformanceChart = ({
  dcaSelected,
  tokenIn,
  tokenOut
}: PerformanceChartProps) => {
  const [numberWindow, setNumberWindow] = useState(NumberWindow.MID);
  const [showPerformance, setShowPerformance] = useState(true);
  const [showPrice, setShowPrice] = useState(false);

  const handleChangeChartLine = (line: 'performance' | 'price') => {
    if (line === 'performance') {
      setShowPerformance(!showPerformance);
    } else {
      setShowPrice(!showPrice);
    }
  };

  const calculateCumulativePnlPerExecution = (executions: dCA['execution']) => {
    let cumulativeQtyOut = 0;
    let cumulativeCostUSD = 0;

    return executions.map((exec) => {
      const qtyIn = roundTokenAmount(tokenIn, exec.amountIn);
      const qtyOut = roundTokenAmount(tokenOut, exec.amountOut);

      const costUSD = qtyIn * exec.tokenInValue;
      cumulativeCostUSD += costUSD;

      const priceAtExec = costUSD / qtyOut;

      cumulativeQtyOut += qtyOut;

      const valueUSD = cumulativeQtyOut * priceAtExec;

      const pnlPercentage =
        ((valueUSD - cumulativeCostUSD) / cumulativeCostUSD) * 100;

      const priceToken = qtyIn / qtyOut;

      return {
        date: parseSlot(exec.thread, exec.period),
        price: priceToken,
        pnlPercentage
      };
    });
  };

  const getDomainAxis = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const padding = (max - min) * 0.1; // 10% padding
    return [min - padding, max + padding];
  };

  const { data: chartData, pnLdomain } = useMemo(() => {
    const executions = dcaSelected.execution.sort(
      (a, b) => parseSlot(a.thread, a.period) - parseSlot(b.thread, b.period)
    );
    const length = executions.length;
    const start =
      length - Number(numberWindow) < 0 ? 0 : length - Number(numberWindow);
    const data =
      length > 0
        ? calculateCumulativePnlPerExecution(executions).slice(start)
        : [];

    const domainPnL = getDomainAxis(data.map((d) => d.pnlPercentage));

    return { data, pnLdomain: domainPnL };
  }, [dcaSelected.id, dcaSelected.execution.length, numberWindow]);

  return (
    <div className='flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--container-bg)]'>
      <div className='flex flex-col gap-4 p-4'>
        <div className='flex items-center gap-2'>
          <span className='whitespace-nowrap text-xl'>Performance graph</span>
          <CustomTooltipComponent
            trigger={
              <FontAwesomeIcon
                icon={faQuestionCircle}
                className='flex items-center text-xl'
              />
            }
            position='right'
          >
            <span>
              Indicates the DCA performance since the start (taking into account
              the deferred call fees).
            </span>
          </CustomTooltipComponent>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='chart-header-left'>
            <div className='flex items-center gap-4'>
              <div
                onClick={() => handleChangeChartLine('performance')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 cursor-pointer border border-[#39b47088] rounded-lg',
                  showPerformance &&
                    'bg-gradient-to-r from-[#279c5cc5] to-[#39b470] '
                )}
              >
                <FontAwesomeIcon icon={faChartLine} />
                <span className='perf-span'>Performance</span>
              </div>
              <div
                onClick={() => handleChangeChartLine('price')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 cursor-pointer border border-[#706cbb88] rounded-lg',
                  showPrice &&
                    'bg-gradient-to-r from-[#5550afc5] to-[#706cbb] rounded-lg'
                )}
              >
                <FontAwesomeIcon icon={faDollar} />
                <span className='price-span'>Price</span>
              </div>
            </div>
          </div>
          <TimePicker
            timeWindow={numberWindow}
            setTimeWindow={setNumberWindow}
            values={[NumberWindow.BASE, NumberWindow.MID, NumberWindow.ALL]}
          />
        </div>
      </div>
      {showPerformance || showPrice ? (
        <ResponsiveContainer height={300}>
          <LineChart data={chartData} margin={{ top: 10, bottom: 10 }}>
            <XAxis
              dataKey='date'
              tickFormatter={(date) =>
                printDate(new Date(date), NumberWindow.ALL)
              }
            />
            <YAxis
              yAxisId='left'
              domain={pnLdomain}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
              fontSize={12}
              tick={{ fill: '#39b470' }}
              visibility={!showPerformance ? 'hidden' : 'visible'}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={['auto', 'auto']}
              tickFormatter={(value) =>
                formatNumberWithSubscriptZeros(value, 4)
              }
              fontSize={12}
              tick={{ fill: '#8884d8' }}
              visibility={!showPrice ? 'hidden' : 'visible'}
            />
            <Tooltip
              content={
                <CustomTooltip
                  showPerformance={showPerformance}
                  showPrice={showPrice}
                />
              }
            />
            <Line
              yAxisId='left'
              type='monotone'
              dataKey='pnlPercentage'
              stroke='#39b470'
              dot={false}
              activeDot={{ r: showPerformance ? 6 : 0 }}
              isAnimationActive={false}
              visibility={!showPerformance ? 'hidden' : 'visible'}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='price'
              stroke='#8884d8'
              dot={false}
              activeDot={{ r: showPrice ? 6 : 0 }}
              isAnimationActive={false}
              visibility={!showPrice ? 'hidden' : 'visible'}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyGraph text='No data displayed' isLine />
      )}
    </div>
  );
};

export default PerformanceChart;

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({
  active,
  payload,
  showPerformance,
  showPrice
}: CustomTooltipProps & { showPerformance: boolean; showPrice: boolean }) => {
  if (!active || !payload || !payload.length) return null;
  const { date, pnlPercentage, price } = payload[0].payload;

  return (
    <div className='custom-recharts-tooltip'>
      <div className='tooltip-element'>
        {showPerformance && (
          <>
            <span className='tooltip-element-label perf-span'>Performance</span>
            <div className='tooltip-element-value'>
              <span className='perf-span'>
                {formatNumberWithSubscriptZeros(pnlPercentage, 4)}%
              </span>
            </div>
          </>
        )}
        {showPrice && (
          <>
            <span className='tooltip-element-label price-span'>Price</span>
            <div className='tooltip-element-value'>
              <span className='price-span'>
                {formatNumberWithSubscriptZeros(price, 4)}
              </span>
            </div>
          </>
        )}
        <span className='tooltip-element-label'>Date</span>
        <div className='tooltip-element-value'>
          <span>{printDate(date)}</span>
        </div>
      </div>
    </div>
  );
};
