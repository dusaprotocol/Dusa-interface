// Pools.tsx
import React, {
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  faCertificate,
  faLadderWater,
  faPlus,
  faSearch,
  faWarning,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState
} from '@tanstack/react-table';
import clsx from 'clsx/lite';
import { Link, useNavigate } from 'react-router-dom';
import ConnectButton from 'components/ConnectButton';
import MobilePoolsSort from 'components/MobilePoolsSort';
import { MyPoolsWithPreview } from 'components/MyPools';
import PageHeader from 'components/PageHeader';
import PoolItem from 'components/PoolItem';
import PoolName from 'components/PoolName';
import Tabs from 'components/Tabs';
import Tooltip from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAllPools from 'hooks/useFetchAllPools';
import useResizeWindow from 'hooks/useResizeWindow';
import useSimplePoolsMetrics, {
  SimplePoolMetrics
} from 'hooks/useSimplePoolsMetrics';
import { Chart } from 'pages/Pool/components/Chart';
import { buildPoolRoute, routeNames } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { currentEpoch } from 'utils/constants';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  calculateRewardsPerDay,
  printBigintIsh,
  printDate
} from 'utils/methods';
import { pools as corePools, poolsV2 } from 'utils/pools';
import { setIsDegenMode, getIsDegenMode } from 'utils/storage';
import { tokens } from 'utils/tokens';
import { Reward, trpc } from 'utils/trpc';
import { DayWindow, Pool, Token } from 'utils/types';
import { columns, PoolWithMetrics } from './columns';

type PoolVersionTab = 'all' | 'v1' | 'v2';

