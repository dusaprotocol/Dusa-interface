import React, { useContext, useEffect, useState } from 'react';
import { Fraction, Percent } from '@dusalabs/sdk';
import {
  TokenAmount,
  getBidAskDistributionFromBinRange,
  getCurveDistributionFromBinRange,
  getUniformDistributionFromBinRange,
  parseUnits
} from '@dusalabs/sdk';
import {
  faAlignCenter,
  faChevronDown,
  faChevronUp,
  faExternalLink,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import manual from 'assets/img/manual.png';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import Checkbox from 'components/Checkbox';
import ConnectButton from 'components/ConnectButton';
import { Warning } from 'components/Info';
import Input from 'components/Input';
import LiquidityBatchModal from 'components/LiquidityBatchModal';
import RangeSlider from 'components/RangeSlider';
import {
  curve,
  bidAsk,
  spot,
  autonomousCenter,
  autonomousLeft,
  autonomousRight
} from 'components/Shapes';
import Spinner from 'components/Spinner';
import TokenInput from 'components/TokenInput';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import {
  FEATURE_FLAGS,
  routerSC,
  routerV2SC,
  vaultManagerSC
} from 'utils/config';
import { AutopoolConfig, U256_MAX } from 'utils/constants';
import { getWmasIfMas, getMasIfWmas } from 'utils/coreMethods';
import {
  getBinValue,
  getIdFromPrice,
  getPriceFromId,
  minmax,
  printAddress,
  toFraction
} from 'utils/methods';
import { JELLY, MASSA, USDC, USDT } from 'utils/tokens';
import {
  buildALDeposit,
  buildAddLiquidityTx,
  buildIncreaseAllowanceTx
} from 'utils/transactionBuilder';
import { Allowance, Bin, LiquidityShape } from 'utils/types';
import LiquidityBars from '../LiquidityBars';
import './index.scss';

const strategies = ['undefined', 'autonomous', 'manual'] as const;
type InterfaceStrategy = (typeof strategies)[number];

export interface AddLiquidityProps {
  distributionX: bigint[];
  distributionY: bigint[];
  deltaIds: number[];
  xyRatio: number;
  makerAddress: string;
}

const AddLiquidity = () => {
  const [binRadius, setBinRadius] = useState(15);
  const [targetPriceId, setTargetPriceId] = useState(0);
  const [priceTabIndex, setPriceTabIndex] = useState<'By Range' | 'By Radius'>(
    'By Range'
  );
  const [chosenShape, setChosenShape] = useState(LiquidityShape.SPOT);
  const [rangeValue, setRangeValue] = useState<[number, number]>([-15, 15]);
  const [stackCurrentPosition, setStackCurrentPosition] = useState(false);
  const [custALNbBins, setCustALNbBins] = useState(2);
  const [custALFrequency, setCustALFrequency] = useState(2);
  const type = (custALNbBins * 10 + custALFrequency) as AutopoolConfig;
  const [strategy, setStrategy] = useState<InterfaceStrategy>(
    FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY ? 'undefined' : 'manual'
  );
  // const [vaultSC, setVaultSC] = useState<string>();
  const [showShape, setShowShape] = useState(true);
  const [showSimulation, setShowSimulation] = useState(true);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [copyPercentage, setCopyPercentage] = useState(90);
  const [allowanceType0, setAllowanceType0] = useState<Allowance>('increase');
  const [allowanceType1, setAllowanceType1] = useState<Allowance>('increase');

  const { amountLiquiditySlippage, priceLiquiditySlippage } =
    useContext(SettingsContext);

  const { connectedAddress, connected } = useContext(AccountWrapperContext);

  const {
    loading,
    token0,
    token1,
    binStep,
    version,
    pairAddress,
    quantity0,
    quantity1,
    balance0: balance0Raw,
    balance1: balance1Raw,
    dollarValue0,
    dollarValue1,
    activeId: _activeId,
    liquidityBins,
    addLiquidityParams,
    autoChangeQuantity,
    setAutoChangeQuantity,
    fetchBalances,
    resetTokensInputs,
    changeQuantityAlone,
    changeQuantityWithFixedPrice,
    fetchLiquidityAndTVL,
    fetchAutonomousLiquidity,
    setAddLiquidityParams,
    rewardData
  } = useContext(PoolContext);
  const balance0 = balance0Raw || 0n;
  const balance1 = balance1Raw || 0n;
  const activeId = _activeId ?? 0;
  const activeIdDesired = targetPriceId;

  const isAutonomous =
    strategy === 'autonomous' && addLiquidityParams === undefined;

  const allowanceSpender = isAutonomous
    ? vaultManagerSC
    : version === 'V1'
      ? routerSC
      : routerV2SC;
  // prettier-ignore
  const allowance0Query = useFetchAllowance({ tokenAddress: token0.address, spenderAddress: allowanceSpender });
  // prettier-ignore
  const allowance1Query = useFetchAllowance({ tokenAddress: token1.address, spenderAddress: allowanceSpender });
  const allowance0 = allowance0Query.data || 0n;
  const allowance1 = allowance1Query.data || 0n;
  const refetchAllowance = () => {
    allowance0Query.refetch();
    allowance1Query.refetch();
  };

  if (!pairAddress) throw new Error('Pair address is undefined');

  const aboveActiveId = rangeValue[0] > activeId;
  const belowActiveId = rangeValue[1] < activeId;
  const withinActiveId = !aboveActiveId && !belowActiveId;

  const isQuantity0Defined = quantity0 !== undefined && quantity0 !== '';
  const isQuantity1Defined = quantity1 !== undefined && quantity1 !== '';

  const amountX = belowActiveId
    ? 0n
    : parseUnits(isQuantity0Defined ? quantity0 : '0', token0?.decimals);
  const amountY = aboveActiveId
    ? 0n
    : parseUnits(isQuantity1Defined ? quantity1 : '0', token1?.decimals);

  const amountToIncreaseAllowanceToken0 =
    allowanceType0 === 'increaseMax' ? U256_MAX : amountX - allowance0;

  const amountToIncreaseAllowanceToken1 =
    allowanceType1 === 'increaseMax' ? U256_MAX : amountY - allowance1;

  const { pending: pendingAllowance0, submitTx: increaseAllowanceToken0 } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token0.address,
        allowanceSpender,
        amountToIncreaseAllowanceToken0
      ),
      onTxConfirmed: () => refetchAllowance()
    });

  const { pending: pendingAllowance1, submitTx: increaseAllowanceToken1 } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token1.address,
        allowanceSpender,
        amountToIncreaseAllowanceToken1
      ),
      onTxConfirmed: () => refetchAllowance()
    });

  const parsedAmounts = [
    new TokenAmount(token0, amountX),
    new TokenAmount(token1, amountY)
  ];

  const { deltaIds, distributionX, distributionY } = addLiquidityParams
    ? addLiquidityParams
    : chosenShape === LiquidityShape.SPOT
      ? getUniformDistributionFromBinRange(activeId, rangeValue)
      : chosenShape === LiquidityShape.CURVE
        ? getCurveDistributionFromBinRange(
            activeIdDesired,
            rangeValue,
            parsedAmounts
          )
        : getBidAskDistributionFromBinRange(
            activeIdDesired,
            rangeValue,
            parsedAmounts
          );

  const amountXMin =
    (amountX * BigInt(10000 - amountLiquiditySlippage)) / BigInt(10000);
  const amountYMin =
    (amountY * BigInt(10000 - amountLiquiditySlippage)) / BigInt(10000);

  const lowerBoundId = getIdFromPrice(
    getPriceFromId(activeIdDesired, binStep) *
      (1 -
        (priceLiquiditySlippage === 10000 ? 9999 : priceLiquiditySlippage) /
          10000),
    binStep
  );
  const idSlippage = !!activeId
    ? targetPriceId !== activeId
      ? Math.abs(targetPriceId - activeId)
      : activeId - lowerBoundId
    : 0;

  const methodForAddLiquidity =
    (token0.equals(MASSA) && amountX > 0n) ||
    (token1.equals(MASSA) && amountY > 0n)
      ? 'addLiquidityMAS'
      : 'addLiquidity';

  const { pending: pendingAddLiquidity, submitTx: addLiquidity } =
    useSendTransaction({
      data: buildAddLiquidityTx(
        getWmasIfMas(token0).address,
        getWmasIfMas(token1).address,
        binStep,
        amountX,
        amountY,
        amountXMin,
        amountYMin,
        activeIdDesired,
        idSlippage,
        deltaIds,
        distributionX,
        distributionY,
        connectedAddress,
        methodForAddLiquidity,
        version
      ),
      onTxConfirmed: () => {
        fetchLiquidityAndTVL();
        resetTokensInputs();
        fetchBalances();
      }
    });

  const { pending: pendingDepositLiquidity, submitTx: depositLiquidity } =
    useSendTransaction({
      data: buildALDeposit(
        getWmasIfMas(token0).address,
        getWmasIfMas(token1).address,
        type,
        amountX,
        amountY
      ),
      onTxConfirmed: () => {
        fetchAutonomousLiquidity();
        resetTokensInputs();
        fetchBalances();
      }
    });

  const bins: Bin[] = deltaIds.map((deltaId, i) => {
    const id =
      (priceTabIndex === 'By Radius' && chosenShape === LiquidityShape.SPOT
        ? activeId
        : activeIdDesired) + deltaId;
    const ONE = BigInt(1e18);
    const amount0 = new TokenAmount(token0, (distributionX[i] * amountX) / ONE)
      .raw;
    const amount1 = new TokenAmount(token1, (distributionY[i] * amountY) / ONE)
      .raw;
    const amountLBT = 0n;
    const accToken0PerShare = 0n;
    const accToken1PerShare = 0n;

    const value = getBinValue(
      token0,
      token1,
      amount0,
      amount1,
      activeId,
      binStep
    );

    return {
      id,
      amount0,
      amount1,
      amountLBT,
      accToken0PerShare,
      accToken1PerShare,
      value
    };
  });

  const simulatedBins = bins.map((_bin) => {
    const correspondingBin = liquidityBins?.find((b) => b.id === _bin.id);
    const bin = { ..._bin };
    if (correspondingBin && stackCurrentPosition) {
      bin.amount0 += correspondingBin.amount0;
      bin.amount1 += correspondingBin.amount1;
      bin.amountLBT += correspondingBin.amountLBT;
      bin.value = getBinValue(
        token0,
        token1,
        bin.amount0,
        bin.amount1,
        activeId,
        binStep
      );
    }
    return bin;
  });

  const toggle = () => setAutoChangeQuantity(!autoChangeQuantity);

  useEffect(() => {
    if (
      (autoChangeQuantity && quantity0) ||
      (strategy === 'autonomous' && quantity0)
    )
      changeQuantityWithFixedPrice(quantity0, true);
    else if (
      (autoChangeQuantity && quantity1) ||
      (strategy === 'autonomous' && quantity1)
    )
      changeQuantityWithFixedPrice(quantity1, false);
  }, [autoChangeQuantity, strategy]);

  useEffect(() => {
    if (!addLiquidityParams) return;

    const perc = new Percent(BigInt(copyPercentage), 100n);
    const bal0 = new TokenAmount(token0, balance0).multiply(perc);
    const bal1 = new TokenAmount(token1, balance1).multiply(perc);

    // prettier-ignore
    const userXYRatio = Number(new Fraction(balance1, balance0).toSignificant(6));
    const isToken0LimitingFactor = addLiquidityParams.xyRatio < userXYRatio;
    const price = toFraction(addLiquidityParams.xyRatio);
    if (isToken0LimitingFactor)
      changeQuantityWithFixedPrice(bal0.toSignificant(6), true, price);
    else changeQuantityWithFixedPrice(bal1.toSignificant(6), false, price);
  }, [addLiquidityParams, copyPercentage]);

  const resetPrice = () => {
    setRangeValue([activeId - 15, activeId + 15]);
    setTargetPriceId(activeId);
    setBinRadius(15);
  };

  useEffect(() => {
    if (activeId == 0) return;
    resetPrice();
  }, [activeId, binStep]);

  const changeQuantity = autoChangeQuantity
    ? changeQuantityWithFixedPrice
    : changeQuantityAlone;

  // helper function to generate disabledText
  const getDisabledText = () => {
    const insufficientToken0 = `Insufficient ${token0.symbol} balance`;
    const insufficientToken1 = `Insufficient ${token1.symbol} balance`;
    const enterToken0 = `Enter ${token0.symbol} amount`;
    const enterToken1 = `Enter ${token1.symbol} amount`;
    const enterBothTokens = 'Enter amounts';
    const disableCurve =
      'Curve shape is currently disabled with more than 61 bins';

    if (!addLiquidityParams && strategy === 'undefined')
      return 'Select a strategy';
    if (aboveActiveId && amountX === 0n) return enterToken0;
    if (belowActiveId && amountY === 0n) return enterToken1;
    if (amountX === 0n && amountY === 0n) return enterBothTokens;
    if (amountX > balance0 && amountY > balance1)
      return `Insufficient ${token0.symbol} | ${token1.symbol} balance`;
    if (amountX > balance0) return insufficientToken0;
    if (amountY > balance1) return insufficientToken1;
    if (chosenShape === LiquidityShape.CURVE && bins.length > 61)
      return disableCurve;

    return undefined;
  };

  const isUSDCUSDT =
    (token0.equals(USDC) && token1.equals(USDT)) ||
    (token0.equals(USDT) && token1.equals(USDC));

  const isJELLY = token0.equals(JELLY) || token1.equals(JELLY);

  if (loading) return <Spinner />;
  if (isJELLY) return '$JELLY is not tradable yet';

  if (version === 'V1' && FEATURE_FLAGS.DISABLE_V1_DEPOSIT)
    return (
      <div className='AddLiquidity feature'>
        <div className='container-feature'>
          <Warning text='Adding liquidity is disabled for V1 pools' />
        </div>
      </div>
    );

  return (
    <>
      <div className='AddLiquidity feature'>
        <div className='container-feature'>
          <div>
            <div className='tokenInputs'>
              <TokenInput
                headerText='From'
                token={getMasIfWmas(token0)}
                quantity={quantity0}
                changeQuantity={(q?: string) => changeQuantity(q, true)}
                balance={balance0Raw}
                dollarValue={dollarValue0}
                disabled={belowActiveId}
                isError={
                  connected &&
                  isQuantity0Defined &&
                  parseUnits(quantity0, token0.decimals) > balance0
                }
              />
              <TokenInput
                headerText='From'
                token={getMasIfWmas(token1)}
                quantity={quantity1}
                changeQuantity={(q?: string) => changeQuantity(q, false)}
                balance={balance1Raw}
                dollarValue={dollarValue1}
                disabled={aboveActiveId}
                isError={
                  connected &&
                  isQuantity1Defined &&
                  parseUnits(quantity1, token1.decimals) > balance1
                }
              />
            </div>

            {addLiquidityParams?.makerAddress && (
              <div className='copy-user-position'>
                <span>
                  Copy of {printAddress(addLiquidityParams.makerAddress)}&apos;s
                  distribution. You can adjust the amounts of tokens to use:
                </span>

                <Button
                  text='Cancel Copy'
                  onClick={() => setAddLiquidityParams(undefined)}
                  variant='outlined'
                  stretch={false}
                />

                <input
                  type='range'
                  value={copyPercentage}
                  min={1}
                  max={100}
                  onChange={(e) => {
                    const newPercentage = parseInt(e.target.value);
                    setCopyPercentage(newPercentage);
                  }}
                />
                <span>{copyPercentage}%</span>
              </div>
            )}

            {connectedAddress && (
              <>
                {isQuantity0Defined &&
                  parseUnits(quantity0, token0.decimals) > balance0 && (
                    <div className='error-info'>
                      The quantity of {token0.symbol} should be less than or
                      equal to your balance.
                    </div>
                  )}
                {isQuantity1Defined &&
                  parseUnits(quantity1, token1.decimals) > balance1 && (
                    <div className='error-info'>
                      The quantity of {token1.symbol} should be less than or
                      equal to your balance.
                    </div>
                  )}
              </>
            )}
            {strategy !== 'autonomous' && (
              <button className='sameValue' onClick={toggle}>
                <Checkbox checked={autoChangeQuantity} />
                <span>Provide liquidity in the same ratio</span>
              </button>
            )}
          </div>
          {FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY &&
            addLiquidityParams === undefined && (
              <div>
                <h3>Pick a Strategy</h3>
                <div className='strategy-container'>
                  <div
                    className='strategy'
                    onClick={() => !isUSDCUSDT && setStrategy('autonomous')}
                  >
                    <h4>Autonomous</h4>
                    <div
                      className={`strategy-representation${
                        strategy === 'autonomous' ? ' active-strat' : ''
                      }${isUSDCUSDT ? ' disabled-strat' : ''}`}
                    >
                      <div className='autonomous'>
                        <>{autonomousLeft()}</>
                        <>{autonomousCenter()}</>
                        <>{autonomousRight()}</>
                      </div>
                    </div>
                    <span>
                      Autonomous management of your liquidity position
                    </span>
                  </div>
                  <div
                    className='strategy'
                    onClick={() => setStrategy('manual')}
                  >
                    <h4>Manual</h4>
                    <div
                      className={`strategy-representation${
                        strategy === 'manual' ? ' active-strat' : ''
                      }`}
                    >
                      <img src={manual} alt='manual strategy' />
                    </div>
                    <span>
                      Manually control your settings and adjust them as you wish
                      (manual rebalancing required)
                    </span>
                  </div>
                </div>
              </div>
            )}

          {strategy === 'autonomous' && (
            <div className='custAL'>
              <span>
                The autonomous liquidity strategy allows you to provide
                liquidity without having to manage and rebalance it at each
                price movement.
              </span>
              <div className='custAL-container'>
                <div className='custAL-content'>
                  <span>Number of bins:</span>
                  <div className='custAL-params'>
                    {[
                      {
                        maintext: 'Concentrated',
                        secondaryText: '11',
                        value: 1
                      },
                      { maintext: 'Normal', secondaryText: '19', value: 2 },
                      { maintext: 'Diversified', secondaryText: '31', value: 3 }
                    ].map((custAL) => (
                      <div
                        className={`liquidity-params-item${
                          custAL.value == custALNbBins ? ' active' : ''
                        }`}
                        key={custAL.maintext}
                        onClick={() => setCustALNbBins(custAL.value)}
                      >
                        <span>{custAL.maintext}</span>
                        <span>{custAL.secondaryText} bins</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className='custAL-content'>
                  <span>Frequency:</span>
                  <div className='custAL-params'>
                    {[
                      {
                        mainText: 'Frequent',
                        secondaryText: '30 minutes',
                        value: 1
                      },
                      {
                        mainText: 'Moderate',
                        secondaryText: '1 hour',
                        value: 2
                      },
                      {
                        mainText: 'Infrequent',
                        secondaryText: '6 hours',
                        value: 3
                      }
                    ].map((custAL) => (
                      <div
                        className={`liquidity-params-item${
                          custAL.value == custALFrequency ? ' active' : ''
                        }`}
                        key={custAL.mainText}
                        onClick={() => setCustALFrequency(custAL.value)}
                      >
                        <span>{custAL.mainText}</span>
                        <span>{custAL.secondaryText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(strategy !== 'undefined' || addLiquidityParams) && (
            <>
              {strategy === 'manual' && !addLiquidityParams && (
                <div className='manual-container'>
                  <button
                    className='showShape-button'
                    onClick={() => setShowShape(!showShape)}
                  >
                    <h3>Customize your liquidity position</h3>
                    <FontAwesomeIcon
                      icon={showShape ? faChevronUp : faChevronDown}
                    />
                  </button>
                  {showShape && (
                    <>
                      <div className='add-liquidity-section liquidity-shape'>
                        <div className='liquidity-shape-title'>
                          <h3>Liquidity Shape</h3>
                          <a
                            href='https://docs.dusa.io/liquidity/liquidityStrat'
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            Learn more <FontAwesomeIcon icon={faExternalLink} />
                          </a>
                        </div>
                        <div className='liquidity-container'>
                          {[
                            { svg: spot(), name: 'Spot' },
                            { svg: curve(), name: 'Curve' },
                            { svg: bidAsk(), name: 'Bid Ask' }
                          ].map((item, index) => {
                            return (
                              <div
                                className={`liquidity-params-item${
                                  index == chosenShape ? ' active' : ''
                                }`}
                                key={index}
                                onClick={() => setChosenShape(index)}
                              >
                                <>{item.svg}</>
                                <span>{item.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className='add-liquidity-section price-radius'>
                        <div className='liquidity-shape-title'>
                          <h3>Price</h3>
                        </div>
                        <div>
                          <div className='active-manage'>
                            {['By Range', 'By Radius'].map((heading) => {
                              return (
                                <button
                                  key={heading}
                                  className={
                                    heading === priceTabIndex ? 'active' : ''
                                  }
                                  onClick={() => {
                                    setPriceTabIndex(
                                      heading as 'By Range' | 'By Radius'
                                    );
                                    if (heading === priceTabIndex) return;
                                    resetPrice();
                                  }}
                                >
                                  {heading}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className='price-container'>
                          {priceTabIndex === 'By Range' ? (
                            <RangeSlider
                              value={rangeValue}
                              setValue={setRangeValue}
                              min={activeId - 30}
                              max={activeId + 30}
                            />
                          ) : (
                            <RadiusPicker
                              binRadius={binRadius}
                              setBinRadius={setBinRadius}
                              setRangeValue={setRangeValue}
                              targetPriceId={targetPriceId}
                              setTargetPriceId={setTargetPriceId}
                              activeId={activeId}
                            />
                          )}
                          <div className='rangeSlider-buttons-action'>
                            <Button
                              className='reset-price-btn'
                              text='Center on active price'
                              icon={faAlignCenter}
                              variant='text'
                              stretch={false}
                              onClick={() => {
                                setRangeValue([
                                  activeId -
                                    Math.round(
                                      (rangeValue[1] - rangeValue[0]) / 2
                                    ),
                                  activeId +
                                    Math.round(
                                      (rangeValue[1] - rangeValue[0]) / 2
                                    )
                                ]);
                                setTargetPriceId(activeId);
                              }}
                            />
                            <Button
                              className='reset-price-btn'
                              variant='text'
                              stretch={false}
                              text='Reset price'
                              onClick={resetPrice}
                              icon={faRotateRight}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {(strategy === 'manual' || addLiquidityParams !== undefined) &&
                (((amountX > 0 || amountY > 0) && withinActiveId) ||
                  (aboveActiveId && amountX > 0) ||
                  (belowActiveId && amountY > 0)) && (
                  <div className='simulated-position'>
                    <button
                      className='showShape-button'
                      onClick={() => setShowSimulation(!showSimulation)}
                    >
                      <h3>Simulated Liquidity Distribution</h3>
                      <FontAwesomeIcon
                        icon={showSimulation ? faChevronUp : faChevronDown}
                      />
                    </button>
                    {showSimulation && (
                      <div className='simulated-position-content'>
                        <button
                          onClick={() =>
                            setStackCurrentPosition(!stackCurrentPosition)
                          }
                          className='flex items-center'
                        >
                          <Checkbox
                            checked={stackCurrentPosition}
                            onChange={setStackCurrentPosition}
                          />
                          <SimpleTooltip
                            title='Stack current position'
                            description='See the target distribution on top of your current position.'
                          />
                        </button>
                        <LiquidityBars bins={simulatedBins} aspect={3} />
                      </div>
                    )}
                  </div>
                )}

              {bins.length > 61 && (
                <Warning text='Adding liquidity to a large range requires more than one transaction' />
              )}
              {bins.length <= 10 && rewardData && !isUSDCUSDT && (
                <Warning text='To qualify for the Rewards Incentives Program, LP positions must exceed 10 bins, with no more than 20% of the position in the active bin' />
              )}
              {((amountX > 0n && amountY === 0n) ||
                (amountX === 0n && amountY > 0n)) &&
                withinActiveId && (
                  <Warning text='Higher liquidity slippage could be expected as you are adding liquidity with only one token inside the active bin.' />
                )}
            </>
          )}
          {connectedAddress ? (
            <>
              {/* {aboveActiveId && `Only ${token0.symbol} will be added`}
            {belowActiveId && `Only ${token1.symbol} will be added`} */}

              <div className='buttons-container'>
                {strategy !== 'undefined' && (
                  <>
                    {amountX > allowance0 && !token0.equals(MASSA) && (
                      <ButtonAllowance
                        onClick={increaseAllowanceToken0}
                        pending={pendingAllowance0}
                        allowanceType={allowanceType0}
                        setAllowanceType={setAllowanceType0}
                        token={token0}
                      />
                    )}
                    {amountY > allowance1 && !token1.equals(MASSA) && (
                      <ButtonAllowance
                        onClick={increaseAllowanceToken1}
                        pending={pendingAllowance1}
                        allowanceType={allowanceType1}
                        setAllowanceType={setAllowanceType1}
                        token={token1}
                      />
                    )}
                  </>
                )}
                <Button
                  text='Add Liquidity'
                  pending={pendingAddLiquidity || pendingDepositLiquidity}
                  disabledText={getDisabledText()}
                  disabled={
                    (amountX > allowance0 && !token0.equals(MASSA)) ||
                    (amountY > allowance1 && !token1.equals(MASSA))
                  }
                  variant='contained'
                  onClick={() => {
                    strategy === 'manual'
                      ? deltaIds.length > 61
                        ? setShowBatchModal(true)
                        : addLiquidity()
                      : depositLiquidity();
                  }}
                />
              </div>
            </>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
      {showBatchModal && (
        <LiquidityBatchModal
          showModal={showBatchModal}
          setShowModal={setShowBatchModal}
          method='add'
          bins={bins}
          simulatedBins={simulatedBins}
          stackCurrentPosition={stackCurrentPosition}
          setStackCurrentPosition={setStackCurrentPosition}
          activeIdDesired={activeIdDesired}
          chosenShape={chosenShape}
          resetTokensInputs={resetTokensInputs}
        />
      )}
    </>
  );
};

interface RadiusPickerProps {
  binRadius: number;
  setBinRadius: React.Dispatch<React.SetStateAction<number>>;
  targetPriceId: number;
  setTargetPriceId: React.Dispatch<React.SetStateAction<number>>;
  setRangeValue: React.Dispatch<React.SetStateAction<[number, number]>>;
  activeId: number;
}

const RadiusPicker = ({
  binRadius,
  setBinRadius,
  targetPriceId,
  setTargetPriceId,
  setRangeValue,
  activeId
}: RadiusPickerProps) => {
  const { token0, token1, binStep, invertPrice } = useContext(PoolContext);
  const [targetPrice, setTargetPrice] = useState(
    getPriceFromId(targetPriceId, binStep) *
      10 ** (token0.decimals - token1.decimals)
  );
  const [previousInvertPrice, setPreviousInvertPrice] = useState(false);

  const abs = (value: number, invert: boolean) => (invert ? value : 1 / value);
  const getPrice = (id: number) =>
    abs(
      getPriceFromId(id, binStep) * 10 ** (token0.decimals - token1.decimals),
      invertPrice
    );

  // const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   e.stopPropagation();

  //   if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

  //   e.preventDefault();
  //   const val = parseFloat((e.target as HTMLInputElement).value);
  //   const targetId = getIdFromPrice(invertPrice ? val : 1 / val, binStep);

  //   const up =
  //     (invertPrice && e.key === 'ArrowUp') ||
  //     (!invertPrice && e.key === 'ArrowDown');
  //   setTargetPriceId(targetId + (up ? 1 : -1));
  //   setRangeValue([targetId - binRadius, targetId + binRadius]);
  // };

  useEffect(() => {
    if (invertPrice) {
      setTargetPrice(previousInvertPrice ? 1 / targetPrice : targetPrice);
    } else {
      setTargetPrice(previousInvertPrice ? targetPrice : 1 / targetPrice);
    }

    setPreviousInvertPrice(!previousInvertPrice);
  }, [invertPrice]);

  useEffect(() => {
    setTargetPrice(
      getPriceFromId(targetPriceId, binStep) *
        10 ** (token0.decimals - token1.decimals)
    );
  }, [targetPriceId]);

  return (
    <div className='bin-radius-container'>
      <div>
        <span>Target price:</span>
        <Input
          value={targetPrice}
          label={`${(invertPrice ? token1 : token0).symbol} per ${
            (invertPrice ? token0 : token1).symbol
          }`}
          min={0}
          onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
          onBlur={(e) => {
            if (e.target.value === '0' || isNaN(parseFloat(e.target.value))) {
              setTargetPriceId(activeId);
              setTargetPrice(
                getPriceFromId(activeId, binStep) *
                  10 ** (token0.decimals - token1.decimals)
              );
              setRangeValue([activeId - binRadius, activeId + binRadius]);
              return;
            }
            const val = invertPrice
              ? parseFloat(e.target.value) /
                10 ** (token0.decimals - token1.decimals)
              : 1 /
                parseFloat(e.target.value) /
                10 ** (token0.decimals - token1.decimals);

            const targetId = getIdFromPrice(val, binStep);
            const _targetPrice =
              getPriceFromId(targetId, binStep) *
              10 ** (token0.decimals - token1.decimals);

            setTargetPrice(_targetPrice);
            setTargetPriceId(targetId);
            setRangeValue([targetId - binRadius, targetId + binRadius]);
          }}
        />
      </div>
      <div>
        <span>
          <SimpleTooltip
            title='Radius:'
            description='Number of bins on either side of the active one.'
          />
        </span>
        <Input
          value={binRadius}
          onChange={(e) => {
            const val = minmax(parseInt(e.target.value), 0, 500);
            setBinRadius(val);
            if (isNaN(val)) return;
            setRangeValue([targetPriceId - val, targetPriceId + val]);
          }}
          onBlur={() => {
            if (isNaN(binRadius)) {
              setBinRadius(5);
              setRangeValue([targetPriceId - 5, targetPriceId + 5]);
            }
          }}
        />
      </div>
      <div>
        <span>Range min:</span>
        <Input
          disabled
          value={getPrice(
            targetPriceId - (Number.isNaN(binRadius) ? 5 : binRadius)
          )}
          className='Input input-disabled'
          label={`${(invertPrice ? token1 : token0).symbol} per ${
            (invertPrice ? token0 : token1).symbol
          }`}
        />
      </div>
      <div>
        <span>Range max:</span>
        <Input
          disabled
          value={getPrice(
            targetPriceId + (Number.isNaN(binRadius) ? 5 : binRadius)
          )}
          className='Input input-disabled'
          label={`${(invertPrice ? token1 : token0).symbol} per ${
            (invertPrice ? token0 : token1).symbol
          }`}
        />
      </div>
    </div>
  );
};

export default AddLiquidity;
