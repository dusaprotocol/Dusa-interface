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
  filledEmptyIncentivesWeeks,
  getEpochFromId,
  printBigintIsh,
  printDate
} from 'utils/methods';
import { JELLY } from 'utils/tokens';
import { RewardDetails } from 'utils/trpc';
import { WeekWindow } from 'utils/types';
import './Graph.scss';
import EmptyGraph from './EmptyGraph';
import { token0Color, token0ColorHover } from './GraphRewards';

interface GraphIncentivesProps {
  data: RewardDetails[] | undefined;
}

const GraphIncentives = ({ data: _data }: GraphIncentivesProps) => {
  const [timeWindow, setTimeWindow] = useState(WeekWindow.QUARTER);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  const data =
    _data &&
    filledEmptyIncentivesWeeks(_data)
      .filter((d) => d?.rewardToken === 'JELLY' || d?.rewardToken === 'DUSA')
      .map((d) => {
        return {
          ...d,
          epoch: getEpochFromId(d.rewardEpoch)
        };
      })
      .filter(
        (d) =>
          Number(d.epoch.from) >
          Date.now() - timeWindow * 7 * 24 * 60 * 60 * 1000
      )
      .filter((d) => d.makerRewardsWithStreak > 0)
      .sort((a, b) => Number(a.epoch.from) - Number(b.epoch.from));

  const emptyGraphText = 'No data available';

  return (
    <div className='Graph'>
      <div className='chart-header'>
        <h2>
          <SimpleTooltip
            title='DUSA Incentives'
            description='Get DUSA by providing liquidity on rewarded pools since 30 dec 2024'
          />
        </h2>
        {data && data?.length > 0 && (
          <TimePicker
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
            values={[WeekWindow.QUARTER, WeekWindow.HALF_YEAR, WeekWindow.YEAR]}
          />
        )}
      </div>
      {data?.length === 0 ? (
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
              dataKey='makerRewardsWithStreak'
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
              dataKey='epoch.from'
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

export default GraphIncentives;

type CustomTooltipProps = TooltipProps<ValueType, NameType>;

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const {
    makerRewardsWithStreak: jelly,
    epoch,
    makerRewardsWithStreakRaw
  } = payload[0].payload;

  const jellyMerged = makerRewardsWithStreakRaw
    .split(';')
    .map((j: string) => printBigintIsh(JELLY, BigInt(j)));

  return (
    <div className='custom-recharts-tooltip'>
      <div className='tooltip-element'>
        <span className='tooltip-element-label'>
          {epoch.id < 65 ? 'JELLY' : 'DUSA'}
        </span>
        <span className='tooltip-element-value'>
          {jelly} {jellyMerged.length > 1 && `(${jellyMerged.join(' + ')})`}
        </span>
        <span className='tooltip-element-label'>Epoch</span>
        <div className='tooltip-element-value'>
          <span>id: {epoch.id}</span>
          <span>from: {printDate(epoch.from, WeekWindow.YEAR)}</span>
          <span>to: {printDate(epoch.to, WeekWindow.YEAR)}</span>
        </div>
      </div>
    </div>
  );
};
