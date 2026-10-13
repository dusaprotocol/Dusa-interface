import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { parseUnits } from '@dusalabs/sdk';
import {
  faChevronDown,
  faExternalLinkAlt,
  faGear,
  faWarning
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import debounce from 'lodash.debounce';
import { Link } from 'react-router-dom';
import AutoRefresh from 'components/AutoRefresh';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import Checkbox from 'components/Checkbox';
import ConnectButton from 'components/ConnectButton';
import Dropdown from 'components/Dropdown';
import Info, { SimpleInfo, Warning } from 'components/Info';
import InvertTokens from 'components/InvertTokens';
import PageHeader from 'components/PageHeader';
import TokenInput from 'components/TokenInput';
import TokenModal from 'components/TokenModal';
import { SimpleTooltip } from 'components/Tooltip';
import WrapModal from 'components/WrapModal';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import { useFetchDCAs } from 'hooks/useFetchDCAs';
import usePairManager from 'hooks/usePairManager';
import { useSendTransaction } from 'hooks/useSendTransaction';
import ErrorPage from 'pages/ErrorPage';
import { TradeContext } from 'pages/Trade';
import {
  FEATURE_FLAGS,
  IS_BUILDNET,
  dcaManagerSC,
  dcaManagerSCV2
} from 'utils/config';
import {
  U256_MAX,
  MIN_ALLOWANCE_BEFORE_INCREASE,
  ONE_MONTH,
  ONE_MINUTE,
  ONE_DAY,
  ONE_HOUR,
  ONE_WEEK
} from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  blockInvalidChar,
  getFrequencyDuration,
  getTimezomeDate,
  getTokenFromAddress,
  getTokensDCAFromStorage,
  printBigintIsh,
  roundTokenAmount,
  unFormatPrintedNumber
} from 'utils/methods';
import { pools } from 'utils/pools';
import { updateLastTokensDCA } from 'utils/storage';
import { DUSA_MAIN, MASSA, USDC, WBTC, WETH, WETH_B, WMAS } from 'utils/tokens';
import { buildDCATx, buildIncreaseAllowanceTx } from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';
import { Allowance, Token } from 'utils/types';
import ActiveDCA from './components/ActiveDCA';
import CSVModal from './components/CSVModal';
import { DateTimePicker } from './components/DateTimePicker';
import DCAHistory from './components/DCAHistory';
import './index.scss';