const Pools = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeWindowTVL, setTimeWindowTVL] = useState(DayWindow.WEEK);
  const [timeWindowVolume, setTimeWindowVolume] = useState(DayWindow.WEEK);
  const [poolVersionTab, setPoolVersionTab] = useState<PoolVersionTab>('v2');
  const [degenMode, setDegenMode] = useState(getIsDegenMode());
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const allPoolsQuery = useFetchAllPools();
  const v1Pools = allPoolsQuery.data || [];
  const allPoolsV2Query = useFetchAllPools(false);
  const v2Pools = allPoolsV2Query.data || [];

  const whitelistBySymbol = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const t of tokens) {
      const sym = (t.symbol || '').toUpperCase();
      const addr = t.address.toLowerCase();
      if (!m.has(sym)) m.set(sym, new Set());
      m.get(sym)!.add(addr);
    }
    return m;
  }, []);

  const tokenIsSus = (poolToken: Token): boolean => {
    const set = whitelistBySymbol.get((poolToken.symbol || '').toUpperCase());
    return !!set && !set.has(poolToken.address.toLowerCase());
  };

  const coreSet = useMemo(
    () => new Set(corePools.map((p) => p.pairAddress.toLowerCase())),
    []
  );
  const v2Set = useMemo(
    () => new Set(poolsV2.map((p) => p.pairAddress.toLowerCase())),
    []
  );

  const getFilteredPools = (
    versionTab: PoolVersionTab,
    isDegen: boolean
  ): Pool[] => {
    if (isDegen) {
      const v1PoolsDegen = v1Pools.filter(
        (pool) => !tokenIsSus(pool.token0) && !tokenIsSus(pool.token1)
      );
      const v2PoolsDegen = v2Pools.filter(
        (pool) => !tokenIsSus(pool.token0) && !tokenIsSus(pool.token1)
      );

      switch (versionTab) {
        case 'v1':
          return [
            ...corePools,
            ...v1PoolsDegen.filter(
              (p) => !coreSet.has(p.pairAddress.toLowerCase())
            )
          ];
        case 'v2':
          return [
            ...poolsV2,
            ...v2PoolsDegen.filter(
              (p) => !v2Set.has(p.pairAddress.toLowerCase())
            )
          ];
        case 'all':
        default: {
          const v1Combined = [
            ...corePools,
            ...v1PoolsDegen.filter(
              (p) => !coreSet.has(p.pairAddress.toLowerCase())
            )
          ];
          const v2Combined = [
            ...poolsV2,
            ...v2PoolsDegen.filter(
              (p) => !v2Set.has(p.pairAddress.toLowerCase())
            )
          ];
          return [...v2Combined, ...v1Combined];
        }
      }
    } else {
      switch (versionTab) {
        case 'v1':
          return corePools;
        case 'v2':
          return poolsV2;
        case 'all':
        default:
          return [...poolsV2, ...corePools];
      }
    }
  };

  const filteredPools = useMemo(
    () => getFilteredPools(poolVersionTab, degenMode),
    [poolVersionTab, degenMode, v1Pools, v2Pools]
  );

  const searchFilteredPools = useMemo(() => {
    if (!searchValue) return filteredPools;
    const s = searchValue.toLowerCase();
    return filteredPools.filter((pool) => {
      const token0 = getMasIfWmas(pool.token0);
      const token1 = getMasIfWmas(pool.token1);
      return (
        token0.symbol.toLowerCase().includes(s) ||
        token1.symbol.toLowerCase().includes(s) ||
        token0.name?.toLowerCase().includes(s) ||
        token1.name?.toLowerCase().includes(s)
      );
    });
  }, [searchValue, filteredPools]);

  const poolsToShow = searchFilteredPools;

  const { poolsMetrics } = useSimplePoolsMetrics(poolsToShow);

  const { innerWidth: windowWidth } = useResizeWindow();
  const smallScreen = windowWidth <= 800;

  const volume = trpc.getGlobalVolume.useQuery({ take: timeWindowVolume });
  const rollingVolume = trpc.get24hRollingGlobalVolume.useQuery();
  const volumeAtm = rollingVolume.data;

  const tvl = trpc.getGlobalTVL.useQuery({ take: timeWindowTVL });
  const tvlAtm = tvl.data
    ? tvl.data[tvl.data.length - 1]?.usdLocked
    : undefined;

  const { connectedAddress, poolsOwn, autoPoolsOwn, isLoading } = useContext(
    AccountWrapperContext
  );

  const handleDegenMode = () => {
    const newDegenMode = !degenMode;
    setIsDegenMode(newDegenMode);
    setDegenMode(newDegenMode);
  };

  const handleSearchChange = (value: string) => setSearchValue(value);
  const clearSearch = () => setSearchValue('');

  return (
    <div className='before:z-0 before:fixed relative before:inset-0 flex flex-col before:bg-[radial-gradient(circle_at_25%_25%,rgba(23,146,208,0.03)_0%,transparent_50%),_radial-gradient(circle_at_75%_75%,rgba(16,185,129,0.03)_0%,transparent_50%)] w-full min-h-screen before:content-[""] before:pointer-events-none Pools'>
      <div className='z-10 relative mx-auto w-full infos-pools'>
        <PageHeader title='Pools' description='Provide liquidity and earn fees'>
          <div className='flex flex-row max-[800px]:flex-col gap-10 max-[800px]:gap-4 w-[calc(50%_-_1.25rem)] max-[800px]:w-full charts-container'>
            <Chart
              {...volume}
              data={volume.data?.map((d) => ({
                ...d,
                volume: Number(d.volume)
              }))}
              timeWindow={timeWindowVolume}
              setTimeWindow={setTimeWindowVolume}
              isVolume={true}
              displayedValue={volumeAtm}
              showAxis={false}
            />
            <Chart
              {...tvl}
              data={tvl.data?.map((d) => ({
                ...d,
                usdLocked: Number(d.usdLocked)
              }))}
              timeWindow={timeWindowTVL}
              setTimeWindow={setTimeWindowTVL}
              isVolume={false}
              displayedValue={tvlAtm}
              showAxis={false}
            />
          </div>
        </PageHeader>
      </div>
      <div className='z-10 relative flex flex-col flex-grow container-pools'>
        <div className='mx-auto px-4 w-full max-w-[1400px]'>
          <Tabs
            tabs={['All Pools', 'My Pools']}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            variant='bottom-plane'
          />
        </div>
        <div className='flex-grow bg-[var(--secondary-bg)] tabs-container'>
          <div className='flex flex-col gap-2 bg-[var(--secondary-bg)] p-8 px-4 tabs-content'>
            <div
              className={clsx(
                'flex flex-col gap-4 poolsTable-container',
                activeTab === 1 && 'hidden'
              )}
            >
              <div className='flex flex-col gap-2'>
                <div className='flex flex-wrap items-center gap-2 create-search-container'>
                  {FEATURE_FLAGS.CREATE_POOL && (
                    <div className='flex whitespace-nowrap'>
                      <Link
                        to={routeNames.create}
                        className='flex items-center gap-2 bg-[var(--hover-bg)] hover:bg-[var(--main-bg)] px-5 py-3 border hover:border-[var(--secondary-color)] border-transparent rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ease-out cursor-pointer create-link'
                      >
                        <FontAwesomeIcon icon={faPlus} /> Create New Pool
                      </Link>
                    </div>
                  )}

                  {FEATURE_FLAGS.DEGEN_MODE && (
                    <div className='flex whitespace-nowrap'>
                      <div
                        onClick={handleDegenMode}
                        className='flex items-center gap-2 bg-[var(--hover-bg)] hover:bg-[var(--main-bg)] px-5 py-3 border hover:border-[var(--secondary-color)] border-transparent rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ease-out cursor-pointer create-link'
                      >
                        <input type='checkbox' checked={degenMode} readOnly />
                        Degen Mode
                      </div>
                    </div>
                  )}

                  <SearchComponent
                    searchValue={searchValue}
                    setSearchValue={handleSearchChange}
                    clearSearch={clearSearch}
                    inputRef={inputRef}
                  />
                </div>
                <div className='flex'>
                  <div
                    className={clsx('flex bg-[var(--hover-bg)] p-1 rounded-lg')}
                  >
                    {(['v2', 'v1', 'all'] as PoolVersionTab[]).map(
                      (version) => (
                        <button
                          key={version}
                          onClick={() => {
                            setPoolVersionTab(version);
                            clearSearch();
                          }}
                          className='px-3 py-2 border border-transparent rounded-md font-medium text-sm whitespace-nowrap transition-all duration-200'
                          style={{
                            border:
                              poolVersionTab === version
                                ? '1px solid var(--secondary-color)'
                                : '1px solid transparent'
                          }}
                        >
                          {version.toUpperCase()}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className='flex flex-col gap-2 container-pool-items'>
                {searchValue && poolsToShow.length === 0 ? (
                  <div className='flex flex-col items-center gap-2 mt-4 w-full no-pool-found'>
                    <FontAwesomeIcon
                      icon={faLadderWater}
                      className='text-2xl cursor-default'
                    />
                    <span>No pool found</span>
                  </div>
                ) : (
                  <SimplePoolsTable
                    pools={poolsToShow}
                    poolsMetrics={poolsMetrics}
                    smallScreen={smallScreen}
                  />
                )}
              </div>
            </div>
            <div className={clsx(activeTab === 0 && 'hidden')}>
              {connectedAddress ? (
                <MyPoolsWithPreview
                  autoPoolsOwn={autoPoolsOwn}
                  poolsOwn={poolsOwn}
                  isLoading={
                    isLoading && isLoading(['poolsOwn', 'autoPoolsOwn'])
                  }
                />
              ) : (
                <ConnectButton stretch={false} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SimplePoolsTableProps {
  pools: Pool[];
  poolsMetrics: SimplePoolMetrics[];
  smallScreen: boolean;
}

const isPreferredDusaMassa = (p: Pool) => {
  const a = getMasIfWmas(p.token0).symbol.toUpperCase();
  const b = getMasIfWmas(p.token1).symbol.toUpperCase();
  const set = new Set([a, b]);
  return set.has('DUSA') && set.has('MAS');
};

const SimplePoolsTable = memo(
  ({ pools, poolsMetrics, smallScreen }: SimplePoolsTableProps) => {
    const navigate = useNavigate();

    const metricsByAddress = useMemo(() => {
      const m = new Map<string, SimplePoolMetrics>();
      for (const mm of poolsMetrics) m.set(mm.poolAddress.toLowerCase(), mm);
      return m;
    }, [poolsMetrics]);

    const [sorting, setSorting] = useState<SortingState>([
      { id: 'metrics.volume24h', desc: true }
    ]);

    const [mobileSorting, setMobileSorting] = useState({
      key: 'metrics.volume24h',
      desc: true
    });
    useEffect(() => {
      if (smallScreen)
        setSorting([{ id: mobileSorting.key, desc: mobileSorting.desc }]);
    }, [mobileSorting, smallScreen]);

    const baseOrderedPools = useMemo(() => {
      const byId = new Map<string, Pool>();
      for (const p of pools) byId.set(p.pairAddress.toLowerCase(), p);
      const arr = Array.from(byId.values());
      const idx = arr.findIndex(isPreferredDusaMassa);
      if (idx > 0) {
        const [prefer] = arr.splice(idx, 1);
        arr.unshift(prefer);
      }
      return arr;
    }, [pools]);

    const data: PoolWithMetrics[] = useMemo(
      () =>
        baseOrderedPools.map((pool) => ({
          pool,
          metrics: metricsByAddress.get(pool.pairAddress.toLowerCase()) || null
        })),
      [baseOrderedPools, metricsByAddress]
    );

    const table = useReactTable({
      data,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getRowId: (row) => row.pool.pairAddress.toLowerCase()
    });

    if (smallScreen) {
      return (
        <>
          <MobilePoolsSort
            mobileSorting={mobileSorting}
            setMobileSorting={setMobileSorting}
          />
          {table.getRowModel().rows.map((row) => {
            const { pool, metrics } = row.original;
            return (
              <div key={row.id} className='pool-table-content flex gap-0.5'>
                <PoolItem pool={pool} metrics={metrics} isSmallScreen={true} />
              </div>
            );
          })}
        </>
      );
    }

    return (
      <div className='pools-table-container relative bg-white/[0.05] shadow-xl backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden'>
        <div className='table-container relative overflow-x-auto'>
          <table className='bg-transparent w-full border-separate [border-spacing:0]'>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, i) => (
                    <th
                      key={header.id}
                      onClick={() => {
                        if (header.column.getCanSort())
                          header.column.toggleSorting();
                      }}
                      className={clsx(
                        'top-0 z-10 sticky bg-[rgba(7,22,45,0.95)] backdrop-blur-xl border-0 border-white/[0.08] border-b text-right whitespace-nowrap',
                        i === 0 && 'left-0 z-[15] text-left',
                        header.column.getCanSort() &&
                          'cursor-pointer select-none'
                      )}
                    >
                      <div
                        className={clsx(
                          'after:bottom-0 after:left-1/2 after:absolute relative flex items-center gap-2 after:bg-blue-500 after:opacity-0 p-4 px-5 after:w-[30%] after:h-px font-bold text-slate-400 text-xs uppercase tracking-wider transition-all after:transition-all after:-translate-x-1/2 duration-300 ease-out',
                          i !== 0 ? 'justify-end' : 'justify-start',
                          header.column.getCanSort() &&
                            'hover:text-blue-400 hover:-translate-y-px hover:after:opacity-60 hover:after:w-full'
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr
                    className='group last:after:hidden after:right-0 after:bottom-0 after:left-0 after:absolute relative bg-[var(--hover-bg)] after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] hover:after:bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.3),transparent)] hover:bg-blue-500/[0.05] border border-[var(--border-color)] hover:border-blue-500/30 rounded-lg after:h-px after:content-[""] transition-all duration-200 ease-out cursor-pointer'
                    onClick={() => navigate(buildPoolRoute(row.original.pool))}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td
                        key={cell.id}
                        className='p-0 border-0 font-medium tabular-nums text-slate-100 text-sm'
                      >
                        <div
                          className={clsx(
                            'flex items-center px-5 py-3 min-h-[48px]',
                            cellIndex !== 0 ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {index < table.getRowModel().rows.length - 1 && (
                    <tr style={{ height: '0.1rem' }} />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

export const PoolTitle = ({ pool }: { pool: Pool }) => {
  const isPoolWhitelisted = corePools
    .concat(poolsV2)
    .some((p) => p.pairAddress === pool.pairAddress);

  const { data: rewardsData } = trpc.getRewardPool.useQuery(
    { poolAddress: pool.pairAddress, epoch: currentEpoch.id },
    { enabled: FEATURE_FLAGS.REWARDS }
  );

  const hasRewards =
    FEATURE_FLAGS.REWARDS &&
    !!rewardsData &&
    Array.isArray(rewardsData.rewardTokens) &&
    rewardsData.rewardTokens.length > 0;

  return (
    <div className='flex flex-wrap items-center gap-2 w-full PoolTitle'>
      <div className='pool-title-left flex flex-wrap items-center gap-2'>
        <PoolName {...pool} />
        {hasRewards && rewardsData ? (
          <Tooltip
            trigger={
              <span className='bg-[var(--green)] px-3 py-1.5 rounded-lg font-semibold text-white text-xs'>
                Rewards
              </span>
            }
            position='top'
          >
            <div className='EpochDetails'>
              <EpochDetails epoch={currentEpoch} rewardsData={rewardsData} />
            </div>
          </Tooltip>
        ) : null}
        <CertificatedPool isPoolWhitelisted={isPoolWhitelisted} />
      </div>
    </div>
  );
};

const EpochDetails = ({
  epoch,
  rewardsData
}: {
  epoch: { id: number; from: Date; to: Date };
  rewardsData: Reward;
}) => {
  return (
    <div className='EpochDetails'>
      <div className='flex items-center gap-2 mb-2'>
        <span className='font-semibold'>Epoch {epoch.id}</span>
        <span className='text-xs'>
          {epoch.to > new Date() ? ' LIVE' : ' ENDED'}
        </span>
      </div>
      <div className='grid grid-cols-3 text-sm'>
        <div>
          <div className='opacity-70'>Start</div>
          <div className='font-medium'>
            {printDate(epoch.from, DayWindow.WEEK)}
          </div>
        </div>
        <div>
          <div className='opacity-70'>Finish</div>
          <div className='font-medium'>
            {printDate(epoch.to, DayWindow.WEEK)}
          </div>
        </div>
        <div>
          <div className='opacity-70'>Rewards Per Day</div>
          <div className='font-medium'>
            {rewardsData.rewardTokens.map((rewardToken, index) => {
              const symbol = rewardToken.token.symbol;
              const perDay = calculateRewardsPerDay(rewardToken, epoch);
              return (
                <React.Fragment key={index}>
                  {printBigintIsh(
                    rewardToken.token as unknown as Token,
                    perDay.quotient * BigInt(10 ** rewardToken.token.decimals)
                  )}{' '}
                  {symbol === 'WMAS' ? 'MAS' : symbol}
                  <br />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SearchComponentProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
  clearSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const SearchComponent = ({
  searchValue,
  setSearchValue,
  clearSearch,
  inputRef
}: SearchComponentProps) => {
  return (
    <div className='relative flex flex-grow items-center min-w-[200px] search-input-container'>
      <FontAwesomeIcon
        icon={faSearch}
        className='absolute opacity-50 ml-3 search-icon'
        onClick={() => inputRef.current?.focus()}
      />
      <input
        ref={inputRef}
        type='text'
        className='bg-[var(--hover-bg)] px-9 py-3 border hover:border-[var(--secondary-color)] focus:border-[var(--secondary-color)] border-transparent rounded-lg focus:outline-none w-full text-base transition-all duration-200 ease-out caret-[var(--secondary-color)] search-input'
        placeholder='Search by symbol or name'
        onChange={(e) => setSearchValue(e.target.value)}
        value={searchValue}
      />
      {searchValue && (
        <FontAwesomeIcon
          icon={faXmark}
          className='right-3 clear-icon absolute opacity-50 cursor-pointer'
          onClick={clearSearch}
        />
      )}
    </div>
  );
};

export const CertificatedPool = ({
  isPoolWhitelisted
}: {
  isPoolWhitelisted: boolean;
}) => {
  return (
    <Tooltip
      trigger={
        isPoolWhitelisted ? (
          <FontAwesomeIcon icon={faCertificate} className='text-cyan-400' />
        ) : (
          <FontAwesomeIcon icon={faWarning} className='text-yellow-400' />
        )
      }
      position='top right'
      className='md:w-[300px]'
    >
      <div className='CertificatedPool'>
        {isPoolWhitelisted ? (
          <span>Whitelisted pool with official tokens.</span>
        ) : (
          <span>
            Non-whitelisted pool. Please verify token authenticity before
            providing liquidity.
          </span>
        )}
      </div>
    </Tooltip>
  );
};

export default Pools;
