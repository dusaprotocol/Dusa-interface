import { useContext, useState, useMemo } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import {
  faChevronDown,
  faChevronUp,
  faWaterLadder
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  ExpandedState,
  Row
} from '@tanstack/react-table';
import clsx from 'clsx/lite';
import { Link } from 'react-router-dom';
import LiquidityRangeInfo from 'components/LiquidityRangeInfo';
import PoolName from 'components/PoolName';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { usePairAddresses } from 'hooks/useFetchData';
import usePairInformation from 'hooks/useFetchData/pairInformation';
import { usePairTokenValue } from 'hooks/usePairManager';
import LiquidityBars from 'pages/Pool/components/LiquidityBars';
import { PoolsOwn } from 'pages/Portfolio/components/Pools';
import { buildPoolRoute } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { fetchUserLiquidityBins } from 'utils/datastoreFetcher';
import {
  sumBinAmounts,
  calculateTVL,
  printUSD,
  printBigintIsh
} from 'utils/methods';
import { PoolLiquidity } from 'utils/types';
import { getColumns } from './columns';
import './index.scss';
import Skeleton from 'components/Skeleton';
import { getMasIfWmas } from 'utils/coreMethods';

interface MyPoolsProps {
  poolsOwn: PoolLiquidity[] | undefined;
  autoPoolsOwn: PoolLiquidity[] | undefined;
  isLoading: boolean;
  isSelf?: boolean;
}

