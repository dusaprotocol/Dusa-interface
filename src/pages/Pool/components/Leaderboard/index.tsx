import { useContext, useState } from 'react';
import { Fraction, TokenAmount } from '@dusalabs/sdk';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowDownLong,
  faArrowUpLong,
  faChevronDown,
  faChevronUp,
  faCopy
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ExpandedState,
  Row,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import CopyIcon from 'components/CopyIcon';
import Dropdown from 'components/Dropdown';
import LinkIcon from 'components/LinkIcon';
import RewardsInfo from 'components/RewardsInfo';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import Tooltip from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import { routeNames } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { BLACKLIST, currentEpoch, epochs, JELLY_VALUE } from 'utils/constants';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  fetchClaimedAmount,
  fetchUserLiquidityBins
} from 'utils/datastoreFetcher';
import {
  calculateTVL,
  formatNumber,
  getTokenFromAddress,
  printBigintIsh,
  printDate,
  printUSD,
  roundTokenAmount,
  sumBinAmounts,
  toFraction,
  toToken
} from 'utils/methods';
import { MASSA } from 'utils/tokens';
import { buildClaimRewardTx } from 'utils/transactionBuilder';
import { LeaderboardItem, Reward, trpc } from 'utils/trpc';
import { TimeWindow } from 'utils/types';
import { columns } from './columns';
import LiquidityBars from '../LiquidityBars';
import './index.scss';

interface LiquidityBarsCellProps {
  row: Row<LeaderboardItem>;
  reward?: Reward;
}

