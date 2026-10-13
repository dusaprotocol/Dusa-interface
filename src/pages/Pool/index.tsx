import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback
} from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import {
  faArrowRight,
  faExternalLink,
  faGear,
  faShare,
  faTractor
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Args, ArrayTypes } from '@massalabs/massa-web3';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from 'components/Button';
import Dropdown from 'components/Dropdown';
import MigrationModal from 'components/MigrationModal';
import PageHeader from 'components/PageHeader';
import ShareModal from 'components/ShareModal';
import Spinner from 'components/Spinner';
import Tabs from 'components/Tabs';
import TokenLogo from 'components/TokenLogo';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { fetchAL } from 'hooks/useFetchAL';
import { usePairAddress } from 'hooks/useFetchData';
import usePairInformation from 'hooks/useFetchData/pairInformation';
import useGetTokensFromURL from 'hooks/useGetTokensFromURL';
import usePairManager from 'hooks/usePairManager';
import ErrorPage from 'pages/ErrorPage';
import { buildPoolRoute } from 'routes';
import { FEATURE_FLAGS } from 'utils/config';
import { currentEpoch, POINT_VALUE_AFTER_50 } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchDepth,
  fetchUserLiquidityBins,
  fetchUserLiquidityFees
} from 'utils/datastoreFetcher';
import {
  binStepToDepth,
  buildExplorerLink,
  calculateAPR,
  calculateRewardAPR,
  calculateTVL,
  printAddress,
  roundFractionPrice,
  sumBinAmounts,
  sumVaults,
  toFraction
} from 'utils/methods';
import { defaultDeposit } from 'utils/placeholders';
import { pools } from 'utils/pools';
import { getImportedPools, updateImportedPools } from 'utils/storage';
import { USDC } from 'utils/tokens';
import { toBI } from 'utils/transactionBuilder';
import { Reward, trpc } from 'utils/trpc';
import {
  Bin,
  Vault,
  Deposits,
  Token,
  Version,
  Pool as _Pool
} from 'utils/types';
import AddLiquidity, { AddLiquidityProps } from './components/AddLiquidity';
import Analytics from './components/Analytics';
import Leaderboard from './components/Leaderboard';
import MyLiquidity from './components/MyLiquidity';
import RemoveLiquidity from './components/RemoveLiquidity';
import Withdraw from './components/Withdraw';
import './index.scss';

export interface PoolContextProps extends ReturnType<typeof usePairManager> {
  loading: boolean;
  invertPrice: boolean;
  token0: Token;
  token1: Token;
  binStep: number;
  version: Version;
  liquidityBins: Bin[] | undefined;
  depositBalance: Deposits;
  claimableFees: Deposits;
  setActiveTab: React.Dispatch<React.SetStateAction<number>>;
  fetchLiquidityAndTVL: () => void;
  fetchAutonomousLiquidity: () => void;
  addLiquidityParams: AddLiquidityProps | undefined;
  setAddLiquidityParams: React.Dispatch<
    React.SetStateAction<AddLiquidityProps | undefined>
  >;
  autoChangeQuantity: boolean;
  setAutoChangeQuantity: React.Dispatch<React.SetStateAction<boolean>>;
  autonomousLiquidityBins: Bin[];
  depositALBalance: Deposits;
  vaults: Vault[];
  tvl: number;
  actualTVL: number;
  tokenReserves: [bigint, bigint] | undefined;
  rewardData?: Reward & { apr: number };
  airdropData: { apr: number };
}

export const PoolContext = createContext<PoolContextProps>(
  {} as PoolContextProps
);

