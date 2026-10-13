import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Fraction,
  Percent,
  SwapParameters,
  TradeOptions,
  parseUnits
} from '@dusalabs/sdk';
import { LimitOrder } from '@dusalabs/sdk';
import {
  faAngleDown,
  faAngleUp,
  faArrowRight,
  faArrowsRotate,
  faCalendarCheck,
  faCircleQuestion,
  faGear,
  faInfinity,
  faRightLeft
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Args } from '@massalabs/massa-web3';
import clsx from 'clsx/lite';
import debounce from 'lodash.debounce';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import ChartSvg from 'components/ChartSvg';
import ConnectButton from 'components/ConnectButton';
import Dropdown from 'components/Dropdown';
import Input from 'components/Input';
import InvertTokens from 'components/InvertTokens';
import LimitOrderPoolsModal from 'components/LimitOrderPoolsModal';
import Modal from 'components/Modal';
import Spinner from 'components/Spinner';
import TokenInput from 'components/TokenInput';
import Tooltip, { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import useFetchAllPools from 'hooks/useFetchAllPools';
import usePairManager from 'hooks/usePairManager';
import useResizeWindow from 'hooks/useResizeWindow';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { DCACard } from 'pages/DCA';
import { TradeContext } from 'pages/Trade';
import { routeNames } from 'routes';
import { FEATURE_FLAGS, routerV2SC } from 'utils/config';
import { U256_MAX, POINT_VALUE } from 'utils/constants';
import { getMasIfWmas, getWmasIfMas } from 'utils/coreMethods';
import {
  formatNumberWithSubscriptZeros,
  getLogoURIFromToken,
  isInDusaSeason,
  printBigintIsh,
  printUSD,
  roundFractionPrice,
  roundFractionPriceAdaptive,
  toFraction
} from 'utils/methods';
import { MASSA, WMAS } from 'utils/tokens';
import {
  buildIncreaseAllowanceTx,
  buildSwapTx,
  buildUnwrapTx,
  buildWrapTx
} from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';
import { Allowance, Token, Version } from 'utils/types';
import './index.scss';
import { useManageOrders } from 'hooks/useManageOrders';
import Skeleton from 'components/Skeleton';
import { DateTimePicker } from 'components/DateTimePicker';

interface SwapCardProps {
  // activeDCAs?: DCAInterface[] | undefined;
  // setActiveDCAs?: React.Dispatch<
  //   React.SetStateAction<DCAInterface[] | undefined>
  // >;
  setActiveOrders?: React.Dispatch<
    React.SetStateAction<LimitOrder[] | undefined>
  >;
  isFromFixed?: boolean;
  isToFixed?: boolean;
  isDCADisabled?: boolean;
}

const tabs = ['Swap', 'Limit', 'DCA'] as const;
type Tab = (typeof tabs)[number];

const defaultSlippages = [2, 5, 10]; // base 10000, 0.02%, 0.05%, 0.1%

const SwapCard = ({
  // activeDCAs,
  // setActiveDCAs,
  setActiveOrders,
  isFromFixed = false,
  isToFixed = false,
  isDCADisabled = false
}: SwapCardProps) => {
  const [showDropDown, setShowDropDown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLimitOrderPoolsModal, setShowLimitOrderPoolsModal] =
    useState(false);
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const { search } = useLocation();
  const history = useNavigate();
  const searchParams = new URLSearchParams(search);
  const activeTab: Tab = searchParams.has('tab')
    ? (searchParams.get('tab') as Tab)
    : 'Swap';

  const {
    token0Swap: token0,
    setToken0Swap: setToken0,
    token1Swap: token1,
    setToken1Swap: setToken1,
    binStep,
    displayChart,
    setDisplayChart
  } = useContext(TradeContext);

  const { interfaceLevel, setInterfaceLevel } = useContext(SettingsContext);

  const [showDetails, setShowDetails] = useState(false);
  const [whereQuantityChange, setWhereQuantityChange] = useState<
    'token0' | 'token1'
  >('token0');

  // limit order
  // TODO: move to separate hook/comopnent

  const pro = interfaceLevel === 'pro';
  const { innerWidth: width } = useResizeWindow();
  const isMobile = width <= 768;

  const tokensSet = !!token0 && !!token1;

  const swapForY = tokensSet && token0.address > token1.address;
  const isMasWmasPair = tokensSet
    ? (token0.equals(WMAS) && token1.equals(MASSA)) ||
      (token0.equals(MASSA) && token1.equals(WMAS))
    : false;
  const isMasToken0 = token0?.equals(MASSA); // token0.isNative;
  const isWmasToken0 = token0?.equals(WMAS);
  const isMasToken1 = token1?.equals(MASSA);

  const { connected, connectedAddress } = useContext(AccountWrapperContext);
  const { swapSlippage, setSwapSlippage } = useContext(SettingsContext);

  const spenderAddress = routerV2SC;
  const allowanceQuery = useFetchAllowance({
    tokenAddress: token0?.address,
    spenderAddress
  });
  const allowance = allowanceQuery.data || 0n;

  const {
    balance0: balance0Raw,
    balance1: balance1Raw,
    quantity0,
    quantity1,
    pairAddress,
    pairAddressLoading,
    activeId,
    bestTrade,
    fetchingTrade,
    dollarValue0,
    dollarValue1,
    notEnoughLiq,
    fetchBalances,
    resetTokensInputs,
    changeQuantity,
    changeQuantityWithFixedPrice,
    changeQuantityWrapped,
    fetchBestTrade,
    changeToken,
    invertTokens
  } = usePairManager({
    token0,
    setToken0,
    token1,
    setToken1,
    binStep,
    activeTab
  });

  const balance0 = balance0Raw || 0n;

  const tokenUndefined = !token0 || !token1;

  // Define amounts and slippage before useManageOrders hook
  const allowedSlippage = new Percent(BigInt(swapSlippage), 10000n);
  const amountIn =
    quantity0 && token0 ? parseUnits(quantity0, token0.decimals) : 0n;
  const amountOut =
    quantity1 && token1 ? parseUnits(quantity1, token1.decimals) : 0n;

  const {
    // Transaction functions
    submitLimitOrderTx: addLimitOrder,
    pendingLimitOrder: pendingOrder,
    submitIncreaseAllowanceTx: increaseAllowanceOrder,
    pendingAllowance: pendingAllowanceOrder,

    // State management
    resetLimitValue,
    setAllowanceType: setAllowanceTypeOrder,

    // Order data
    activeOrders,
    orderType,
    isPriceInverted,
    setIsPriceInverted,

    // Price and amount calculations
    targetId,
    targetPrice,
    limitValueDiff,
    orderAmountInDisplayed,
    orderAmountOutDisplayed,
    invalidAmountLimitOrder,

    // Price handling
    priceLO,
    setPriceLO,
    priceLODisplayed,
    setPriceLODisplayed,
    handleKeyDownLimit,
    handleBlur,

    // Date handling
    date,
    setDate,
    expiryDate,
    setExpiryDate,

    // Allowance data
    allowance: allowanceOrder,
    allowanceType: allowanceTypeLimitOrder,

    // Error handling
    limitOrderError,
    isLimitOrderSupported
  } = useManageOrders({
    userAddress: connectedAddress,
    token0,
    token1,
    resetTokensInputs,
    amountIn,
    amountOut,
    quantityIn: quantity0,
    allowedSlippage: new Fraction(
      allowedSlippage.numerator,
      allowedSlippage.denominator
    ),
    fetchBalances
  });

  useEffect(() => {
    isMasWmasPair && changeQuantityWrapped(quantity0);
  }, [token0, token1]);

  const request = debounce(
    (qty: string | undefined, isToken0: boolean, maxHops = 3) =>
      fetchBestTrade(qty, isToken0, maxHops),
    750
  );

  const debounceFetchBestTrade = useCallback(
    (qty: string | undefined, isToken0: boolean) => {
      const maxHops = 3;
      request(qty, isToken0, maxHops);
    },
    [token0, token1, binStep, activeTab]
  );

  const onChangeQuantity = (qty: string | undefined, isToken0: boolean) => {
    changeQuantity(qty, isToken0);
    debounceFetchBestTrade(qty, isToken0);
  };

  const invalidQuantity = !quantity0 || !quantity1;
  const priceImpact = Number(bestTrade?.priceImpact.toSignificant() ?? 0);
  const feeIn = bestTrade?.getTradeFee().feeAmountIn;
  const usdFeeInRaw = feeIn && toFraction(dollarValue0 || 0).multiply(feeIn);
  const usdFeeIn = Number(usdFeeInRaw?.toSignificant(6)) || 0;

  const { data: weeklyMetrics } = trpc.getPointsAPR.useQuery();
  const weeklySwapPoints = weeklyMetrics
    ? weeklyMetrics.points * weeklyMetrics.swapPerc
    : 0;
  const weeklyFees = weeklyMetrics?.lastMetrics.fees || 0;
  const potentialTradePoints = (usdFeeIn * weeklySwapPoints) / weeklyFees;
  const potentialTradeAirdrop = potentialTradePoints * POINT_VALUE;

  const swapOptions: TradeOptions = {
    recipient: connectedAddress,
    allowedSlippage,
    ttl: 3_600_000
    // feeOnTransfer:
  };
  const swapParams: SwapParameters = bestTrade?.swapCallParameters(
    swapOptions
  ) || {
    methodName: 'swapExactTokensForTokens',
    args: new Args(),
    value: 0n
  };

  const { submitTx: swap, pending: pendingSwap } = useSendTransaction({
    data: buildSwapTx(swapParams),
    onTxConfirmed: () => {
      resetTokensInputs();
      fetchBalances();
    }
  });

  const handleSwap = () => {
    if (priceImpact > 5) {
      setShowModal(true);
    } else {
      swap();
    }
  };

  const { submitTx: wrap, pending: pendingWrap } = useSendTransaction({
    data: buildWrapTx(amountIn),
    onTxConfirmed: () => {
      if (!token1?.equals(WMAS)) {
        setToken0(WMAS);
      } else {
        resetTokensInputs();
        fetchBalances();
      }
    }
  });

  const { submitTx: unwrap, pending: pendingUnwrap } = useSendTransaction({
    data: buildUnwrapTx(amountIn, connectedAddress),
    onTxConfirmed: () => {
      resetTokensInputs();
      fetchBalances();
    }
  });

  const handleSwapSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value >= 0.01 && value <= 100) {
      setSwapSlippage(parseInt((value * 100).toString()));
    }
  };

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token0?.address || '',
        spenderAddress,
        allowanceType === 'increaseMax'
          ? U256_MAX
          : amountIn -
              allowance +
              (whereQuantityChange === 'token1' ? amountIn / 100n : 0n)
      ),
      onTxConfirmed: () => {
        allowanceQuery.refetch();
      }
    });

  const allPoolsV1Query = useFetchAllPools();
  const allPoolsV2Query = useFetchAllPools(false);
  const allPoolsLoading =
    allPoolsV1Query.isLoading || allPoolsV2Query.isLoading;
  const allPoolsV1 = allPoolsV1Query.data || [];
  const allPoolsV2 = allPoolsV2Query.data || [];
  const allPools = allPoolsV1.concat(allPoolsV2);

  // const tokens =

  const tokenHavePair = (token?: Token) => {
    if (!token) return [];
    const tokenAddress = getWmasIfMas(token).address;
    const tokens = allPools
      .filter((p) => p.token0.address === tokenAddress)
      .map((p) => p.token1)
      .concat(
        allPools
          .filter((p) => p.token1.address === tokenAddress)
          .map((p) => p.token0)
      );
    return tokens.filter((t): t is Token => t !== undefined);
  };

  const token0HavePair = tokenHavePair(token0).length > 0;
  const token1HavePair = tokenHavePair(token1).length > 0;

  const errorInfo = [
    token0 &&
      !token0HavePair &&
      !allPoolsLoading &&
      `- No pair found with ${token0.symbol} token.`,
    token1 &&
      !token1HavePair &&
      !allPoolsLoading &&
      `- No pair found with ${token1.symbol} token.`,
    connected &&
      notEnoughLiq &&
      !isMasWmasPair &&
      token0HavePair &&
      token1HavePair &&
      activeTab !== 'Limit' &&
      '- Insufficient liquidity in the pool.',
    connected &&
      amountIn > balance0 &&
      `- The quantity of ${token0?.symbol} should be less than or equal to your balance.`
    // Note: limitOrderError is now handled separately with clickable text
  ].filter(Boolean);

  const isAllowanceAsked =
    !notEnoughLiq &&
    token0 &&
    !isMasToken0 &&
    (!isWmasToken0 || !isMasToken1) &&
    amountIn > allowance;

  // Allowance check for limit orders
  const isAllowanceAskedLimitOrder =
    !notEnoughLiq &&
    token0 &&
    !isMasToken0 &&
    (!isWmasToken0 || !isMasToken1) &&
    amountIn > allowanceOrder;

  const buttonVariant =
    pro && !isMobile && !tokenUndefined ? 'outlined' : 'contained';

  const isLimitOrderDisabled = activeTab === 'Limit' && !isLimitOrderSupported;

  // Handle pool selection from modal
  const handleSelectPool = (selectedToken0: Token, selectedToken1: Token) => {
    const displayToken0 = getMasIfWmas(selectedToken0);
    const displayToken1 = getMasIfWmas(selectedToken1);

    setToken0(displayToken0);
    setToken1(displayToken1);
    setShowLimitOrderPoolsModal(false);
  };

  return (
    <>
      <div
        className={clsx(
          'SwapCard feature',
          !FEATURE_FLAGS.DCA &&
            !FEATURE_FLAGS.LIMIT &&
            !tokenUndefined &&
            'growSwapCard',
          tokenUndefined && 'emptySwapCard'
        )}
      >
        <div className='header-feature'>
          <div>
            {tabs
              .filter((tab) => {
                if (tab === 'Limit' && !FEATURE_FLAGS.LIMIT) return false;
                if (tab === 'DCA' && (!FEATURE_FLAGS.DCA || isDCADisabled))
                  return false;
                return true;
              })
              .map((tab, i) => (
                <React.Fragment key={i}>
                  {!pro && tab === 'DCA' ? null : (
                    <button
                      key={tab}
                      onClick={() => history({ search: `?tab=${tab}` })}
                      className={activeTab === tab ? 'active-card' : ''}
                    >
                      {tab}
                    </button>
                  )}
                </React.Fragment>
              ))}
          </div>
          <div className='chart-settings'>
            {!pro && (
              <button
                className='chart-icon'
                title={displayChart ? 'Hide chart' : 'Show chart'}
              >
                <div onClick={() => setDisplayChart((prev) => !prev)}>
                  <ChartSvg isChartVisible={displayChart} />
                </div>
              </button>
            )}
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
                <h3>Trade Settings</h3>
                <div className='swap-settings-content'>
                  <div className='settings-parameter'>
                    <div className='slippage-header'>
                      <SimpleTooltip
                        title='Max Swap Slippage'
                        description='Your transaction will revert if the price changes unfavorably by more than this percentage.'
                        position='bottom'
                      />
                      <span>{swapSlippage / 100}%</span>
                    </div>
                    <div className='parameter-values'>
                      {defaultSlippages.map((defaultSlippage, index) => {
                        return (
                          <button
                            key={index}
                            onClick={() => setSwapSlippage(defaultSlippage)}
                            className={
                              defaultSlippage === swapSlippage ? 'active' : ''
                            }
                          >
                            {defaultSlippage / 100}%
                          </button>
                        );
                      })}
                      <div
                        className={
                          defaultSlippages.includes(swapSlippage)
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
                            defaultSlippages.includes(swapSlippage)
                              ? '0.05'
                              : (swapSlippage / 100).toString()
                          }
                          onChange={handleSwapSlippageChange}
                          onFocus={handleSwapSlippageChange}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                  <div className='settings-parameter'>
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
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </div>

        {activeTab === 'DCA' ? (
          <DCACard tradeCard />
        ) : (
          <div className='container-feature'>
            <div className='TokenInput-wrapper'>
              <TokenInput
                headerText='From'
                token={token0}
                otherToken={token1}
                changeToken={
                  isFromFixed ? undefined : (t: Token) => changeToken(t, true)
                }
                quantity={
                  activeTab === 'Limit' && whereQuantityChange === 'token1'
                    ? orderAmountInDisplayed
                    : quantity0
                }
                changeQuantity={(q?: string) => {
                  if (activeTab === 'Limit') {
                    changeQuantityWithFixedPrice(q, true, targetPrice);
                    setWhereQuantityChange('token0');
                  } else if (
                    (token0?.equals(WMAS) && token1?.equals(MASSA)) ||
                    (token1?.equals(WMAS) && token0?.equals(MASSA))
                  ) {
                    changeQuantityWrapped(q);
                  } else onChangeQuantity(q, true);
                }}
                balance={balance0Raw}
                dollarValue={dollarValue0}
                isError={
                  connected &&
                  ((notEnoughLiq &&
                    !isMasWmasPair &&
                    token0HavePair &&
                    token1HavePair) ||
                    amountIn > balance0)
                }
              />

              {activeTab === 'Swap' && (
                <InvertTokens handleInvert={invertTokens} />
              )}
            </div>

            {activeTab === 'Limit' && (
              <div className='sm:flex-row flex-col advanced'>
                <div
                  className={clsx(
                    'limit-container',
                    isLimitOrderDisabled && 'disabled-limit-section'
                  )}
                >
                  <div className='top'>
                    <div>
                      <span>PRICE</span>
                      {priceLO && !isLimitOrderDisabled ? (
                        <span
                          className={`limitValueDiff ${
                            limitValueDiff < 0
                              ? 'below'
                              : limitValueDiff > 0
                                ? 'above'
                                : ''
                          }`}
                        >
                          (
                          {(limitValueDiff > 0 ? '+' : '') +
                            limitValueDiff.toFixed(2)}
                          %)
                        </span>
                      ) : null}
                    </div>
                    <button onClick={resetLimitValue}>
                      <FontAwesomeIcon icon={faArrowsRotate} />
                      <span>MARKET</span>
                    </button>
                  </div>
                  <div className='right'>
                    {!priceLO ? (
                      <Skeleton style={{ width: '100%' }} />
                    ) : (
                      <Input
                        value={isLimitOrderDisabled ? '' : priceLODisplayed}
                        placeholder={isLimitOrderDisabled ? '—' : undefined}
                        onChange={(e) => {
                          if (tokensSet && !isLimitOrderDisabled) {
                            const val = e.target.value;
                            setPriceLODisplayed(val);
                          }
                        }}
                        onKeyDown={
                          isLimitOrderDisabled ? undefined : handleKeyDownLimit
                        }
                        onBlur={isLimitOrderDisabled ? undefined : handleBlur}
                      />
                    )}
                    <div className='bottom'>
                      <div
                        onClick={() =>
                          setIsPriceInverted((prev: boolean) => !prev)
                        }
                      >
                        <span>
                          {isPriceInverted ? token1?.symbol : token0?.symbol}
                        </span>
                        <FontAwesomeIcon icon={faRightLeft} />
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={clsx(
                    'expiry',
                    isLimitOrderDisabled && 'disabled-limit-section'
                  )}
                >
                  <div className='top'>
                    <div>
                      <span>EXPIRY</span>
                    </div>
                    {!isLimitOrderDisabled && (
                      <FontAwesomeIcon
                        icon={expiryDate ? faInfinity : faCalendarCheck}
                        onClick={() => {
                          setExpiryDate(!expiryDate);
                        }}
                        className='text-sm cursor-pointer'
                      />
                    )}
                  </div>
                  {isLimitOrderDisabled ? (
                    <div className='right'>
                      <div
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          color: 'var(--second-color)'
                        }}
                      >
                        —
                      </div>
                    </div>
                  ) : !expiryDate ? (
                    <div className='flex flex-grow justify-center items-center pt-2 pb-3 text-sm text-center'>
                      No expiry date
                    </div>
                  ) : (
                    <div className='flex flex-grow justify-center items-center pt-2 pb-3 overflow-visible text-xs'>
                      <DateTimePicker
                        date={new Date(date)}
                        setDate={(newDate: Date) => setDate(newDate.getTime())}
                        buttonClassName='flex flex-wrap items-center justify-center gap-1 text-xs bg-transparent border-none text-[var(--main-color)] cursor-pointer rounded focus:outline-none flex-grow'
                        popperClassName='z-50 w-80 max-w-[90vw] rounded-lg border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 shadow-lg'
                        placement='top-start'
                        showTimeOnly={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Limit' && (
              <div className='invertTokensLO'>
                <InvertTokens handleInvert={invertTokens} />
              </div>
            )}

            <TokenInput
              headerText='To'
              token={token1}
              otherToken={token0}
              changeToken={
                isToFixed ? undefined : (t: Token) => changeToken(t, false)
              }
              quantity={
                activeTab === 'Limit' && whereQuantityChange === 'token0'
                  ? orderAmountOutDisplayed
                  : quantity1
              }
              changeQuantity={(q?: string) => {
                if (activeTab === 'Limit') {
                  setWhereQuantityChange('token1');
                  changeQuantityWithFixedPrice(q, false, targetPrice);
                } else if (
                  (token0?.equals(WMAS) && token1?.equals(MASSA)) ||
                  (token1?.equals(WMAS) && token0?.equals(MASSA))
                ) {
                  changeQuantityWrapped(q);
                } else onChangeQuantity(q, false);
              }}
              balance={balance1Raw}
              dollarValue={dollarValue1}
              isError={
                connected &&
                notEnoughLiq &&
                !isMasWmasPair &&
                token0HavePair &&
                token1HavePair
              }
            />

            {errorInfo.length ? (
              <div className='error-info-container'>
                {errorInfo.map((message, index) => (
                  <span key={index} className='error-info'>
                    {message}
                  </span>
                ))}
              </div>
            ) : null}

            {activeTab === 'Limit' && limitOrderError ? (
              <div className='error-info-container'>
                <span className='error-info'>
                  - {limitOrderError}{' '}
                  <span
                    className='error-info-link'
                    onClick={() => setShowLimitOrderPoolsModal(true)}
                  >
                    View supported pools
                  </span>
                </span>
              </div>
            ) : null}

            {usdFeeIn && FEATURE_FLAGS.POINTS_V2 && isInDusaSeason() ? (
              <div className='info-container'>
                {isNaN(potentialTradeAirdrop) ? (
                  <span>This trade includes JELLY rewards</span>
                ) : (
                  <>
                    <span className='info'>
                      Est. JELLY rewards: ${printUSD(potentialTradeAirdrop)}
                    </span>
                    <Tooltip
                      trigger={<FontAwesomeIcon icon={faCircleQuestion} />}
                    >
                      Based on the previous epoch, this trade will make you earn
                      ${printUSD(potentialTradeAirdrop)} in JELLY rewards.
                    </Tooltip>
                  </>
                )}
              </div>
            ) : null}

            {FEATURE_FLAGS.CREATE_POOL &&
              token0 &&
              !token0HavePair &&
              !allPoolsLoading && (
                <Link to={routeNames.create} className='no-pair'>
                  <Button
                    text={`Create the first pool with ${token0.symbol} token`}
                    variant='outlined'
                  />
                </Link>
              )}
            {FEATURE_FLAGS.CREATE_POOL &&
              token1 &&
              !token1HavePair &&
              !allPoolsLoading && (
                <Link to={routeNames.create} className='no-pair'>
                  <Button
                    text={`Create the first pool with ${token1.symbol} token`}
                    variant='outlined'
                  />
                </Link>
              )}
            {activeTab === 'Swap' &&
              (fetchingTrade || bestTrade) &&
              !isMasWmasPair &&
              quantity0 && (
                <div className='swap-details'>
                  <button
                    disabled={fetchingTrade}
                    style={{ cursor: fetchingTrade ? 'inherit' : 'pointer' }}
                    className='show-details-button'
                    onClick={() => setShowDetails((prev) => !prev)}
                  >
                    {fetchingTrade ? (
                      <>
                        <span>Fetching best trade...</span>
                        <Spinner size={20} />
                      </>
                    ) : bestTrade && token1 ? (
                      <>
                        <span>
                          1 {token0?.symbol} ≃{' '}
                          {roundFractionPriceAdaptive(
                            bestTrade.executionPrice,
                            token1
                          )}{' '}
                          {token1.symbol}
                        </span>
                        <div className='flex items-center gap-2'>
                          <FontAwesomeIcon
                            icon={faArrowsRotate}
                            style={{ cursor: 'pointer', fontSize: '14px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (quantity0) {
                                fetchBestTrade(quantity0, true, 3);
                              } else if (quantity1) {
                                fetchBestTrade(quantity1, false, 3);
                              }
                            }}
                            title='Refresh trade'
                          />
                          <FontAwesomeIcon
                            icon={showDetails ? faAngleUp : faAngleDown}
                          />
                        </div>
                      </>
                    ) : null}
                  </button>
                  {showDetails && token0 && token1 && (
                    <>
                      <div className='details'>
                        <div className='detail'>
                          <span>Minimum Received</span>
                          <span>
                            {formatNumberWithSubscriptZeros(
                              bestTrade
                                ?.minimumAmountOut(allowedSlippage)
                                .toSignificant() || ''
                            )}{' '}
                            {token1?.symbol}
                          </span>
                        </div>
                        <div className='detail'>
                          <span>Fees</span>
                          <span>
                            {formatNumberWithSubscriptZeros(
                              (feeIn && printBigintIsh(token0, feeIn.raw)) || ''
                            )}{' '}
                            {token0?.symbol}
                          </span>
                        </div>
                        <div className='detail'>
                          <span>Price Impact</span>
                          <span
                            className={`${
                              priceImpact > 2.5 &&
                              (priceImpact > 5 ? 'red' : 'orange')
                            }`}
                          >
                            {priceImpact > 100
                              ? '99,99'
                              : priceImpact.toFixed(2)}
                            %
                          </span>
                        </div>
                      </div>
                      <div className='swap-route'>
                        <span>Route</span>
                        <div className='route-details'>
                          <img
                            src={token0 && getMasIfWmas(token0).logoURI}
                            alt='token0 logo'
                          />

                          {bestTrade?.route.pairs.map((pair, i) => (
                            <div className='route-step' key={i}>
                              <FontAwesomeIcon icon={faArrowRight} />
                              <Link
                                className='route-step'
                                to={routeNames.liquidityItem
                                  .replace(
                                    ':token0',
                                    getWmasIfMas(pair.tokenA as Token).address
                                  )
                                  .replace(
                                    ':token1',
                                    getWmasIfMas(pair.tokenB as Token).address
                                  )
                                  .replace(
                                    ':binStep',
                                    bestTrade.quote.binSteps[i].toString()
                                  )
                                  .replace(
                                    ':version',
                                    bestTrade.quote.isLegacy?.[i] ? 'V1' : 'V2'
                                  )}
                              >
                                <img
                                  src={getLogoURIFromToken(
                                    getMasIfWmas(pair.tokenA as Token)
                                  )}
                                  alt='token0 logo'
                                />
                                <img
                                  src={getLogoURIFromToken(
                                    getMasIfWmas(pair.tokenB as Token)
                                  )}
                                  alt='token1 logo'
                                />
                                <span>
                                  {getMasIfWmas(pair.tokenB as Token).symbol}
                                </span>
                                <span className='binStep'>
                                  {Number(bestTrade.quote.binSteps[i]) / 100} %
                                </span>
                                <span className='mx-1'>
                                  {bestTrade.quote.isLegacy?.[i] ? 'V1' : 'V2'}
                                </span>
                              </Link>
                            </div>
                          ))}

                          <FontAwesomeIcon icon={faArrowRight} />
                          <img
                            src={token1 && getMasIfWmas(token1).logoURI}
                            alt='token1 logo'
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            <>
              {!connected ? (
                <ConnectButton />
              ) : (
                <div className='buttons-container'>
                  {activeTab === 'Swap' && isAllowanceAsked ? (
                    <ButtonAllowance
                      onClick={increaseAllowance}
                      pending={pendingAllowance}
                      allowanceType={allowanceType}
                      setAllowanceType={setAllowanceType}
                      token={token0}
                    />
                  ) : null}
                  {activeTab === 'Limit' && isAllowanceAskedLimitOrder ? (
                    <ButtonAllowance
                      onClick={increaseAllowanceOrder}
                      pending={pendingAllowanceOrder}
                      allowanceType={allowanceTypeLimitOrder}
                      setAllowanceType={setAllowanceTypeOrder}
                      token={token0}
                    />
                  ) : null}
                  {isMasToken0 &&
                    activeTab !== 'Swap' &&
                    activeTab !== 'Limit' && ( // token0.isNative?
                      <Button
                        text='Wrap'
                        variant={buttonVariant}
                        pending={pendingWrap}
                        onClick={wrap}
                        disabled={amountIn === 0n || balance0 < amountIn}
                      />
                    )}

                  {activeTab === 'Swap' ? (
                    <Button
                      variant={buttonVariant}
                      text={
                        token0?.equals(WMAS) && token1?.equals(MASSA)
                          ? 'Unwrap'
                          : token1?.equals(WMAS) && token0?.equals(MASSA)
                            ? 'Wrap'
                            : 'Swap'
                      }
                      onClick={
                        token0?.equals(WMAS) && token1?.equals(MASSA)
                          ? unwrap
                          : token1?.equals(WMAS) && token0?.equals(MASSA)
                            ? wrap
                            : handleSwap
                      }
                      pending={pendingSwap || pendingWrap || pendingUnwrap}
                      disabled={fetchingTrade}
                      disabledText={
                        (!tokensSet && 'Select token') ||
                        (notEnoughLiq &&
                          !isMasWmasPair &&
                          'Insufficient liquidity for this pair.') ||
                        (allowance < amountIn &&
                          !isMasToken0 &&
                          !isWmasToken0 &&
                          `Not enough ${token0?.symbol} allowance`) ||
                        (invalidQuantity && 'Enter an amount') ||
                        (amountIn > balance0 &&
                          `Insufficient ${token0?.symbol} balance`) ||
                        undefined
                      }
                    />
                  ) : (
                    <>
                      <Button
                        variant={buttonVariant}
                        text='Place an order'
                        onClick={addLimitOrder}
                        pending={pendingOrder}
                        disabledText={
                          (!tokensSet && 'Select token') ||
                          (!isLimitOrderSupported &&
                            'Invalid pair for limit order') ||
                          (invalidAmountLimitOrder && 'Enter an amount') ||
                          (amountIn > allowanceOrder &&
                            !isMasToken0 &&
                            `Not enough ${token0?.symbol} allowance`) ||
                          (amountIn > balance0 &&
                            `Insufficient ${token0?.symbol} balance`) ||
                          (activeId !== undefined &&
                            (swapForY
                              ? targetId >= activeId &&
                                'Only possible to place orders below market rate'
                              : targetId <= activeId &&
                                'Only possible to place orders above market rate')) ||
                          undefined
                        }
                      />
                    </>
                  )}
                </div>
              )}
            </>
          </div>
        )}
      </div>
      {showModal && (
        <Modal
          showModal={showModal}
          setShowModal={setShowModal}
          title='⚠️ High Price Impact Warning ⚠️'
        >
          <div className='price-impact-warning'>
            <div className='price-impact-value'>
              <div>Price Impact</div>
              <div className='pill'>{priceImpact.toFixed(2)}%</div>
            </div>
            <div className='price-content'>
              <span>
                The price impact of this trade is high ({'>'}5%). This means
                that the price of the token will change significantly after the
                trade.
              </span>
              <span>
                The value you receive will be less than expected due to the
                significant price shift.
              </span>
              <span>Are you sure you want to proceed?</span>
            </div>
            <div className='price-impact-warning-buttons'>
              <Button
                text='Cancel'
                variant='outlined'
                onClick={() => setShowModal(false)}
              />
              <Button
                text='Proceed'
                onClick={() => {
                  swap();
                  setShowModal(false);
                }}
                variant='contained'
              />
            </div>
          </div>
        </Modal>
      )}

      {showLimitOrderPoolsModal && (
        <LimitOrderPoolsModal
          showModal={showLimitOrderPoolsModal}
          setShowModal={setShowLimitOrderPoolsModal}
          onSelectPool={handleSelectPool}
        />
      )}
    </>
  );
};

export default SwapCard;
