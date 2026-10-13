import { useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis
} from 'recharts';
import {
  NameType,
  ValueType
} from 'recharts/types/component/DefaultTooltipContent';
import TimePicker from 'components/TimePicker';
import { SimpleTooltip } from 'components/Tooltip';
import {
  filledEmptyRewardsWeeks,
  formatNumber,
  printDate
} from 'utils/methods';
import { GlobalLeaderboardItemDetails } from 'utils/trpc';
import { WeekWindow } from 'utils/types';
import './Graph.scss';
import EmptyGraph from './EmptyGraph';

export const token0Color = '#1C9D78';
export const token0ColorHover = '#a2fde3';

interface GraphRewardsProps {
  data: GlobalLeaderboardItemDetails[] | undefined;
}

const GraphRewards = ({ data: _data }: GraphRewardsProps) => {
  const [timeWindow, setTimeWindow] = useState(WeekWindow.QUARTER);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  const data =
    _data &&
    filledEmptyRewardsWeeks(
      _data.map((item) => ({ ...item, date: new Date(item.date) }))
    )
      .filter(
        (d) =>
          Number(new Date(d.date)) >
          Date.now() - timeWindow * 7 * 24 * 60 * 60 * 1000
      )
      .reverse();

  const emptyGraphText = 'No data available';

  return (
    <div className='Graph'>
      <div className='chart-header'>
        <h2>
          <SimpleTooltip
            title='JELLY Rewards'
            description='JELLY has been converted from Points on 23 dec 2024'
          />
        </h2>
        {_data && _data?.length > 0 && (
          <TimePicker
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
            values={[WeekWindow.QUARTER, WeekWindow.HALF_YEAR, WeekWindow.YEAR]}
          />
        )}
      </div>
      {_data?.length === 0 ? (
        <EmptyGraph text={emptyGraphText} />
      ) : (
        <ResponsiveContainer aspect={3}>
          <BarChart data={data}>
            <defs>
              <linearGradient id='token0Color' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={token0Color} stopOpacity={0.9} />
                <stop offset='95%' stopColor={token0Color} stopOpacity={0.1} />
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
            </defs>

            <Bar
              radius={5}
              dataKey='points'
              onMouseEnter={(_data, index) => setHoveredBin(index)}
              onMouseLeave={() => setHoveredBin(null)}
            >
              {data &&
                data.map((_d, index) => {
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === hoveredBin
                          ? 'url(#token0ColorHover)'
                          : 'url(#token0Color)'
                      }
                    />
                  );
                })}
            </Bar>

            <XAxis
              dataKey='date'
              axisLine={false}
              tickLine={false}
              tickFormatter={(str) => printDate(new Date(str), timeWindow)}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              position={{ y: 50 }}
              content={<CustomTooltip />}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default GraphRewards;

type CustomTooltipProps = TooltipProps<ValueType, NameType>;

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const { points: jellyAmount, date } = payload[0].payload;

  return (
    <div className='custom-recharts-tooltip'>
      <div className='tooltip-element'>
        <span className='tooltip-element-label'>JELLY</span>
        <span className='tooltip-element-value'>
          {formatNumber(jellyAmount)}
        </span>
        <span className='tooltip-element-label'>Date</span>
        <span className='tooltip-element-value'>
          {printDate(new Date(date), WeekWindow.YEAR)}
        </span>
      </div>
    </div>
  );
};