const Pool = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [invertPrice, setInvertPrice] = useState(true);
  const [addLiquidityParams, setAddLiquidityParams] =
    useState<AddLiquidityProps>();
  const [poolsImported, setPoolsImported] = useState(getImportedPools());
  const [showShareModal, setShowShareModal] = useState(false);
  const [autoChangeQuantity, setAutoChangeQuantity] = useState(true);

  const { connectedAddress } = useContext(AccountWrapperContext);

  const urlParams = useGetTokensFromURL();
  const {
    token0,
    token1,
    binStep,
    version,
    setToken0,
    setToken1,
    error: _error
  } = urlParams;

  const tokenA = token0 && getWmasIfMas(token0);
  const tokenB = token1 && getWmasIfMas(token1);

  const comparePools = (a: _Pool, b: Partial<_Pool>) => {
    return a.pairAddress === b.pairAddress;
    // return (
    //   a.token0.address === b.token0.address && a.token1.address === b.token1.address && a.binStep === b.binStep && a.version === b.version
    // );
  };

  const __pool: Partial<_Pool> = {
    token0: tokenA,
    token1: tokenB,
    binStep,
    version
  };

  const isPoolImported = poolsImported.some((pool) => {
    return comparePools(pool, __pool);
  });

  const isPoolNative = pools.some((pool) => {
    return comparePools(pool, __pool);
  });

  const _fetchAutonomousLiquidity = () => {
    if (!token0 || !token1 || !binStep) return;

    return fetchAL({
      token0,
      token1,
      binStep: binStep || 0,
      userAddress: connectedAddress
    });
  };
  const autonomousLiquidityQuery = useQuery(
    [
      'autonomousLiquidity',
      token0?.address,
      token1?.address,
      binStep,
      connectedAddress
    ],
    _fetchAutonomousLiquidity,
    {
      enabled:
        FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && !!token0 && !!token1 && !!binStep
    }
  );
  const vaults = autonomousLiquidityQuery.data || [];

  const { search } = useLocation();
  useEffect(() => {
    const query = new URLSearchParams(search);
    const { tab } = Object.fromEntries(query);
    if (tab) {
      tab === 'analytics' && setActiveTab(1);
      tab === 'leaderboard' && setActiveTab(2);
    }
  }, [search]);

  // add '?tab=analytics' to the URL on mount and remove it on unmount
  const history = useNavigate();
  useEffect(() => {
    const historySearch =
      activeTab === 0
        ? {}
        : activeTab === 1
          ? { search: 'tab=analytics' }
          : activeTab === 2
            ? { search: 'tab=leaderboard' }
            : {};
    history(historySearch);
  }, [activeTab]);

  const pm = usePairManager({
    ...urlParams,
    setToken0,
    setToken1
  });
  const poolAddress = pm.pairAddress || '';
  const v2PoolAddressQuery = usePairAddress({
    ...urlParams,
    version: 'V2'
  });
  const v2PoolAddress = v2PoolAddressQuery.data;
  const v2PairInfoQuery = usePairInformation(v2PoolAddress);
  const v2ActiveId = v2PairInfoQuery.data?.activeId || 0;

  const {
    data: tvlData,
    isLoading: tvlLoading,
    refetch: refetchTvl
  } = usePairInformation(poolAddress);

  const enabledFetchLiquidity =
    !!poolAddress && !!connectedAddress && !!token0 && !!token1 && !!binStep;
  const { data: liquidityData, refetch: refetchLiquidity } = useQuery(
    ['liquidity', poolAddress, connectedAddress],
    () =>
      fetchUserLiquidityBins(
        connectedAddress,
        poolAddress,
        token0!,
        token1!,
        binStep!
      ),
    { enabled: enabledFetchLiquidity }
  );
  const liquidityBins = liquidityData || [];

  const { data: feesData, refetch: refetchFees } = useQuery(
    ['fees', poolAddress, connectedAddress],
    () =>
      fetchUserLiquidityFees(
        connectedAddress,
        poolAddress,
        liquidityBins.map((b) => b.id)
      ),
    {
      enabled:
        enabledFetchLiquidity && !!liquidityBins.length && version === 'V1'
    }
  );

  const DEPTH = binStep ? binStepToDepth(binStep) : 0;
  const { data: depth } = useQuery(
    ['depth', DEPTH, poolAddress],
    () => fetchDepth(poolAddress, binStep || 0, pm.activeId || 0, DEPTH),
    { enabled: !!poolAddress && !!binStep && !!pm.activeId }
  );

  const opts = { enabled: !!poolAddress };
  const { data: rewardsData } = trpc.getRewardPool.useQuery(
    { epoch: currentEpoch.id, poolAddress },
    opts
  );

  const weeklyMetricsQuery = trpc.getPointsAPR2.useQuery({ poolAddress }, opts);

  const fetchLiquidityAndTVL = useCallback(() => {
    // Debounce multiple simultaneous calls
    setTimeout(() => {
      refetchTvl();
      refetchLiquidity();
      refetchFees(); // not sure its rly needed
    }, 50);
  }, [refetchTvl, refetchLiquidity]);

  const loading =
    _error === undefined || !poolAddress || tvlLoading || !token0 || !token1;
  const error = _error || !token0 || !token1 || !binStep || !tokenA || !tokenB;

  if (loading) return <Spinner />;
  if (error) return <ErrorPage />;

  const tokenReserves: [bigint, bigint] = [
    tvlData?.reserveX || 0n,
    tvlData?.reserveY || 0n
  ];
  // fcking typescript
  const amount0 = new TokenAmount(token0 || USDC, tokenReserves[0]);
  const amount1 = new TokenAmount(token1 || USDC, tokenReserves[1]);
  const tvl = calculateTVL(
    amount0,
    amount1,
    pm.dollarValue0 || 0,
    pm.dollarValue1 || 0
  );

  const claimableFees = feesData ?? defaultDeposit;

  const depositALBalance = sumBinAmounts(sumVaults(vaults));
  const depositBalance = sumBinAmounts(liquidityBins || []);
  const autonomousLiquidityBins = sumVaults(vaults);

  // TVL in +/- x% depth
  const getActualTVL = () => {
    if (!depth || !pm.dollarValue0 || !pm.dollarValue1 || !token0 || !token1)
      return 0;
    return calculateTVL(
      new TokenAmount(token0, depth.reservesX),
      new TokenAmount(token1, depth.reservesY),
      pm.dollarValue0,
      pm.dollarValue1
    );
  };

  const actualTVL = getActualTVL();

  const depthToTVLRatio = actualTVL / tvl;

  const weeklyMetrics = weeklyMetricsQuery.data;
  const weeklyTVL = weeklyMetrics?.lastAvgTVL || 0;
  const depthWeeklyTVL = weeklyTVL * depthToTVLRatio;
  const potentialMakerPoints = weeklyMetrics?.pointsDistributed || 0;
  const potentialMakerAirdrop = potentialMakerPoints * POINT_VALUE_AFTER_50;
  const airdropAPR = calculateAPR(
    toFraction(potentialMakerAirdrop / 7),
    depthWeeklyTVL
  );

  const rewardsAPR =
    rewardsData && tvl
      ? calculateRewardAPR(rewardsData.rewardTokens, currentEpoch, actualTVL)
      : 0;

  const pool: _Pool = {
    token0: tokenA,
    token1: tokenB,
    binStep,
    pairAddress: poolAddress,
    version
  };

  const ids = (liquidityBins || []).map((bin) => bin.id);
  const migrateArgs = new Args()
    .addString(v2PoolAddress || '')
    .addString(poolAddress)
    .addArray(ids.map(toBI), ArrayTypes.U64)
    .serialize();
  const migrateDescription = '';

  return (
    <>
      <div className='Pool'>
        <div className='infos-pools'>
          <PageHeader backTo='pools'>
            <div className='pool-header-container'>
              <div className='title-tokens'>
                <div>
                  <TokenLogo logoURI={token0.logoURI} size={30} />
                  <span>{token0.symbol}</span>
                  <span>/</span>
                  <TokenLogo logoURI={token1.logoURI} size={30} />
                  <span>{token1.symbol}</span>
                </div>
                <div className='pills'>
                  <div className='pool-bps-pct'>{binStep} bps</div>
                  <div className='pool-bps-pct'>{version}</div>
                  {rewardsData ? (
                    <div className='pool-bps-pct'>Rewards</div>
                  ) : null}
                  <div className='pool-address-link active'>
                    <a
                      href={buildExplorerLink(poolAddress)}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {printAddress(poolAddress)}
                      <FontAwesomeIcon icon={faExternalLink} size='xs' />
                    </a>
                  </div>
                </div>
              </div>
              <div className='pool-header-button-container'>
                <div className='pool-header-buttons'>
                  {!isPoolNative && (
                    <div
                      className={clsx(isPoolImported && 'imported')}
                      onClick={() => {
                        if (isPoolImported) return;

                        const _pools = [...poolsImported, pool];
                        updateImportedPools(_pools);
                        setPoolsImported(_pools);
                      }}
                    >
                      {isPoolImported
                        ? 'Pool imported to Pools ✅'
                        : 'Import to Pools'}
                    </div>
                  )}
                  {isPoolNative ? null : (
                    <div onClick={() => setShowShareModal(true)}>
                      Share pool <FontAwesomeIcon icon={faShare} />
                    </div>
                  )}
                  <div className='pool-address-link'>
                    <Link
                      to={`/trade?tokenIn=${token0.address}&tokenOut=${token1.address}`}
                    >
                      Swap
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </PageHeader>
        </div>
        <PoolContext.Provider
          value={{
            ...pm,
            loading,
            invertPrice,
            token0,
            token1,
            binStep,
            version,
            liquidityBins,
            depositBalance,
            depositALBalance,
            claimableFees,
            autonomousLiquidityBins,
            fetchLiquidityAndTVL,
            fetchAutonomousLiquidity: autonomousLiquidityQuery.refetch,
            setActiveTab,
            addLiquidityParams,
            setAddLiquidityParams,
            autoChangeQuantity,
            setAutoChangeQuantity,
            vaults,
            tvl,
            actualTVL,
            tokenReserves,
            rewardData: rewardsData
              ? { ...rewardsData, apr: rewardsAPR }
              : undefined,
            airdropData: { apr: airdropAPR }
          }}
        >
          <div className='container-pools'>
            <div className='below-header'>
              <Tabs
                tabs={['Manage', 'Analytics', 'Leaderboard/Rewards']}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                variant='bottom-plane'
              />
              <div className='price-settings'>
                <div className='current-price'>
                  <span>Current price:</span>
                  <span>
                    {invertPrice
                      ? `1 ${token0.symbol} = ${roundFractionPrice(
                          pm.priceAdjusted
                        )} ${token1.symbol}`
                      : `1 ${token1.symbol} = ${roundFractionPrice(
                          pm.priceAdjusted.invert()
                        )} ${token0.symbol}`}
                  </span>
                </div>

                <div className='active-manage'>
                  {[token0, token1].map((token, i) => (
                    <button
                      key={token.address}
                      className={invertPrice === (i === 0) ? 'active' : ''}
                      onClick={() => setInvertPrice(i === 0)}
                    >
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className='tabs-container'>
              <div className='tabs-content'>
                {activeTab === 0 ? (
                  <>
                    <Manage />
                  </>
                ) : activeTab === 1 ? (
                  <Analytics />
                ) : activeTab === 2 ? (
                  <Leaderboard />
                ) : null}
              </div>
            </div>
          </div>
          {showShareModal && (
            <ShareModal
              showModal={showShareModal}
              setShowModal={setShowShareModal}
              pool={pool}
            />
          )}
        </PoolContext.Provider>
      </div>
    </>
  );
};

const Manage = () => {
  const [activeManageTab, setActiveManageTab] = useState(0);
  const [activeRemoveTab, setActiveRemoveTab] = useState(0);
  const [showDropDown, setShowDropDown] = useState(false);

  const [showMigrateModal, setShowMigrateModal] = useState(false);

  const {
    amountLiquiditySlippage,
    priceLiquiditySlippage,
    setAmountLiquiditySlippage,
    setPriceLiquiditySlippage
  } = useContext(SettingsContext);

  const {
    liquidityBins,
    autonomousLiquidityBins,
    version,
    token0,
    token1,
    binStep,
    pairAddress
  } = useContext(PoolContext);

  const noLiquidity =
    !liquidityBins?.length &&
    (!autonomousLiquidityBins?.length || !FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY);

  const tokenA = token0 && getWmasIfMas(token0);
  const tokenB = token1 && getWmasIfMas(token1);

  const pool: _Pool = {
    token0: tokenA,
    token1: tokenB,
    binStep,
    pairAddress: pairAddress || '',
    version
  };

  const v2PoolAddressQuery = usePairAddress({
    ...pool,
    version: 'V2'
  });
  const v2PoolAddress = v2PoolAddressQuery.data;

  const ids = (liquidityBins || []).map((bin) => bin.id);
  const migrateArgs = new Args()
    .addString(v2PoolAddress || '')
    .addString(pairAddress || '')
    .addArray(ids.map(toBI), ArrayTypes.U64)
    .serialize();
  const migrateDescription = '';

  const defaultSlippages = [10, 50, 100];

  const handleAmountLiquiditySlippageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (value >= 0.01 && value <= 100) {
      setAmountLiquiditySlippage(parseInt((value * 100).toString()));
    }
  };

  const handlePriceLiquiditySlippageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (value >= 0.01 && value <= 100) {
      setPriceLiquiditySlippage(parseInt((value * 100).toString()));
    }
  };

  return (
    <div className='manage-liquidity'>
      <div className='add-liquidity'>
        <div className='pool-liquidity-header'>
          <div className='active-manage'>
            {['Add Liquidity', 'Remove Liquidity'].map((heading, index) => {
              return (
                <button
                  key={index}
                  className={index === activeManageTab ? 'active' : ''}
                  onClick={() => setActiveManageTab(index)}
                >
                  {heading}
                </button>
              );
            })}
          </div>
          <div className='dropdown-settings-container'>
            <Dropdown
              isOpen={showDropDown}
              setIsOpen={setShowDropDown}
              triggerButton={
                <div className='trigger'>
                  <FontAwesomeIcon icon={faGear} />
                </div>
              }
              position='bottom left'
            >
              <div className='swap-settings-container'>
                <h3>Settings</h3>
                <div className='swap-settings-content'>
                  <div className='settings-parameter'>
                    <div className='slippage-header'>
                      <SimpleTooltip
                        title='Liquidity Slippage Amount'
                        description='Your transaction will revert if the amount changes unfavorably by more than this percentage. Default is 0.5%.'
                        position='bottom'
                      />
                      <span>{amountLiquiditySlippage / 100}%</span>
                    </div>
                    <div className='parameter-values'>
                      {defaultSlippages.map((defaultSlippage, index) => {
                        return (
                          <button
                            key={index}
                            onClick={() =>
                              setAmountLiquiditySlippage(defaultSlippage)
                            }
                            className={
                              defaultSlippage === amountLiquiditySlippage
                                ? 'active'
                                : ''
                            }
                          >
                            {defaultSlippage / 100}%
                          </button>
                        );
                      })}
                      <div
                        className={
                          defaultSlippages.includes(amountLiquiditySlippage)
                            ? 'custom-slippage'
                            : 'custom-slippage active'
                        }
                      >
                        <input
                          type='number'
                          step={0.1}
                          inputMode='decimal'
                          min={0.01}
                          max={100}
                          placeholder={
                            defaultSlippages.includes(amountLiquiditySlippage)
                              ? '0.05'
                              : (amountLiquiditySlippage / 100).toString()
                          }
                          onChange={handleAmountLiquiditySlippageChange}
                          onFocus={handleAmountLiquiditySlippageChange}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                  <div className='settings-parameter'>
                    <div className='slippage-header'>
                      <SimpleTooltip
                        title='Price Liquidity Slippage'
                        description='Your transaction will revert if the price changes unfavorably by more than this percentage. Default is 0.5%.'
                        position='bottom'
                      />
                      <span>{priceLiquiditySlippage / 100}%</span>
                    </div>
                    <div className='parameter-values'>
                      {defaultSlippages.map((defaultSlippage, index) => {
                        return (
                          <button
                            key={index}
                            onClick={() =>
                              setPriceLiquiditySlippage(defaultSlippage)
                            }
                            className={
                              defaultSlippage === priceLiquiditySlippage
                                ? 'active'
                                : ''
                            }
                          >
                            {defaultSlippage / 100}%
                          </button>
                        );
                      })}
                      <div
                        className={
                          defaultSlippages.includes(priceLiquiditySlippage)
                            ? 'custom-slippage'
                            : 'custom-slippage active'
                        }
                      >
                        <input
                          type='number'
                          step={0.1}
                          inputMode='decimal'
                          min={0.01}
                          max={100}
                          placeholder={
                            defaultSlippages.includes(priceLiquiditySlippage)
                              ? '0.05'
                              : (priceLiquiditySlippage / 100).toString()
                          }
                          onChange={handlePriceLiquiditySlippageChange}
                          onFocus={handlePriceLiquiditySlippageChange}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                  {/* <div className='settings-parameter'>
                  <div className='pro-mode'>
                    <span>Trade Pro Interface</span>
                    <div
                      className={clsx('check-pro-mode', pro && 'active')}
                      onClick={() =>
                        setInterfaceLevel(
                          interfaceLevel === 'pro' ? 'classic' : 'pro'
                        )
                      }
                    >
                      <div className='pro-mode-switch'></div>
                    </div>
                  </div>
                </div> */}
                </div>
              </div>
            </Dropdown>
          </div>
        </div>
        <div className='manage-container'>
          {activeManageTab === 0 ? (
            <AddLiquidity />
          ) : (
            <>
              {FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && (
                <div className='active-manage'>
                  {['Autonomous Liquidity', 'Manual Liquidity'].map(
                    (heading, index) => {
                      return (
                        <button
                          key={index}
                          className={index === activeRemoveTab ? 'active' : ''}
                          onClick={() => setActiveRemoveTab(index)}
                        >
                          {heading}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
              {activeRemoveTab === 0 && FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY ? (
                <div className='remove-tokens'>
                  <h3>Remove Autonomous Liquidity</h3>
                  <Withdraw />
                </div>
              ) : (
                <div>
                  {FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && (
                    <h3>Remove Manual Liquidity</h3>
                  )}
                  <RemoveLiquidity />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        {FEATURE_FLAGS.CORE_V2 && pool.version === 'V1' && v2PoolAddress ? (
          <div className='migrate-container'>
            <FontAwesomeIcon icon={faTractor} />
            <div>
              <span>This pool is moving</span>
              {!noLiquidity && <span>Please migrate your liquidity</span>}
            </div>

            {!FEATURE_FLAGS.MIGRATE_SCRIPT ? (
              <Link to={buildPoolRoute({ ...pool, version: 'V2' })}>
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            ) : (
              <Button
                variant='outlined'
                text=''
                onClick={() => setShowMigrateModal(true)}
                stretch={false}
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </Button>
            )}
          </div>
        ) : null}
        <MyLiquidity />
      </div>

      {showMigrateModal && (
        <MigrationModal
          showModal={showMigrateModal}
          setShowModal={setShowMigrateModal}
          description={migrateDescription}
          args={migrateArgs}
        />
      )}
    </div>
  );
};

export default Pool;