const LiquidityBarsCell = ({ row, reward }: LiquidityBarsCellProps) => {
  const expanded = row.getIsExpanded();
  const { address, feesPct } = row.original;

  // prettier-ignore
  const { pairAddress, token0, token1, binStep, activeId, dollarValue0, dollarValue1, setAddLiquidityParams, setActiveTab, setAutoChangeQuantity } = useContext(PoolContext);

  const { data: bins, isLoading: areBinsLoading } = useQuery(
    ['liquidity', address, pairAddress],
    () =>
      fetchUserLiquidityBins(
        address,
        pairAddress || '',
        token0,
        token1,
        binStep
      ),
    { enabled: expanded }
  );

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

  const onClick = () => {
    if (!activeId || !bins) return;

    const ONE = 10n ** 18n;
    const len = bins.length;

    const distributionX: bigint[] = new Array(len).fill(0n);
    const distributionY: bigint[] = new Array(len).fill(0n);
    const deltaIds: number[] = new Array(len).fill(0);

    bins.forEach((bin, i) => {
      distributionX[i] = new Fraction(bin.amount0, amount0).multiply(
        ONE
      ).quotient;
      distributionY[i] = new Fraction(bin.amount1, amount1).multiply(
        ONE
      ).quotient;
      deltaIds[i] = activeId - bin.id;
    });

    setAutoChangeQuantity(false);
    setAddLiquidityParams({
      distributionX,
      distributionY,
      deltaIds,
      xyRatio: Number(new Fraction(amount1, amount0).toSignificant(6)),
      makerAddress: address
    });
    setActiveTab(0);
  };

  return (
    <>
      <tr
        onClick={() => row.toggleExpanded()}
        className={clsx(expanded && 'baseExpanded')}
      >
        {row.getVisibleCells().map((cell, i) => {
          if (i === row.getVisibleCells().length - 1) {
            if (!reward) return null;

            const rewards = reward.rewardTokens.reduce((curr, rewardToken) => {
              const t = toToken(rewardToken.token);
              const isJelly = t.symbol === 'JELLY';

              return curr.add(
                new TokenAmount(t, rewardToken.amount)
                  .multiply(
                    toFraction(isJelly ? JELLY_VALUE : rewardToken.dollarValue)
                  )
                  .multiply(toFraction(feesPct))
                  .divide(100n)
              );
            }, new Fraction(0n));

            return (
              <td key={cell.id}>
                <span>{'$' + printUSD(Number(rewards.toSignificant(6)))}</span>
              </td>
            );
          }
          return (
            <td key={cell.id}>
              <span>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            </td>
          );
        })}

        <td className='position-summary'>
          {amount0 > 0n || amount1 > 0n ? (
            <>
              <span>
                {printBigintIsh(token0, amount0)} {token0.symbol}
              </span>
              <span>
                {printBigintIsh(token1, amount1)} {token1.symbol}
              </span>
              <span>{bins?.length} bins</span>
              <span>${printUSD(value, false)}</span>
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </td>

        <td>
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />{' '}
        </td>
      </tr>

      {expanded ? (
        <tr className='expanded'>
          <td colSpan={7}>
            <div className='top-title'>
              <h2>User Distribution</h2>
              <div className='address-action'>
                <span>Copy Address</span>
                <CopyIcon text={address} />
              </div>
              <div className='address-action'>
                <LinkIcon
                  link={routeNames.portfolioUser.replace(
                    ':userAddress',
                    address
                  )}
                  external={false}
                  text='Visit Portfolio'
                />
              </div>
              {FEATURE_FLAGS.COPY_DISTRIBUTION && (
                <Button
                  text='Copy distribution'
                  icon={faCopy}
                  onClick={onClick}
                  variant='text'
                  stretch={false}
                />
              )}
            </div>
            {bins && bins.length ? (
              <LiquidityBars bins={bins} aspect={6} />
            ) : areBinsLoading ? (
              <Spinner />
            ) : (
              <span>This address has removed its liquidity</span>
            )}
          </td>
        </tr>
      ) : null}
      <tr className='spacer'></tr>
    </>
  );
};

// type ClaimedInfo = { epoch: number; amount: bigint };

const Leaderboard = () => {
  const [epoch, setEpoch] = useState(currentEpoch);
  const isCurrentEpoch = epoch === currentEpoch;
  const selectedEpochIndex = epochs.findIndex((e) => e.id === epoch.id);
  const from = epoch.from.toString();
  const to = epoch.to.toString();
  const [showEpochs, setShowEpochs] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const { connectedAddress: address } = useContext(AccountWrapperContext);
  const {
    loading: loadingContext,
    pairAddress,
    rewardData: currentRewardData
  } = useContext(PoolContext);
  const poolAddress = pairAddress || '';

  const { data: rewardData } = trpc.getRewardPool.useQuery(
    { epoch: epoch.id, poolAddress },
    { enabled: !!pairAddress }
  );

  const rewardTokens =
    rewardData?.rewardTokens.map((r) =>
      getMasIfWmas(getTokenFromAddress(r.token.address))
    ) || [];

  const epochsClaimedAmountsQuery = useQueries({
    queries: epochs.map(({ id }) => ({
      queryKey: [
        'claimedAmounts',
        id,
        address,
        rewardTokens.map((t) => t.address)
      ],
      queryFn: () =>
        Promise.all(
          rewardTokens.map((token) =>
            fetchClaimedAmount(
              poolAddress,
              BigInt(id),
              address,
              token.equals(MASSA) ? '' : token.address
            )
          )
        ),
      enabled: !!poolAddress && !!address
    }))
  });
  const epochsClaimedAmounts = epochsClaimedAmountsQuery.map((q) => q.data);
  const epochClaimedAmounts = epochsClaimedAmounts[selectedEpochIndex];

  const args = {
    poolAddress,
    from,
    to
  };

  const leaderboardQuery = trpc.getLeaderboard.useQuery(
    { ...args, take: 20 },
    { enabled: !!poolAddress }
  );
  const { data: userfeesPct } = trpc.getUserfeesPct.useQuery(
    { ...args, address },
    { enabled: !!poolAddress && !!address }
  );
  const streakQuery = trpc.getStreak.useQuery(
    { poolAddress, address },
    { enabled: !!poolAddress && !!address }
  );
  const streak = streakQuery.data?.streak || 0;

  const table = useReactTable({
    data: leaderboardQuery.data || [],
    columns,
    state: {
      expanded
    },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  const renderLeaderboard = () => {
    if (leaderboardQuery.isLoading) return <Spinner />;

    if (leaderboardQuery.error) {
      console.error(leaderboardQuery.error);
      return <p>Error loading leaderboard</p>;
    }

    if (!leaderboardQuery.data) return <p>No leaderboard</p>;

    return (
      <div className='leaderboard-table'>
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={'tr' + headerGroup.id}>
                {headerGroup.headers.map((header, j) => {
                  if (j === headerGroup.headers.length - 1 && !rewardData)
                    return null;
                  return (
                    <th key={'th' + header.id}>
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
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <LiquidityBarsCell key={row.id} row={row} reward={rewardData} />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const { submitTx: claim, pending: pendingClaim } = useSendTransaction({
    data: buildClaimRewardTx(
      new Array(rewardTokens.length).fill(poolAddress, 0, rewardTokens.length),
      new Array(rewardTokens.length).fill(
        BigInt(epoch.id),
        0,
        rewardTokens.length
      ),
      rewardTokens.map((t) => (t.equals(MASSA) ? '' : t.address)) || []
    ),
    onTxConfirmed: () => epochsClaimedAmountsQuery[selectedEpochIndex].refetch()
  });

  const getDisabledTextClaim = () => {
    if (isCurrentEpoch) return 'The epoch is still ongoing';
    if (epochsClaimedAmountsQuery[selectedEpochIndex].isFetching)
      return 'Claim Rewards';
    if (userfeesPct && userfeesPct > 0) {
      if (epochClaimedAmounts === undefined)
        return 'Rewards will be claimable soon';
      if (!epochClaimedAmounts?.some((e) => e && e > 0n))
        return 'Rewards already claimed';
    }
    if (epochClaimedAmounts === null || userfeesPct === null)
      return 'No rewards to claim';
    return undefined;
  };

  if (loadingContext) return <Spinner />;
  return (
    <div className='Leaderboard'>
      {epochs && (
        <section className='relative'>
          <Dropdown
            isOpen={showEpochs}
            setIsOpen={setShowEpochs}
            position='bottom'
            triggerButton={
              <div
                className={clsx(
                  'epoch',
                  FEATURE_FLAGS.REWARDS &&
                    epochsClaimedAmounts.some(
                      (e) =>
                        e &&
                        e.some((amount) => amount !== undefined && amount > 0n)
                    ) &&
                    'red-notif'
                )}
              >
                <span>Epoch {epoch.id}</span>
                <span className='print-date'>
                  {printDate(epoch.from, TimeWindow.Week)} -{' '}
                  {printDate(epoch.to, TimeWindow.Week)}
                </span>
                <FontAwesomeIcon icon={faChevronDown} />
              </div>
            }
          >
            {epochs
              .toSorted((a, b) => b.id - a.id)
              .map((_epoch, i) => {
                return (
                  <a
                    key={'epoch ' + epoch.from.toString() + i}
                    onClick={() => {
                      setEpoch(_epoch);
                      setShowEpochs(false);
                    }}
                    className={clsx(
                      FEATURE_FLAGS.REWARDS &&
                        epochsClaimedAmounts[
                          epochsClaimedAmounts.length - 1 - i
                        ]?.some((e) => e && e > 0n) &&
                        'red-notif'
                    )}
                  >
                    <div className='epoch'>
                      <span>Epoch {_epoch.id}</span>
                      <span className='print-date'>
                        {printDate(_epoch.from, TimeWindow.Week)} -{' '}
                        {printDate(_epoch.to, TimeWindow.Week)}
                      </span>
                    </div>
                  </a>
                );
              })}
          </Dropdown>
        </section>
      )}
      <section className='rewards-container'>
        {FEATURE_FLAGS.REWARDS ? (
          <>
            {rewardData ? (
              <div>
                <div className='rewards-tooltip'>
                  <h3>Rewards</h3>
                  <Tooltip
                    trigger={<FontAwesomeIcon icon={faCircleQuestion} />}
                  >
                    Qualify for rewards by adding liquidity into the active bin
                  </Tooltip>
                </div>
                <RewardsInfo
                  rewardData={rewardData}
                  currentRewardData={currentRewardData}
                  epoch={epoch}
                  isCurrentEpoch={isCurrentEpoch}
                />
              </div>
            ) : null}
            {rewardData ? (
              <div>
                <div className='rewards-tooltip'>
                  <h3>Claimable Rewards</h3>
                  <Tooltip
                    trigger={<FontAwesomeIcon icon={faCircleQuestion} />}
                  >
                    Rewards are claimable for 4 epochs.
                  </Tooltip>
                </div>
                <div className='claimable-container'>
                  {address ? (
                    <>
                      <div className='rewards-info-container'>
                        <div className='title'>
                          {isCurrentEpoch ||
                          (userfeesPct &&
                            userfeesPct > 0 &&
                            epochClaimedAmounts === null)
                            ? 'Estimated r'
                            : 'R'}
                          ewards on Epoch {epoch.id}
                        </div>
                        <div className='rewards-tokens-value'>
                          {epochClaimedAmounts?.length ? (
                            !epochClaimedAmounts?.some((e) => e && e > 0n) &&
                            !isCurrentEpoch &&
                            !(
                              epochClaimedAmounts === null ||
                              userfeesPct === null
                            ) ? (
                              <div>No more reward to claim</div>
                            ) : (
                              rewardData.rewardTokens.map((rt, i) => {
                                if (!epochClaimedAmounts) return null;
                                const tok = getMasIfWmas(
                                  getTokenFromAddress(rt.token.address)
                                );

                                const amt = isCurrentEpoch
                                  ? BigInt(rt.amount)
                                  : (epochClaimedAmounts[i] ?? 0n);
                                const pct = isCurrentEpoch
                                  ? (userfeesPct ?? 0)
                                  : 100;
                                const multiplier =
                                  tok.symbol === 'JELLY'
                                    ? JELLY_VALUE
                                    : rt.dollarValue;
                                const usdValue =
                                  Number(
                                    roundTokenAmount(tok, amt) *
                                      pct *
                                      multiplier
                                  ) / 100;
                                const tokenAmount = formatNumber(
                                  (roundTokenAmount(tok, amt) * pct) / 100
                                );

                                return (
                                  <div key={rt.token.address}>
                                    ${printUSD(usdValue)} ({tokenAmount}{' '}
                                    {tok.symbol})
                                  </div>
                                );
                              })
                            )
                          ) : (
                            <Skeleton />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className='rewards-info-container'>
                      <span>Connect wallet to see your rewards</span>
                    </div>
                  )}
                </div>
                {BLACKLIST.includes(address) ? (
                  <span className='blacklisted'>
                    Abusive behaviour detected
                  </span>
                ) : null}
                {address && (
                  <Button
                    text='Claim Rewards'
                    variant='contained'
                    onClick={claim}
                    pending={pendingClaim}
                    disabledText={getDisabledTextClaim()}
                  />
                )}
              </div>
            ) : null}
            {FEATURE_FLAGS.STREAK && streakQuery.data && rewardData && (
              <div className='streak-container'>
                <div className='streak-header'>
                  <div className='rewards-tooltip'>
                    <h3>Streak</h3>
                    <Tooltip
                      trigger={<FontAwesomeIcon icon={faCircleQuestion} />}
                    >
                      Earn extra rewards by increasing your weekly streak of
                      active liquidity
                    </Tooltip>
                  </div>
                  <Tooltip
                    trigger={<span className='pill rewards'>Rewards</span>}
                    position='top'
                  >
                    <div className='bonus-content'>
                      <span>+5% extra rewards per week streak</span>
                      <span>up to +30% additional rewards</span>
                      {/* <span>win an OG NFT by completing the 6 weeks streak</span> */}
                    </div>
                  </Tooltip>
                </div>
                <div className='streak-content'>
                  <div className='streak-percentage'>
                    <StreakGeometry streak={streak} index={6} />
                    <StreakGeometry streak={streak} index={1} />
                    <StreakGeometry streak={streak} index={5} />
                    <StreakGeometry streak={streak} index={2} />
                    <StreakGeometry streak={streak} index={4} />
                    <StreakGeometry streak={streak} index={3} />
                  </div>
                  <StreakCircle streak={streak} isHover={false} />
                  <StreakCircle streak={streak} isHover={true} />
                </div>
              </div>
            )}
          </>
        ) : null}
      </section>
      <section>
        <h3>Leaderboard</h3>
        {renderLeaderboard()}
      </section>
    </div>
  );
};

const StreakCircle = ({
  streak,
  isHover
}: {
  streak: number;
  isHover: boolean;
}) => {
  const displayStreak = streak >= 6 ? 6 : isHover ? streak + 1 : streak;
  const rewards = 5 * (streak >= 6 ? 6 : streak);

  return (
    <div
      className={clsx(
        'streak-circle-outer',
        isHover && 'streak-circle-outer-hover',
        `streak${displayStreak}`
      )}
    >
      <div className='streak-circle-inner'>
        <div className='icon-container'>
          <svg
            fill='rgb(255, 136, 0)'
            height={45}
            width={45}
            viewBox='0 0 611.999 611.999'
          >
            <g>
              <path
                d='M216.02,611.195c5.978,3.178,12.284-3.704,8.624-9.4c-19.866-30.919-38.678-82.947-8.706-149.952
                c49.982-111.737,80.396-169.609,80.396-169.609s16.177,67.536,60.029,127.585c42.205,57.793,65.306,130.478,28.064,191.029
                c-3.495,5.683,2.668,12.388,8.607,9.349c46.1-23.582,97.806-70.885,103.64-165.017c2.151-28.764-1.075-69.034-17.206-119.851
                c-20.741-64.406-46.239-94.459-60.992-107.365c-4.413-3.861-11.276-0.439-10.914,5.413c4.299,69.494-21.845,87.129-36.726,47.386
                c-5.943-15.874-9.409-43.33-9.409-76.766c0-55.665-16.15-112.967-51.755-159.531c-9.259-12.109-20.093-23.424-32.523-33.073
                c-4.5-3.494-11.023,0.018-10.611,5.7c2.734,37.736,0.257,145.885-94.624,275.089c-86.029,119.851-52.693,211.896-40.864,236.826
                C153.666,566.767,185.212,594.814,216.02,611.195z'
              />
            </g>
          </svg>
        </div>
        <div className='streak-text-container'>
          <span className='streak-text'>
            {streak} week{streak > 1 ? 's' : ''} streak
          </span>
          <span className='streak-text'>+{rewards}% rewards</span>
        </div>
      </div>
    </div>
  );
};

const StreakGeometry = ({
  streak,
  index
}: {
  streak: number;
  index: number;
}) => {
  return (
    <div
      className={clsx(
        streak >= index && 'streak-active',
        streak === index - 1 && 'streak-pre-active'
      )}
    >
      +5%
    </div>
  );
};

export default Leaderboard;