const DCA = () => {
  const [activeManageTab, setActiveManageTab] = useState(0);
  const [showCSVModal, setShowCSVModal] = useState(false);

  const { connected, connectedAddress, isLoading, refetch } = useContext(
    AccountWrapperContext
  );
  const { dcas } = useFetchDCAs(connectedAddress);

  const isLoadingDCAs = isLoading(['dcas']);
  const refetchDCAs = refetch(['dcas']);

  if (!FEATURE_FLAGS.DCA) return <ErrorPage />;

  return (
    <>
      <div className='DCA'>
        <PageHeader
          title='DCA'
          description='By investing steadily, DCA reduces the impact of market swings.'
        >
          <a
            href='https://docs.dusa.io/concepts/dca'
            rel='noreferrer noopener'
            target='_blank'
            className='learn-more-dca'
          >
            Learn more about DCA
          </a>
        </PageHeader>
        <div className='dca-container'>
          <div className='dca-content margin-dca'>
            <DCACard />
            <div className='dca-active-container'>
              <div className='active-history-header'>
                <div className='active-manage'>
                  {['Current active DCA', 'DCA History'].map(
                    (heading, index) => {
                      return (
                        <button
                          key={index}
                          className={index === activeManageTab ? 'active' : ''}
                          onClick={() => setActiveManageTab(index)}
                        >
                          {heading}
                        </button>
                      );
                    }
                  )}
                </div>
                {dcas.length > 0 && (
                  <div className='flex items-center gap-2'>
                    {/* <div
                      onClick={() => setShowCSVModal(true)}
                      className='flex items-center gap-1 bg-[var(--secondary-bg)] px-2 py-1 rounded-md cursor-pointer'
                    >
                      <FontAwesomeIcon icon={faFileCsv} />
                      <span>csv</span>
                    </div> */}
                    <div className='auto-refresh-dca'>
                      <AutoRefresh refetchFunction={refetch} interval={60000} />
                    </div>
                  </div>
                )}
              </div>
              {activeManageTab === 0 ? (
                <ActiveDCA
                  dcas={dcas}
                  refetch={() => refetchDCAs}
                  isLoading={isLoadingDCAs}
                />
              ) : (
                <DCAHistory
                  dcas={dcas}
                  isLoading={isLoadingDCAs}
                  refetch={() => refetchDCAs}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {showCSVModal && <CSVModal dcas={dcas} setShowModal={setShowCSVModal} />}
    </>
  );
};

export default DCA;

const NB_EXECUTION_BASE = 20;

interface DCACardProps {
  tradeCard?: boolean;
}

const defaultSlippages = [20, 50, 70]; // base 1000, 2%, 5%, 7%
const frequencyText = ['hours', 'days', 'weeks', 'months'];
IS_BUILDNET && frequencyText.unshift('minutes');

export const DCACard = ({ tradeCard = false }: DCACardProps) => {
  const lastTokens = getTokensDCAFromStorage();
  const [showModal0, setShowModal0] = useState(false);
  const [showModal1, setShowModal1] = useState(false);
  const [showWrapModal, setShowWrapModal] = useState(false);
  const [dcaInterval, setDcaInterval] = useState(ONE_DAY);
  const [time, setTime] = useState(1);
  const [frequencyIndex, setFrequencyIndex] = useState(
    frequencyText.indexOf('days')
  );
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const [showDropDown, setShowDropDown] = useState(false);
  const [showDropDownFrequency, setShowDropDownFrequency] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [endDate, setEndDate] = useState<number>();
  const [cycles, setCycles] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [t0, setT0] = useState<Token | undefined>(lastTokens[0]);
  const [t1, setT1] = useState<Token | undefined>(lastTokens[1]);

  const { token0DCA, setToken0DCA, token1DCA, setToken1DCA } =
    useContext(TradeContext);

  const token0 = token0DCA ?? t0;
  const setToken0 = setToken0DCA ?? setT0;
  const token1 = token1DCA ?? t1;
  const setToken1 = setToken1DCA ?? setT1;

  const { dcaSlippage, setDcaSlippage } = useContext(SettingsContext);

  const [slippageValue, setSlippageValue] = useState(dcaSlippage / 10);

  const { connectedAddress } = useContext(AccountWrapperContext);

  const { dcas } = useFetchDCAs(connectedAddress);

  const activeDCAs = dcas?.filter(
    (dca) =>
      dca.status === 'ACTIVE' ||
      dca.status === 'ERRORED_QUOTER' ||
      dca.execution.length < dca.nbOfDCA
  );

  useEffect(() => {
    if (!token0 || !token1) return;
    updateLastTokensDCA([token0, token1]);
  }, [token0, token1]);

  useEffect(() => {
    if (token0?.equals(MASSA) && token1?.equals(WMAS)) {
      setToken0(MASSA);
      setToken1(USDC);
    } else if (token1?.equals(WMAS)) {
      setToken1(MASSA);
    }
  }, [token1]);

  const getAmountInFromActiveDCAs = (): bigint => {
    const dcasToken0 =
      activeDCAs?.filter(
        (dca) => token0 && getTokenFromAddress(dca.tokenIn).equals(token0)
      ) || [];

    const amounts = dcasToken0.reduce((acc, cur) => {
      const dcaExecuted =
        1 + Math.floor((Date.now() - cur.startTime.getTime()) / cur.interval);
      const amount =
        BigInt(cur.amountEachDCA) * BigInt(cur.nbOfDCA) -
        BigInt(cur.amountEachDCA) * BigInt(dcaExecuted);

      return acc + amount;
    }, 0n);

    return amounts;
  };

  const amountInActiveDCAs = getAmountInFromActiveDCAs();
  const isMasToken0 = token0?.equals(MASSA); // token0.isNative;

  // Memoize quoteAssets for token1 to prevent unnecessary recalculation
  const quoteAssetsForToken1 = useMemo(() => {
    const baseAssets = [MASSA, USDC, WBTC, WETH, WETH_B, DUSA_MAIN];
    // If DUSA_MAIN is in the list and token0 is selected,
    // filter out token0 to prevent DUSA_MAIN from being moved to tokenIn
    if (token0 && token1 && token1.equals(DUSA_MAIN)) {
      return baseAssets.filter((t) => !t.equals(token0));
    }
    return baseAssets;
  }, [token0, token1]);

  const allowanceQuery = useFetchAllowance({
    tokenAddress: token0?.address,
    spenderAddress: dcaManagerSCV2
  });
  const allowance = allowanceQuery.data || 0n;
  const {
    quantity0,
    quantity1,
    balance0,
    balance1,
    bestTrade,
    fetchingTrade,
    changeQuantity,
    changeToken,
    resetTokensInputs,
    invertTokens,
    fetchBalances,
    fetchBestTrade
  } = usePairManager({
    token0,
    token1,
    setToken0,
    setToken1,
    binStep: 0,
    isDCA: true
  });

  const isBigPool = bestTrade?.quote.pairs.includes(pools[0].pairAddress); // WMAS-USDC pool TODO rajouter BTC pool

  const changeTime = (t: string, index?: number) => {
    if (t.length >= 9) return;
    setTime(parseInt(t));
    if (!t) return;
    let tm = parseInt(t);

    const downIndexOnMainnet = IS_BUILDNET ? 0 : 1;

    switch (index ?? frequencyIndex) {
      case 0 - downIndexOnMainnet: // minutes
        tm *= ONE_MINUTE;
        break;
      case 1 - downIndexOnMainnet:
        tm *= ONE_HOUR;
        break;
      case 2 - downIndexOnMainnet:
        tm *= ONE_DAY;
        break;
      case 3 - downIndexOnMainnet:
        tm *= ONE_WEEK;
        break;
      case 4 - downIndexOnMainnet:
        tm *= ONE_MONTH;
        break;
      default:
        break;
    }
    setDcaInterval(tm);
  };

  const handleChangeTime = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeTime(event.target.value);
  };

  const request = debounce((qty: string | undefined, isToken0: boolean) => {
    fetchBestTrade(qty, isToken0);
    setIsTyping(false);
  }, 750);

  const debounceFetchBestTrade = useCallback(
    (qty: string | undefined, isToken0: boolean) => {
      request(qty, isToken0);
      setIsTyping(true);
    },
    [token0, token1]
  );

  const onChangeQuantity = (qty: string | undefined, isToken0: boolean) => {
    changeQuantity(qty, isToken0);
    debounceFetchBestTrade(qty, isToken0);
  };

  const invalidQuantity = !quantity0 || !quantity1;

  const amountIn =
    quantity0 && token0 ? parseUnits(quantity0, token0.decimals) : 0n;

  const { data: price } = trpc.getTokenValue.useQuery(
    {
      tokenAddress: token0 ? getWmasIfMas(token0).address : '',
      tokenDecimals: token0?.decimals ?? 18
    },
    { enabled: !!token0 }
  );

  const miminumDollarValue = 10;
  const minimumQuantity = price
    ? BigInt(
        ((miminumDollarValue / price) * 10 ** (token0?.decimals ?? 18)).toFixed(
          0
        )
      )
    : 0n;

  const quantityDollarValue =
    price && quantity0
      ? price * Number(unFormatPrintedNumber(quantity0))
      : undefined;

  const { pending: pendingDca, submitTx: startDCA } = useSendTransaction({
    data: buildDCATx({
      amountEachDCA: amountIn,
      interval: dcaInterval > 2 ** 64 - 1 ? 2 ** 63 - 1 : dcaInterval,
      nbOfDCA: cycles > 2 ** 64 - 1 ? 2 ** 63 - 1 : cycles,
      tokenPath: bestTrade ? bestTrade.route.path.map((t) => t.address) : [],
      threshold: dcaSlippage,
      startIn: 0,
      moreGas: quantityDollarValue
        ? isBigPool
          ? quantityDollarValue >= 100
          : quantityDollarValue >= 50
        : true
    }),
    onTxConfirmed: () => {
      resetTokensInputs();
      setDcaInterval(ONE_DAY);
      setTime(1);
      setEndDate(
        getTimezomeDate(new Date()).getTime() + ONE_DAY * NB_EXECUTION_BASE
      );
      fetchBalances();
      allowanceQuery.refetch();
    }
  });

  const amountToIncreaseAllowance = // increase permanently allowance || infinity cycles
    (cycles === 0 || allowanceType === 'increaseMax') &&
    allowance < MIN_ALLOWANCE_BEFORE_INCREASE
      ? U256_MAX
      : amountIn * BigInt(cycles) - allowance + amountInActiveDCAs;

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token0?.address ?? '',
        dcaManagerSCV2,
        amountToIncreaseAllowance
      ),
      onTxConfirmed: () => allowanceQuery.refetch()
    });

  const handleDcaSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value >= 1 && value <= 99.9) {
      setDcaSlippage(parseInt((value * 10).toString()));
      setSlippageValue(value);
    } else if (value > 99.9) {
      setSlippageValue(99.9);
      setDcaSlippage(999);
    } else {
      setSlippageValue(value);
      setDcaSlippage(50);
    }
  };

  useEffect(() => {
    if (!isChecked) setCycles(0);
    else
      setEndDate(
        getTimezomeDate(new Date()).getTime() + dcaInterval * calculateCycles()
      );
  }, [isChecked]);

  const calculateCycles = (): number => {
    if (!endDate) return NB_EXECUTION_BASE;
    const now = getTimezomeDate(new Date()).getTime();
    const diff = endDate - now;
    const c = Math.floor(diff / dcaInterval) + 1;
    return c < 0 ? NB_EXECUTION_BASE : c === 0 ? 1 : c;
  };

  useEffect(() => {
    if (!endDate) return;
    setCycles(calculateCycles());
  }, [endDate]);

  useEffect(() => {
    if (!isChecked || cycles === 0) return;
    setEndDate(getTimezomeDate(new Date()).getTime() + dcaInterval * cycles);
  }, [dcaInterval, isChecked]);

  // update end date every 5 minutes to improve UX
  useEffect(() => {
    if (!isChecked || !endDate) return;
    const intervalId = setInterval(() => {
      setEndDate(endDate + ONE_MINUTE * 5);
    }, ONE_MINUTE * 5);
    return () => clearInterval(intervalId);
  }, [endDate, isChecked]);

  useEffect(() => {
    if (token0?.address) {
      allowanceQuery.refetch();
    }
  }, [token0?.address]);

  return (
    <div
      className={clsx(
        'md:min-w-[420px] DCACard',
        !tradeCard && 'pro min-w-full'
      )}
    >
      <div className='dca-bloc-container'>
        {!tradeCard && (
          <div className='DCACard-header'>
            <span>DCA</span>
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
                <h3>DCA Settings</h3>
                <div className='swap-settings-content'>
                  <div className='settings-parameter'>
                    <div className='slippage-header'>
                      <SimpleTooltip
                        title='Max DCA Slippage'
                        description='Your DCA execution will be delayed if the price changes unfavorably by more than this percentage before the execution. Min slippage is 1%. Max slippage is 99.9%.'
                        position='bottom'
                      />
                      <span>{dcaSlippage / 10}%</span>
                    </div>
                    <div className='parameter-values'>
                      {defaultSlippages.map((defaultSlippage, index) => {
                        return (
                          <button
                            key={index}
                            onClick={() => setDcaSlippage(defaultSlippage)}
                            className={
                              defaultSlippage === dcaSlippage ? 'active' : ''
                            }
                          >
                            {defaultSlippage / 10}%
                          </button>
                        );
                      })}
                      <div
                        className={
                          defaultSlippages.includes(dcaSlippage)
                            ? 'custom-slippage'
                            : 'custom-slippage active'
                        }
                      >
                        <input
                          type='number'
                          step={0.1}
                          inputMode='decimal'
                          min={1}
                          max={99.9}
                          value={slippageValue}
                          placeholder={
                            defaultSlippages.includes(dcaSlippage)
                              ? '5'
                              : (dcaSlippage / 10).toString()
                          }
                          onChange={handleDcaSlippageChange}
                          onFocus={handleDcaSlippageChange}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        )}
        <div className='dca-inputs-container'>
          <div className='dca-token-inputs'>
            <div className='TokenInput-wrapper'>
              <TokenInput
                headerText='From'
                token={token0}
                otherToken={token1}
                changeToken={(t: Token) => changeToken(t, true)}
                quoteAssets={[MASSA, WMAS, USDC, WBTC, WETH, WETH_B]}
                quantity={quantity0}
                changeQuantity={(q?: string) => onChangeQuantity(q, true)}
                balance={balance0}
                dollarValue={price}
                isError={undefined}
              />
              <div className='dca-invert-tokens'>
                <InvertTokens
                  handleInvert={invertTokens}
                  disabled={token1?.equals(DUSA_MAIN)}
                  disabledTooltipText='DUSA is only available on token out'
                />
              </div>
            </div>
            <TokenInput
              headerText='From'
              token={token1}
              otherToken={token0}
              changeToken={(t: Token) => changeToken(t, false)}
              quoteAssets={quoteAssetsForToken1}
              quantity={undefined}
              changeQuantity={(q?: string) => onChangeQuantity(q, false)}
              balance={balance1}
              isError={undefined}
              displayDCAInfo
              disabled
            />
          </div>

          <div className='dca-frequency'>
            <span>Frequency:</span>
            <div className='frequency-input-wrapper'>
              <input
                className='frequency-input'
                type='number'
                inputMode='decimal'
                step={1}
                min={1}
                onKeyDown={(e) => blockInvalidChar(e, ['.', ','])}
                onChange={handleChangeTime}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setTime(1);
                    setDcaInterval(getFrequencyDuration(frequencyIndex));
                  }
                }}
                value={time === 0 ? '' : time}
              />
              <Dropdown
                isOpen={showDropDownFrequency}
                setIsOpen={setShowDropDownFrequency}
                triggerButton={
                  <div className='trigger-frequency'>
                    <span>{frequencyText[frequencyIndex]}</span>
                    <FontAwesomeIcon icon={faChevronDown} />
                  </div>
                }
              >
                <div className='periode-time'>
                  {frequencyText.map((periodeTime, index) => {
                    return (
                      <div
                        className={clsx(
                          'periode-time-item',
                          index === frequencyIndex && 'active-periode'
                        )}
                        key={index}
                        onClick={() => {
                          setFrequencyIndex(index);
                          changeTime(time.toString(), index);
                          setShowDropDownFrequency(false);
                        }}
                      >
                        {periodeTime}
                      </div>
                    );
                  })}
                </div>
              </Dropdown>
            </div>
          </div>
          <div className='dca-cycles'>
            <div className='dca-cycles-title'>
              <span>Want to specify an end time?</span>
              <Checkbox checked={isChecked} onChange={setIsChecked} />
            </div>
            {isChecked && (
              <>
                <DateTimePicker
                  date={
                    new Date(
                      endDate ?? Date.now() + dcaInterval * NB_EXECUTION_BASE
                    )
                  }
                  setDate={(d) =>
                    setEndDate(getTimezomeDate(new Date(d)).getTime())
                  }
                />
                <>
                  <span className='dca-run-cycles'>
                    (The DCA will run for {cycles}{' '}
                    {cycles > 1 ? 'cycles' : 'cycle'})
                  </span>
                  <span className='dca-run-cycles'>
                    (Total amount to be invested:{' '}
                    {roundTokenAmount(
                      token0 || USDC,
                      amountIn * BigInt(cycles)
                    )}{' '}
                  </span>
                </>
              </>
            )}
          </div>
          {token0?.equals(WMAS) && token1?.equals(MASSA) && (
            <Info icon={faExternalLinkAlt}>
              <Link
                to={`/trade?tokenIn=${WMAS.address}&tokenOut=${MASSA.address}`}
              >
                To unwrap your WMAS, go to the trade page
              </Link>
            </Info>
          )}
          <div className='dca-buttons'>
            {!connectedAddress ? (
              <ConnectButton />
            ) : (
              <>
                {!isMasToken0 && fetchingTrade && (
                  <SimpleInfo text='Loading best path' isLoading />
                )}

                {amountIn > 0 && amountIn < minimumQuantity && (
                  <Info
                    icon={faWarning}
                    onClick={() =>
                      onChangeQuantity(
                        roundTokenAmount(
                          token0 ?? USDC,
                          minimumQuantity
                        ).toString(),
                        true
                      )
                    }
                  >
                    <span>{`${token0?.symbol} minimum quantity is ${printBigintIsh(
                      token0 ?? USDC,
                      minimumQuantity
                    )}`}</span>
                  </Info>
                )}

                {isMasToken0 ? ( // token0.isNative?
                  <>
                    <Warning
                      text={'DCA uses WMAS, a wrapped version of MAS coins'}
                    />
                    <Button
                      text='Wrap'
                      variant={tradeCard ? 'outlined' : 'contained'}
                      onClick={() => setShowWrapModal(true)}
                      disabled={
                        quantity0 === undefined ||
                        amountIn === 0n ||
                        isNaN(time) ||
                        time === 0 ||
                        (balance0 !== undefined && balance0 < amountIn)
                      }
                      disabledText={
                        (amountIn < minimumQuantity && 'Not enough quantity') ||
                        undefined
                      }
                    />
                  </>
                ) : quantity0 !== undefined &&
                  amountToIncreaseAllowance > 0 &&
                  token0 ? (
                  <>
                    <Warning
                      text={`Increase allowance for ${' '}
                      ${
                        amountToIncreaseAllowance === U256_MAX
                          ? '∞'
                          : printBigintIsh(token0, amountToIncreaseAllowance)
                      }${' '}
                      ${token0.symbol}`}
                    />

                    <ButtonAllowance
                      onClick={increaseAllowance}
                      pending={pendingAllowance}
                      disabled={allowanceQuery.isLoading}
                      allowanceType={allowanceType}
                      setAllowanceType={setAllowanceType}
                      token={token0}
                    />
                  </>
                ) : null}

                {!isMasToken0 && (
                  <>
                    <Button
                      text='Start DCA'
                      variant={tradeCard ? 'outlined' : 'contained'}
                      pending={pendingDca}
                      onClick={startDCA}
                      disabled={
                        fetchingTrade ||
                        (amountIn > 0 && amountIn < minimumQuantity) ||
                        isTyping
                      }
                      disabledText={
                        (dcaInterval > ONE_MONTH &&
                          'Max frequency is one month') ||
                        ((balance0 ?? 0n) < amountIn &&
                          'Insufficient balance') ||
                        (token0?.equals(WMAS) &&
                          token1?.equals(MASSA) &&
                          'Unwrap is not available on DCA') ||
                        (amountIn > 0n &&
                          invalidQuantity &&
                          !fetchingTrade &&
                          !isTyping &&
                          'Insufficient liquidity in the pool') ||
                        (invalidQuantity && 'Enter quantity') ||
                        (amountIn < minimumQuantity && 'Not enough quantity') ||
                        (amountToIncreaseAllowance > 0 &&
                          'Not enough allowance') ||
                        undefined
                      }
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {showModal0 ? (
        <TokenModal
          activeToken={token0}
          changeActiveToken={(t) => changeToken(t, true)}
          showModal={showModal0}
          setShowModal={setShowModal0}
          quoteAssets={[MASSA, WMAS, USDC, WETH, WETH_B]}
        />
      ) : showModal1 ? (
        <TokenModal
          activeToken={token1}
          changeActiveToken={(t) => changeToken(t, false)}
          showModal={showModal1}
          setShowModal={setShowModal1}
          quoteAssets={[MASSA, USDC, WETH, WETH_B]}
        />
      ) : (
        showWrapModal && (
          <WrapModal
            showModal={showWrapModal}
            setShowModal={setShowWrapModal}
            amount={roundTokenAmount(
              MASSA,
              cycles === 0
                ? (balance0 ?? 0n) - BigInt(10 * 10 ** 9)
                : amountIn * BigInt(cycles)
            ).toString()}
            onTxExecuted={() => {
              setToken0(WMAS);
            }}
          />
        )
      )}
    </div>
  );
};
