import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  TooltipProps
} from 'recharts';
import {
  ValueType,
  NameType
} from 'recharts/types/component/DefaultTooltipContent';
import TimePicker from 'components/TimePicker';
import { SimpleTooltip } from 'components/Tooltip';
import { printDate, printUSD } from 'utils/methods';
import { DayWindow, TimeWindow } from 'utils/types';

interface ChartProps {
  timeWindow: DayWindow;
  setTimeWindow: React.Dispatch<React.SetStateAction<DayWindow>>;
  isVolume: boolean;
  showAxis?: boolean;
  data: any; // TODO
  error: any; // TODO
  isLoading: boolean;
  displayedValue?: number;
}

export const Chart = ({
  data,
  error,
  isLoading,
  isVolume,
  showAxis = true,
  displayedValue,
  timeWindow,
  setTimeWindow
}: ChartProps) => {
  const label = isVolume ? (
    showAxis ? (
      'Volume (1D)'
    ) : (
      <SimpleTooltip
        title='Volume (1D)'
        description='Volume across whitelisted pools over the last 24h'
        position='right'
      />
    )
  ) : (
    'TVL (Total Value Locked)'
  );
  const color =
    isLoading || (data && !data.length) || error
      ? '#010101'
      : isVolume
        ? 'var(--green)'
        : '#E4229A';

  const loadingData = [
    {
      date: '2024-01-31T17:35:00.000Z',
      value: 0
    },
    {
      date: '2024-02-05T23:55:00.000Z',
      value: 1300
    },
    {
      date: '2024-02-06T23:55:00.000Z',
      value: 900
    },
    {
      date: '2024-02-07T10:15:00.000Z',
      value: 1900
    }
  ];

  const wait: boolean = isLoading || (data && !data.length) || !!error;

  return (
    <div className='flex-1 bg-transparent min-w-full ChartContainer'>
      <div className='flex justify-between items-center mb-2 chart-header'>
        <div className='flex flex-col items-baseline gap-3 chart-sub-header'>
          <h2 className='font-semibold text-[var(--second-color)] text-sm leading-8'>
            {label}
          </h2>
          {displayedValue !== undefined ? (
            <h3 className='font-semibold text-lg'>
              ${printUSD(Number(displayedValue), false)}
            </h3>
          ) : null}
        </div>
        {!wait && (
          <TimePicker
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
            values={[
              DayWindow.WEEK,
              DayWindow.MONTH,
              DayWindow.QUARTER
              // DayWindow.HALF_YEAR
            ]}
          />
        )}
      </div>
      {wait ? (
        <ResponsiveContainer aspect={4}>
          <AreaChart
            data={loadingData}
            margin={{
              top: 5,
              right: 0,
              bottom: 5,
              left: 0
            }}
          >
            <defs>
              <linearGradient id='colorLoading' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#010101' stopOpacity={1} />
                <stop offset='75%' stopColor='#101010' stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <Area
              type='linear'
              dataKey='value'
              stroke={color}
              fill='url(#colorLoading)'
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        data && (
          <ResponsiveContainer aspect={4}>
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: showAxis ? 50 : 0,
                bottom: 5,
                left: showAxis ? 50 : 0
              }}
            >
              <defs>
                <linearGradient id='colorVolume' x1='0' y1='0' x2='0' y2='1'>
                  <stop
                    offset='0%'
                    stopColor='var(--green)'
                    stopOpacity={0.4}
                  />
                  <stop
                    offset='75%'
                    stopColor='var(--green)'
                    stopOpacity={0.15}
                  />
                </linearGradient>
                <linearGradient id='colorTVL' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#E4229A' stopOpacity={0.4} />
                  <stop offset='75%' stopColor='#E4229A' stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <Area
                type='monotone'
                dataKey={isVolume ? 'volume' : 'usdLocked'}
                stroke={color}
                fill={isVolume ? 'url(#colorVolume)' : 'url(#colorTVL)'}
              />
              {showAxis ? (
                <>
                  <XAxis
                    dataKey='date'
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(str) =>
                      printDate(new Date(str), timeWindow)
                    }
                  />
                  <YAxis
                    dataKey={isVolume ? 'volume' : 'usdLocked'}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickMargin={2}
                    // unit='$'}
                    tickFormatter={(v: number) => '$' + v.toLocaleString()}
                  />
                </>
              ) : null}
              <Tooltip content={<CustomTooltip isVolume={isVolume} />} />
            </AreaChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  );
};

const CustomTooltip = (
  props: TooltipProps<ValueType, NameType> & { isVolume: boolean }
) => {
  const { active, payload, label, isVolume } = props;
  if (!active || !payload || !payload.length || !label) return null;

  return (
    <div className='custom-recharts-tooltip'>
      <div className='tooltip-element'>
        <span className='tooltip-element-label tooltip-date'>
          {printDate(new Date(payload[0].payload.date), TimeWindow.Month)}
        </span>
      </div>
      {payload[0] && (
        <div className='tooltip-element'>
          <span className='tooltip-element-label'>
            {isVolume ? 'Volume' : 'TVL'}
          </span>
          <span className='tooltip-element-value'>
            ${Number(payload[0].value).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};