const MyPools = ({
  poolsOwn,
  autoPoolsOwn,
  isLoading,
  isSelf = true
}: MyPoolsProps) => {
  if (!poolsOwn && !autoPoolsOwn) return <Spinner />;

  return (
    <div className='pf-section-tokens'>
      {FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && autoPoolsOwn?.length ? (
        <PoolsOwn poolsOwn={autoPoolsOwn} isAutonomous isLoading={isLoading} />
      ) : null}
      {poolsOwn?.length ? (
        <PoolsOwn
          poolsOwn={poolsOwn}
          isAutonomous={false}
          isLoading={isLoading}
        />
      ) : null}
      {isLoading && !poolsOwn?.length && !autoPoolsOwn?.length ? (
        <Spinner />
      ) : !isLoading && !poolsOwn?.length && !autoPoolsOwn?.length ? (
        <div className='no-liquidity'>
          <FontAwesomeIcon icon={faWaterLadder} />
          {isSelf ? (
            <span>You don&apos;t have any liquidity.</span>
          ) : (
            <span>No liquidity</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const MyPoolsWithPreview = ({
  poolsOwn,
  autoPoolsOwn,
  isLoading
}: MyPoolsProps) => {
  const [expandedV1, setExpandedV1] = useState<ExpandedState>({});
  const [expandedV2, setExpandedV2] = useState<ExpandedState>({});

  // Séparer les pools par version avec useMemo pour éviter les re-renders
  const poolsV1 = useMemo(
    () => poolsOwn?.filter((pool) => pool.version === 'V1') || [],
    [poolsOwn]
  );
  const poolsV2 = useMemo(
    () => poolsOwn?.filter((pool) => pool.version === 'V2') || [],
    [poolsOwn]
  );

  // Configuration des colonnes pour chaque version
  const columnsV1 = getColumns('V1');
  const columnsV2 = getColumns('V2');

  // Tables pour V1 et V2
  const tableV1 = useReactTable({
    data: poolsV1,
    columns: columnsV1,
    state: { expanded: expandedV1 },
    onExpandedChange: setExpandedV1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  const tableV2 = useReactTable({
    data: poolsV2,
    columns: columnsV2,
    state: { expanded: expandedV2 },
    onExpandedChange: setExpandedV2,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  // Adresses pour chaque version
  const { poolAddresses: poolAddressesV1 } = usePairAddresses(poolsV1);
  const { poolAddresses: poolAddressesV2 } = usePairAddresses(poolsV2);

  if (isLoading) return <Spinner />;

  // Fonction helper pour créer une section de table
  const renderPoolSection = (
    title: string,
    table: any,
    poolAddresses: string[],
    showFees: boolean
  ) => (
    <div className='pools-section'>
      <h3 className='section-title'>{title}</h3>
      <table>
        {/* <thead>
          {table.getHeaderGroups().map((headerGroup: any) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header: any) => {
                const isFeeColumn =
                  header.column.columnDef.accessorKey?.startsWith('fees');
                return (
                  <th
                    key={header.id}
                    className={isFeeColumn ? 'fees-column' : ''}
                  >
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
                        header.column.getCanSort() ? ' sortable' : ''
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
              <th>Position</th>
              <th></th>
            </tr>
          ))}
        </thead> */}
        <tbody>
          {table.getRowModel().rows.map((row: any, i: number) => (
            <LiquidityBarsCell
              key={row.id}
              row={row}
              pairAddress={poolAddresses[i] || ''}
              showFees={showFees}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className='MyPools'>
      {!poolsOwn?.length && !autoPoolsOwn?.length ? (
        <div className='no-liquidity'>
          <FontAwesomeIcon icon={faWaterLadder} />
          <span>You don&apos;t have any liquidity.</span>
        </div>
      ) : (
        <>
          {poolsV2.length > 0 &&
            renderPoolSection('Pools V2', tableV2, poolAddressesV2, false)}
          {poolsV1.length > 0 &&
            renderPoolSection('Pools V1', tableV1, poolAddressesV1, true)}
        </>
      )}
    </div>
  );
};

interface LiquidityBarsCellProps {
  row: Row<PoolLiquidity>;
  pairAddress: string;
  showFees: boolean;
}

const LiquidityBarsCell = ({
  row,
  pairAddress,
  showFees
}: LiquidityBarsCellProps) => {
  const expanded = row.getIsExpanded();
  const { token0, token1, binStep } = row.original;

  const [token0Display, token1Display] = [token0, token1].map((t) =>
    getMasIfWmas(t)
  );

  const { connectedAddress: address } = useContext(AccountWrapperContext);

  const { data: bins } = useQuery(
    ['liquidity', address, pairAddress],
    () =>
      fetchUserLiquidityBins(
        address,
        pairAddress || '',
        token0,
        token1,
        binStep
      ),
    {
      enabled: !!address && !!pairAddress
    }
  );
  const pairInfoQuery = usePairInformation(pairAddress);
  const activeId = pairInfoQuery.data?.activeId;

  const b = bins || [];
  const inRange = b.some((bin) => bin.id === activeId && bin.amountLBT > 0n);

  const poolState = {
    ...row.original,
    activeId: activeId ?? 0,
    invertPrice: false
  };

  const { dollarValue0, dollarValue1 } = usePairTokenValue({ token0, token1 });

  const { amount0, amount1 } = bins
    ? sumBinAmounts(bins)
    : { amount0: 0n, amount1: 0n };
  const value =
    dollarValue0 && dollarValue1
      ? calculateTVL(
          new TokenAmount(token0, amount0),
          new TokenAmount(token1, amount1),
          dollarValue0,
          dollarValue1
        )
      : 0;

  return (
    <>
      <tr className='pool-name-row'>
        <td colSpan={showFees ? 4 : 2}>
          <div className='flex justify-start'>
            <PoolName
              token0={token0}
              token1={token1}
              binStep={binStep}
              version={row.original.version}
            />
          </div>
        </td>
      </tr>

      {/* Ligne 2: Colonnes existantes */}
      <tr
        onClick={() => row.toggleExpanded()}
        className={clsx('pool-data-row', expanded && 'baseExpanded')}
      >
        {/* {showFees &&
          row.getVisibleCells().map((cell, i) => {
            const token = i === 0 ? token0 : token1;
            return (
              <td key={cell.id} className='fees-column'>
                <span>
                  {printBigintIsh(token, cell.getValue() as BigintIsh)}{' '}
                  {token.symbol}
                </span>
              </td>
            );
          })} */}

        <td className='position-summary'>
          <div></div>
          <div className={`position-values ${showFees ? 'with-fees' : ''}`}>
            {showFees && (
              <>
                <div>
                  <span className='label'>Fees 0</span>
                  {bins === undefined ? (
                    <Skeleton />
                  ) : (
                    (amount0 > 0n || amount1 > 0n) &&
                    printBigintIsh(token0, row.original.fees0)
                  )}{' '}
                  {token0Display.symbol}
                </div>
                <div>
                  <span className='label'>Fees 1</span>
                  {bins === undefined ? (
                    <Skeleton />
                  ) : (
                    (amount1 > 0n || amount0 > 0n) &&
                    printBigintIsh(token1, row.original.fees1)
                  )}{' '}
                  {token1Display.symbol}
                </div>
              </>
            )}
            <div>
              <span className='label'>Position ({token0Display.symbol})</span>
              {bins === undefined ? (
                <Skeleton />
              ) : (
                (amount0 > 0n || amount1 > 0n) &&
                printBigintIsh(token0, amount0)
              )}{' '}
              {token0Display.symbol}
            </div>
            <div>
              <span className='label'>Position ({token1Display.symbol})</span>
              {bins === undefined ? (
                <Skeleton />
              ) : (
                (amount1 > 0n || amount0 > 0n) &&
                printBigintIsh(token1, amount1)
              )}{' '}
              {token1Display.symbol}
            </div>
            <div>
              <span className='label'>Total Bins</span>
              {bins === undefined ? (
                <Skeleton />
              ) : (
                (amount1 > 0n || amount0 > 0n) && bins?.length
              )}{' '}
              bins
            </div>
            <div>
              <span className='label'>Total Value</span>$
              {bins === undefined ? (
                <Skeleton />
              ) : (
                (amount1 > 0n || amount0 > 0n) && printUSD(value)
              )}
            </div>
          </div>
        </td>

        <td>
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />{' '}
        </td>
      </tr>

      {expanded ? (
        <tr className='expanded'>
          <td colSpan={showFees ? 4 : 2}>
            {bins && bins.length ? (
              <div className='expanded-details'>
                <div className='redirect-pool'>
                  <Link to={buildPoolRoute(row.original)}>
                    <FontAwesomeIcon icon={faWaterLadder} />
                    Manage Liquidity
                  </Link>
                </div>
                <LiquidityRangeInfo isIn={inRange ? true : false} />
                <LiquidityBars
                  bins={bins ? [...bins].sort((a, _b) => _b.id - a.id) : []}
                  aspect={window.innerWidth > 768 ? 6 : 2}
                  token0={token0}
                  token1={token1}
                  binStep={binStep}
                  activeId={activeId ?? 0}
                  invertPrice={false}
                />
              </div>
            ) : (
              <Spinner />
            )}
          </td>
        </tr>
      ) : null}
      <tr className='spacer'></tr>
    </>
  );
};

export default MyPools;
