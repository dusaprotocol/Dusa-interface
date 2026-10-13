import React, { useEffect } from 'react';
import { SerializeObject } from '@trpc/server/shared';
import {
  AreaChart,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
  Area
} from 'recharts';
import { printDate } from 'utils/methods';
import { Price } from 'utils/trpc';
import { TimeWindow } from 'utils/types';

interface HoverUpdaterProps {
  payload: Price;
  setHoverValue: React.Dispatch<React.SetStateAction<number>>;
  setHoverDate: React.Dispatch<React.SetStateAction<string>>;
  defaultValue: number;
  defaultDate: Date | string;
}

// Calls setHoverValue and setHoverDate when part of chart is hovered
// Note: this NEEDs to be wrapped inside component and useEffect
const HoverUpdater = ({
  payload,
  setHoverValue,
  setHoverDate,
  defaultValue,
  defaultDate
}: HoverUpdaterProps) => {
  useEffect(() => {
    if (payload) {
      setHoverValue(payload.close);
      setHoverDate(printDate(new Date(payload.date)));
    }

    return () => {
      // console.log('unmount');
      setHoverValue(defaultValue);
      setHoverDate(printDate(new Date(defaultDate)));
    };
  }, [payload, setHoverValue, setHoverDate]);

  return null;
};

interface PriceChartProps {
  data: SerializeObject<Price>[];
  timeWindow: TimeWindow;
  setHoverValue: React.Dispatch<React.SetStateAction<number>>;
  setHoverDate: React.Dispatch<React.SetStateAction<string>>;
  positive: boolean;
}

const PriceChart = ({
  data,
  timeWindow,
  setHoverValue,
  setHoverDate,
  positive
}: PriceChartProps) => {
  const color = positive ? 'var(--green)' : '#E4229A';

  return (
    <div className='PriceChart'>
      {data && (
        <ResponsiveContainer height={395}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='color' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={color} stopOpacity={0.4} />
                <stop offset='75%' stopColor={color} stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <Area
              type='monotone'
              dataKey='close'
              stroke={color}
              fill='url(#color)'
            />
            <XAxis
              dataKey='date'
              axisLine={false}
              tickLine={false}
              tickFormatter={(str) => printDate(new Date(str), timeWindow)}
              minTickGap={5}
            />
            <YAxis
              dataKey='close'
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              hide
            />
            <Tooltip
              contentStyle={{ display: 'none' }}
              formatter={(_tooltipValue: any, _name: any, props: any) => (
                <HoverUpdater
                  payload={props.payload}
                  setHoverValue={setHoverValue}
                  setHoverDate={setHoverDate}
                  defaultValue={data[data.length - 1].close}
                  defaultDate={new Date(data[data.length - 1].date)}
                />
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default PriceChart;
