import React, { useContext } from 'react';
import {
  faArrowDownLong,
  faArrowUpLong,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  Row,
  useReactTable
} from '@tanstack/react-table';
import clsx from 'clsx/lite';
import { TooltipProps } from 'recharts';
import {
  ValueType,
  NameType
} from 'recharts/types/component/DefaultTooltipContent';
import CopyIcon from 'components/CopyIcon';
import LinkIcon from 'components/LinkIcon';
import Spinner from 'components/Spinner';
import { routeNames } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import {
  convertPointsToJELLY,
  getEpochFromDate,
  parseScore,
  printDate,
  round
} from 'utils/methods';
import { GlobalLeaderboardItemDetails, trpc } from 'utils/trpc';
import { DayWindow, GlobalLeaderboardItem, TimeWindow } from 'utils/types';
import { columns } from './columns';
import './index.scss';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';

const Leaderboard = () => {
  const { connectedAddress: userAddress } = useContext(AccountWrapperContext);
  const pageLength = 50;
  const [page, setPage] = React.useState(0);
  const { data, isLoading } = trpc.getGlobalLeaderboard.useQuery({
    skip: pageLength * page
  });

  // fetch the next page
  const { data: _preFetch } = trpc.getGlobalLeaderboard.useQuery({
    skip: pageLength * (page + 1)
  });

  const { data: userPoints } = trpc.getGlobalLeaderboardUser.useQuery(
    { address: userAddress },
    { enabled: !!userAddress }
  );

  const { data: pointsTotalLength } =
    trpc.getGlobalLeaderboardLength.useQuery();
  const disabled = pointsTotalLength
    ? (page + 1) * pageLength >= pointsTotalLength
    : false;
  const _data = React.useMemo(() => {
    return (
      data?.map((item) => {
        const points = item.pointsByDate
          .map((p) => {
            const epoch = getEpochFromDate(new Date(p.date)).id;
            return convertPointsToJELLY(p.points, epoch);
          })
          .reduce((a, b) => a + b, 0);

        return {
          userAddress: item.userAddress,
          points
        };
      }) || ([] as GlobalLeaderboardItem[])
    );
  }, [data]);

  const table = useReactTable({
    data: _data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  return (
    <div className='Leaderboard'>
      <h3>Leaderboard</h3>
      {userAddress && userPoints && (
        <div className='your-rank'>
          <div>Your Rank: {userPoints?.userRank}</div>
        </div>
      )}
      {isLoading ? (
        <Spinner />
      ) : data ? (
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id}>
                      <div
                        onClick={() => {
                          header.column.getCanSort()
                            ? header.column.toggleSorting(
                                header.column.getIsSorted() === 'asc'
                              )
                            : null;
                        }}
                        className={clsx(
                          'header-cell',
                          header.column.getCanSort() && ' sortable'
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === 'asc' ? (
                              <FontAwesomeIcon icon={faArrowUpLong} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <FontAwesomeIcon icon={faArrowDownLong} />
                            ) : null}
                          </>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <LeaderboardCell key={row.id} row={row} page={page} />
            ))}
          </tbody>
        </table>
      ) : null}

      {FEATURE_FLAGS.ALL_POINTS_DETAILS && pointsTotalLength && (
        <div className='change-leaderboard-page'>
          <div>Page</div>
          <div className='chevron-container'>
            <button
              className={page === 0 ? 'disabled' : ''}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div>{page + 1}</div>
            <button
              className={disabled ? 'disabled' : ''}
              disabled={disabled}
              onClick={() => setPage(page + 1)}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface LeaderboardCellProps {
  row: Row<GlobalLeaderboardItem>;
  page: number;
}

const LeaderboardCell = ({ row, page }: LeaderboardCellProps) => {
  const expanded = row.getIsExpanded();
  const { userAddress } = row.original;

  const { data: _data, isLoading } =
    trpc.getGlobalLeaderboardUserDetails.useQuery(
      { address: userAddress },
      { enabled: expanded }
    );

  const data = _data
    ? _data
        .map((item) => ({
          ...item,
          points: convertPointsToJELLY(
            item.points,
            getEpochFromDate(new Date(item.date)).id
          )
        }))
        .toReversed()
    : [];
  const parsedData: GlobalLeaderboardItemDetails[] = data?.length
    ? data.map((d, i) => ({
        ...d,
        date: new Date(d.date),
        score: round(d.points, 0),
        cumulativeScore: round(
          d.points + (data.slice(0, i).reduce((a, b) => a + b.points, 0) || 0),
          0
        )
      }))
    : [];
  // if (expanded) console.log(parsedData);

  return (
    <>
      <tr
        onClick={() => FEATURE_FLAGS.ALL_POINTS_DETAILS && row.toggleExpanded()}
        className={expanded ? 'baseExpanded' : ''}
      >
        {row.getVisibleCells().map((cell, i) => {
          return (
            <td key={cell.id}>
              <span>
                {i === 0
                  ? page * 50 + cell.row.index + 1
                  : flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            </td>
          );
        })}

        <td className='position-summary'>
          <span>&nbsp;</span>
        </td>
        {FEATURE_FLAGS.ALL_POINTS_DETAILS && (
          <td>
            <FontAwesomeIcon
              icon={expanded ? faChevronUp : faChevronDown}
            />{' '}
          </td>
        )}
      </tr>

      {expanded ? (
        <tr className='expanded'>
          <td colSpan={7}>
            <div>
              <h2>JELLY Distribution</h2>
              <div className='address-action'>
                <span>Copy Address</span>
                <CopyIcon text={userAddress} />
              </div>
              <div className='address-action'>
                <LinkIcon
                  link={routeNames.portfolioUser.replace(
                    ':userAddress',
                    userAddress
                  )}
                  external={false}
                  text='Visit Portfolio'
                />
              </div>
            </div>
            {parsedData && parsedData.length ? (
              // <ResponsiveContainer aspect={4}>
              //   <AreaChart data={parsedData}>
              //     {/* <CartesianGrid strokeDasharray='3 3' /> */}
              //     <XAxis dataKey='date' />
              //     <Tooltip content={<CustomTooltip />} />
              //     <Area
              //       type='monotone'
              //       dataKey='score'
              //       stackId='1'
              //       stroke='#8884d8'
              //       fill='#8884d8'
              //     />
              //     <Area
              //       type='monotone'
              //       dataKey='cumulativeScore'
              //       stackId='1'
              //       stroke='#82ca9d'
              //       fill='#82ca9d'
              //     />
              //     {[
              //       'swapScore',
              //       'makerScore',
              //       'discordScore',
              //       'referralScore'
              //     ].map((key) => (
              //       <Area
              //         key={key}
              //         type='monotone'
              //         dataKey={key}
              //         stackId='1'
              //         stroke='#82ca9d'
              //         fill='#82ca9d'
              //       />
              //     ))}
              //   </AreaChart>
              // </ResponsiveContainer>
              <table className='inner-table'>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>On-chain score</th>
                    <th>Off-chain score</th>
                    <th>JELLY</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((item, i) => {
                      const p = (x: number) =>
                        isNaN(x) ? 0 : round(x * 100, 0);
                      const swapScore = p(item.swapScore);
                      const makerScore = p(item.makerScore);
                      const discordScore = p(item.discordScore);
                      const referralScore = p(item.referralScore);
                      return (
                        <tr key={item.userAddress + i} className='inner-row'>
                          <td>
                            {printDate(new Date(item.date), DayWindow.MONTH)}
                          </td>
                          <td>
                            <SimpleTooltip
                              position='bottom'
                              type='underline'
                              description={`Swap: ${swapScore} + Maker: ${makerScore}`}
                              title={`${parseScore(swapScore + makerScore)}`}
                            />
                          </td>
                          <td>
                            <SimpleTooltip
                              position='bottom'
                              type='underline'
                              description={`Discord: ${discordScore} + Referral: ${referralScore}`}
                              title={`${parseScore(
                                discordScore + referralScore
                              )}`}
                            />
                          </td>
                          <td>{parseScore(item.points)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : isLoading ? (
              <Spinner />
            ) : null}
          </td>
        </tr>
      ) : null}
      <tr className='spacer'></tr>
    </>
  );
};

const CustomTooltip = (props: TooltipProps<ValueType, NameType>) => {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length || !label) return null;

  // console.log(payload[0].payload.date, payload[1].payload.date);

  return (
    <div className='custom-recharts-tooltip'>
      <div className='tooltip-element'>
        <span className='tooltip-element-label tooltip-date'>
          {printDate(new Date(payload[0].payload.date), TimeWindow.Month)}
        </span>
      </div>
      {payload[0] && (
        <>
          <div className='tooltip-element'>
            <span className='tooltip-element-label'>Weekly Score</span>
            <span className='tooltip-element-value'>
              {Number(payload[0].value).toLocaleString()}
            </span>
          </div>
          <div className='tooltip-element'>
            <span className='tooltip-element-label'>Cumulative Score</span>
            <span className='tooltip-element-value'>
              {Number(payload[1].value).toLocaleString()}
            </span>
          </div>
          <div className='tooltip-element'>
            <span className='tooltip-element-label'>Swap Score</span>
            <span className='tooltip-element-value'>
              {Number(payload[2].value).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
