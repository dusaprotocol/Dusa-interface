import { useCallback, useContext, useEffect, useState } from 'react';
import { parseUnits } from '@dusalabs/sdk';
import {
  faArrowsRotate,
  faBan,
  faQuestionCircle,
  faWarning
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import ConnectButton from 'components/ConnectButton';
import { SimpleInfo, Warning } from 'components/Info';
import Modal from 'components/Modal';
import TokenLogo from 'components/TokenLogo';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import usePurchaseTokenContract from 'hooks/sale/usePurchaseTokenContract';
import useSaleContract from 'hooks/sale/useSaleContract';
import useWeb3 from 'hooks/sale/useWeb3';
import useCountdownSale from 'hooks/useCountdownSale';
import useFetchAllowance from 'hooks/useFetchAllowance';
import useFetchBalance from 'hooks/useFetchBalance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import ErrorPage from 'pages/ErrorPage';
import { FEATURE_FLAGS, IS_BUILDNET } from 'utils/config';
import {
  SALE_SC_ADDRESSES_Ethereum,
  SALE_TOKEN_SC_ADDRESSES_MASSA
} from 'utils/configSale';
import { U256_MAX } from 'utils/constants';
import {
  formatNumber,
  printBigintIsh,
  roundTokenAmount,
  toFraction,
  isMobile as isMobileFunction,
  roundUpperUnit,
  roundLowerUnit
} from 'utils/methods';
import { DUSA_LOCKED_SEED, MASSA, USDC, WMAS } from 'utils/tokens';
import {
  buildIncreaseAllowanceTx,
  buildSaleTx
} from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';
import { Allowance, Token } from 'utils/types';
import { switchToEthereum, switchToSepoliaTestnet } from 'utils/web3';
import Countdown from './components/Countdown';
import Limited from './components/SaleDetails/components/Limited';
import SoldOutBanner from './components/SaleDetails/components/SoldOutBanner';
import SaleDetails from './components/SaleDetails/SaleDetails';
import './index.scss';
import DusaPurchased from './components/DusaPurchased';
import SaleHeader from './components/SaleHeader';
import useSaleDusaPurchased from 'hooks/sale/useSaleDusaPurchased';

const salesInfo = [
  {
    title: 'Seed',
    price: { USDC: 0.03 },
    min: 50,
    max: 10_000,
    tokens: [USDC],
    vesting: '12 months',
    cliff: '3 months'
  },
  {
    title: 'Public 1',
    price: { USDC: 0.07, MAS: 0.065 },
    min: 50,
    max: 10_000,
    tokens: [USDC, MASSA],
    vesting: '6 months',
    cliff: '1 months'
  },
  {
    title: 'Public 2',
    price: { USDC: 0.12, MAS: 0.11 },
    min: 50,
    max: 10_000,
    tokens: [USDC, MASSA],
    vesting: '4 months'
  }
];
export type SaleInfo = (typeof salesInfo)[0];

const Sale = () => {
  const [sale, setSale] = useState(salesInfo[0]);
  const [tokenSelected, setTokenSelected] = useState(sale.tokens[0]);
  const [amount, setAmount] = useState<number>();
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmAddressModal, setShowConfirmAddressModal] = useState(false);
  const isSeedSoldOut = false;
  const isMASSoldOut = {
    0: null,
    1: false, // Public 1
    2: false // Public 2
  };

  const { connectedAddress, setShowDrawer } = useContext(AccountWrapperContext);
  const { dusaPurchased, refetchDusaPurchased } =
    useSaleDusaPurchased(connectedAddress);

  useEffect(() => {
    if (!isSeedSoldOut) return;
    setSale(salesInfo[1]);
  }, [isSeedSoldOut]);

  const completionPercentage = 60;

  const deepLinkMetamask = () => {
    const url = `https://metamask.app.link/dapp/${window.location.host}/sale`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isMobile = isMobileFunction();

  const isMASSelected = tokenSelected.equals(MASSA);
  const hasMASInSale = (sale: SaleInfo) => {
    return sale.tokens.some((token) => token.equals(MASSA));
  };

  const balanceQuery = useFetchBalance(tokenSelected.address, connectedAddress);
  const balance = balanceQuery.data;

  const { data: masPrice, refetch: refetchMasPrice } =
    trpc.getTokenValue.useQuery(
      {
        tokenAddress: WMAS.address,
        tokenDecimals: WMAS.decimals
      },
      { enabled: !!WMAS.address }
    );

  const minMAS = roundUpperUnit(sale.min / (masPrice ?? 1));
  const maxMAS = roundLowerUnit(sale.max / (masPrice ?? 1));

  const min = isMASSelected ? minMAS : sale.min;
  const max = isMASSelected ? maxMAS : sale.max;

  const { countdown, isFinite } = useCountdownSale();

  useEffect(() => {
    if (!masPrice) return;
    const interval = setInterval(refetchMasPrice, 20_000);
    return () => clearInterval(interval);
  }, [masPrice]);

  const saleAddressesOnMassa = SALE_TOKEN_SC_ADDRESSES_MASSA[
    salesInfo.findIndex(
      (s) => s.title === sale.title
    ) as keyof typeof SALE_TOKEN_SC_ADDRESSES_MASSA
  ] as { USDC: string; MAS?: string };

  const saleAddressMassa = isMASSelected
    ? saleAddressesOnMassa.MAS!
    : saleAddressesOnMassa.USDC;

  const saleAddressEthereum =
    SALE_SC_ADDRESSES_Ethereum[
      salesInfo.findIndex(
        (s) => s.title === sale.title
      ) as keyof typeof SALE_SC_ADDRESSES_Ethereum
    ];

  // Metamask Ethereum
  const {
    provider,
    account,
    connect,
    isCorrectNetwork,
    isLoading: isLoadingConnection
  } = useWeb3();
  const {
    allowance: allowanceOnEthereum,
    isAllowanceLoading,
    refetchAllowance,
    pendingApproveAllowance,
    approveAllowance
  } = usePurchaseTokenContract(saleAddressEthereum);
  const { amountOutEstimate, pendingInvest, invest, tokenPurchased } =
    useSaleContract(saleAddressEthereum, amount, setAmount, refetchAllowance);

  const allowanceQuery = useFetchAllowance({
    tokenAddress: USDC.address,
    spenderAddress: saleAddressMassa
  });
  const allowanceOnMassa = allowanceQuery.data || 0n;

  const amountToIncreaseAllowance = amount
    ? allowanceType === 'increaseMax'
      ? U256_MAX
      : parseUnits(amount.toString(), USDC.decimals) - allowanceOnMassa
    : 0n;

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        USDC.address,
        saleAddressMassa,
        amountToIncreaseAllowance
      ),
      onTxConfirmed: () => allowanceQuery.refetch()
    });

  const getAmountOutEstimate = useCallback(
    (_amountIn: bigint) => {
      const price = isMASSelected ? sale.price.MAS : sale.price.USDC;

      if (_amountIn === 0n || price === undefined) return 0n;

      const masPriceFraction = toFraction(masPrice ?? 1);
      return toFraction(price)
        .divide(isMASSelected ? masPriceFraction : toFraction(1))
        .invert()
        .multiply(
          _amountIn *
            BigInt(10 ** (DUSA_LOCKED_SEED.decimals - tokenSelected.decimals))
        ).quotient;
    },
    [isMASSelected, sale, masPrice, tokenSelected.decimals]
  );

  const amountIn =
    amount !== undefined
      ? parseUnits(
          amount.toString(),
          isMASSelected ? MASSA.decimals : USDC.decimals
        )
      : 0n;

  const amountOut = getAmountOutEstimate(amountIn);
  const amountOutMin = amountOut - amountOut / BigInt(20);

  const getIsOverMaxAmount = useCallback(
    (chain: 'Ethereum' | 'Massa') => {
      if (amount === undefined || amount <= 0) return false;

      const dusaPurchasedAmount =
        dusaPurchased?.find(
          (p) =>
            p.chain === chain &&
            p.name === sale.title &&
            p.amount !== undefined &&
            p.amount > 0n
        )?.amount ?? 0n;

      return (
        dusaPurchasedAmount + amountOut >
        getAmountOutEstimate(
          BigInt(max * 10 ** (isMASSelected ? MASSA.decimals : USDC.decimals))
        )
      );
    },
    [
      amount,
      dusaPurchased,
      sale.title,
      amountOut,
      getAmountOutEstimate,
      max,
      isMASSelected
    ]
  );

  const { submitTx: buyDusa, pending: pendingBuyDusa } = useSendTransaction({
    data: buildSaleTx(tokenSelected, amountIn, amountOutMin, saleAddressMassa),
    onTxConfirmed: () => {
      allowanceQuery.refetch();
    }
  });

  const handleButton = async () => {
    if (!account) {
      connect();
      return;
    }

    if (!isCorrectNetwork) {
      try {
        if (IS_BUILDNET) await switchToSepoliaTestnet();
        else await switchToEthereum();
      } catch (err) {
        console.error('Try to switch manualy to Ethereum:', err);
      }
      return;
    }

    if (amount && amount > 0) setShowConfirmAddressModal(true);
  };

  const handleSaleChange = (sale: SaleInfo, token: Token) => {
    if (amount === undefined) return;

    if (token.equals(USDC)) {
      const minLimit = sale.min;
      const maxLimit = sale.max;
      if (amount < minLimit) setAmount(minLimit);
      if (amount >= maxLimit) setAmount(maxLimit);
    } else if (token.equals(MASSA) && sale.price.MAS) {
      if (amount < minMAS) setAmount(minMAS);
      if (amount >= maxMAS) setAmount(maxMAS);
    }
  };

  const getDisablePurchase = (chain?: string) => {
    const isEthereum = chain === 'Ethereum';
    if (isEthereum && !provider && !isLoadingConnection && isMobile)
      return false;
    if (isEthereum && provider && !account) return false;
    if (isEthereum && !isCorrectNetwork && account) return false;
    if (amount === undefined) return true;
    if (!isEthereum && allowanceQuery.isLoading) return true;

    return (
      (!isMASSelected &&
        amount >= min &&
        (isEthereum ? allowanceOnEthereum : allowanceOnMassa) !== undefined &&
        parseUnits(amount.toString(), USDC.decimals) >
          (isEthereum ? (allowanceOnEthereum ?? 0n) : allowanceOnMassa)) ||
      amount < min
    );
  };

  const renderSalesInfo = () => {
    return (
      <div className='flex flex-wrap justify-center gap-8 w-full'>
        {salesInfo.map((saleItem, index) => {
          const isActive = saleItem === sale;
          const isDisabled = index === 0 && isSeedSoldOut;
          const isMASSold = isMASSoldOut[index as 1 | 2];

          return (
            <div
              className={clsx(
                'flex fade-slide',
                index === 1 && 'card-1',
                index === 2 && 'card-2'
              )}
              key={saleItem.title}
            >
              <div
                className={clsx(
                  'flex flex-col items-center gap-4 shadow-xl p-4 lg:px-6 border-2 rounded-2xl min-w-[270px] max-w-xs transition-transform duration-200 plg:y-7',
                  'bg-gradient-to-br',
                  isActive
                    ? `scale-110 bg-gradient-to-br ${index === 0 ? 'border-blue-500' : index === 1 ? 'border-orange-500' : 'border-green-500'}`
                    : index === 0
                      ? 'border-blue-500/40'
                      : index === 1
                        ? 'border-orange-500/40'
                        : 'border-green-500/40',
                  isDisabled
                    ? 'opacity-60 cursor-not-allowed'
                    : isActive
                      ? 'cursor-pointer'
                      : 'hover:scale-105 cursor-pointer'
                )}
                onClick={() => {
                  if (isDisabled) return;
                  setTokenSelected(USDC);
                  setSale(saleItem);
                  if (!amount) return;
                  handleSaleChange(saleItem, USDC);
                }}
              >
                {isDisabled && <SoldOutBanner />}
                <div className='flex flex-col items-center w-full'>
                  <div className='flex items-center gap-2 mb-2'>
                    <h2 className='font-bold text-2xl tracking-tight'>
                      {saleItem.title} Sale
                    </h2>
                    {index === 0 && (
                      <Limited text='Limited Sale, will be disabled on sold out' />
                    )}
                  </div>
                  <div className='flex flex-col mb-2 w-full'>
                    <div className='flex justify-center items-center gap-2'>
                      <span className='font-extrabold text-xl'>
                        ${formatNumber(saleItem.price.USDC)}
                      </span>
                      <TokenLogo logoURI={USDC.logoURI} size={26} />
                    </div>
                    {saleItem.price.MAS && saleItem.price.MAS > 0 && (
                      <div className='flex justify-center'>
                        <div className='relative flex justify-center items-center gap-2'>
                          <span className='font-bold text-lg'>
                            ${formatNumber(saleItem.price.MAS)}
                          </span>
                          <TokenLogo logoURI={MASSA.logoURI} size={26} />
                          {index !== 0 && (
                            <Limited
                              text={`Limited supply of DUSA available in MAS${isMASSold ? ' has been sold out' : ''}`}
                            />
                          )}
                          {isMASSold && (
                            <div className='left-[-5px] absolute bg-red-600 w-[calc(100%+10px)] h-[3px]'></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className='flex flex-col justify-center items-center gap-2 w-full'>
                  <div className='flex justify-between gap-4 w-full text-base'>
                    <div className='flex flex-col items-center w-1/2 text-center'>
                      <span className='opacity-75 font-light'>Min</span>
                      <span>{formatNumber(saleItem.min)} USDC</span>
                      {hasMASInSale(saleItem) && minMAS > 0 && (
                        <span>{formatNumber(minMAS)} MAS</span>
                      )}
                    </div>
                    <div className='flex flex-col items-center w-1/2 text-center'>
                      <span className='opacity-75 font-light'>Max</span>
                      <span>
                        {saleItem.max > 0 && formatNumber(saleItem.max)} USDC
                      </span>
                      {hasMASInSale(saleItem) && maxMAS > 0 && (
                        <span>{formatNumber(maxMAS)} MAS</span>
                      )}
                    </div>
                  </div>
                  <div className='flex justify-between gap-4 w-full text-base'>
                    <div className='flex flex-col items-center w-1/2'>
                      <span className='opacity-75 font-light'>Vesting</span>
                      <span>{saleItem.vesting}</span>
                    </div>
                    <div className='flex flex-col items-center w-1/2'>
                      <span className='opacity-75 font-light'>Cliff</span>
                      <span>
                        {saleItem.cliff ? (
                          saleItem.cliff
                        ) : (
                          <FontAwesomeIcon icon={faBan} />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPurchase = () => {
    return (
      <div className='flex flex-col gap-2 w-full'>
        <div className='flex md:flex-row flex-col items-center md:gap-8 bg-[var(--hover-bg)] p-4 md:px-8 md:py-4 rounded-xl w-full'>
          <div className='flex flex-row md:flex-col items-center gap-2 md:gap-0'>
            <h2 className='font-bold text-xl'>Purchase</h2>
            <span className='opacity-70 mt-1 text-[1.4rem] italic text-nowrap'>
              ( {sale.title} )
            </span>
          </div>
          <div className='flex md:flex-row flex-col md:justify-around gap-2 md:gap-0 w-full'>
            <div className='flex flex-col md:flex-1 justify-center items-center gap-2'>
              <div className='flex flex-wrap justify-center md:justify-start items-end gap-1'>
                <input
                  type='number'
                  inputMode='decimal'
                  min={min}
                  max={max}
                  step='any'
                  className='bg-transparent focus:outline-none w-full md:w-[220px] text-[2.5rem] text-center md:text-right'
                  value={amount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value > max) {
                      setAmount(max);
                      return;
                    }
                    if (isNaN(value)) setAmount(undefined);
                    else if (value) {
                      setAmount(Number(value.toFixed(6)));
                    }
                  }}
                  placeholder={formatNumber(max)}
                />
                <span className='opacity-70 mb-1 text-[1.4rem] italic'>
                  {tokenSelected.symbol}
                </span>
                <button
                  style={{
                    border: '1px solid var(--secondary-color-transp)'
                  }}
                  className={clsx(
                    'hover:bg-main-color opacity-70 mb-1 ml-4 px-1 py-1 rounded hover:text-main-bg text-sm transition-colors',
                    balance === undefined && 'cursor-not-allowed'
                  )}
                  onClick={() => {
                    const bal = roundTokenAmount(tokenSelected, balance ?? 0n);
                    setAmount(bal > max ? max : bal);
                  }}
                  disabled={balance === undefined}
                >
                  MAX
                </button>
              </div>
              <div className='flex gap-2 text-center italic'>
                <div
                  className='hover:font-medium cursor-pointer'
                  onClick={() => setAmount(min)}
                >
                  ({formatNumber(min)} {tokenSelected.symbol} min
                </div>
                <div>-</div>
                <div
                  className='hover:font-medium cursor-pointer'
                  onClick={() => setAmount(max)}
                >
                  {formatNumber(max)} {tokenSelected.symbol} max)
                </div>
              </div>
            </div>

            <div className='flex md:flex-col justify-center items-center md:items-start gap-2'>
              {!isMobile &&
                sale.tokens.map((token) => {
                  const isSelected = token.equals(tokenSelected);
                  return (
                    <div
                      key={token.symbol}
                      className='flex items-center gap-2 px-4 py-2 border border-[var(--secondary-color-transp)] md:border-transparent rounded transition-colors cursor-pointer'
                      onClick={() => {
                        setTokenSelected(token);
                        handleSaleChange(sale, token);
                      }}
                    >
                      <div className='relative flex justify-center items-center border rounded-full w-4 h-4'>
                        <div
                          className={clsx(
                            'z-20 brightness-125 rounded-full w-full h-full filter',
                            isSelected && 'bg-[var(--green)]'
                          )}
                        />
                      </div>
                      <TokenLogo logoURI={token.logoURI} />
                      <p className='font-medium text-sm'>{token.symbol}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          {amount !== undefined && amount > 0 && (
            <SimpleInfo
              text={`You are investing ${formatNumber(amount)} ${
                tokenSelected.symbol
              } for ${printBigintIsh(DUSA_LOCKED_SEED, amountOut)} DUSA`}
              icon={faQuestionCircle}
            />
          )}
          {!isMobile && !isMASSelected && (
            <SimpleInfo
              text={'Purchase Dusa with USDC is also available on Ethereum'}
              icon={faQuestionCircle}
            />
          )}
        </div>
        <div className='flex md:flex-row flex-col items-end gap-2 w-full h-full'>
          {!isMASSelected && (
            <div className='flex flex-col justify-end gap-2 w-full h-full'>
              {amount !== undefined &&
                amount >= min &&
                allowanceOnEthereum !== undefined &&
                parseUnits(amount.toString(), USDC.decimals) >
                  allowanceOnEthereum && (
                  <Button
                    text='Approve allowance'
                    variant='contained'
                    onClick={() => approveAllowance(amount)}
                    pending={pendingApproveAllowance}
                    stretch
                  />
                )}
              <Button
                text={
                  !provider && isLoadingConnection
                    ? 'Connect Ethereum Wallet'
                    : !provider && !isLoadingConnection
                      ? isMobile
                        ? 'Launch app on Metamask'
                        : 'Install Metamask'
                      : !account
                        ? 'Connect Ethereum Wallet'
                        : !isCorrectNetwork
                          ? `Switch to ${IS_BUILDNET ? 'Ethereum testnet' : 'Ethereum'}`
                          : 'Purchase Dusa on Ethereum'
                }
                disabled={getDisablePurchase('Ethereum')}
                disabledText={
                  (getIsOverMaxAmount('Ethereum') &&
                    'Amount is over max limit') ||
                  undefined
                }
                pending={pendingInvest || isLoadingConnection}
                variant='contained'
                onClick={() => {
                  if (!provider && !isLoadingConnection && isMobile) {
                    deepLinkMetamask();
                    return;
                  }
                  handleButton();
                }}
                stretch
              />
            </div>
          )}
          {!isMobile && !isMASSelected && (
            <div className='bg-[var(--white)] opacity-75 rounded-2xl w-full md:w-[5px] h-[2px] md:h-full'></div>
          )}
          {!isMobile &&
            (!connectedAddress ? (
              <ConnectButton text='Connect Massa Wallet' />
            ) : (
              <div className='flex flex-col justify-end gap-2 w-full h-full'>
                {!isMASSelected &&
                  (!allowanceQuery.isLoading ? (
                    amount !== undefined &&
                    amount >= min &&
                    parseUnits(amount.toString(), USDC.decimals) >
                      allowanceOnMassa && (
                      <ButtonAllowance
                        onClick={increaseAllowance}
                        allowanceType={allowanceType}
                        setAllowanceType={setAllowanceType}
                        token={USDC}
                        stretch
                        pending={pendingAllowance}
                      />
                    )
                  ) : (
                    <Button
                      text='Loading allowance...'
                      variant='contained'
                      pending
                      stretch
                    />
                  ))}
                <Button
                  text='Purchase Dusa on Massa'
                  variant='contained'
                  disabled={getDisablePurchase()}
                  disabledText={
                    (getIsOverMaxAmount('Massa') &&
                      'Amount is over max limit') ||
                    undefined
                  }
                  pending={pendingBuyDusa}
                  onClick={buyDusa}
                />
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (!FEATURE_FLAGS.SALE) return <ErrorPage />;
  if (!isFinite) return <Countdown countdown={countdown ?? ''} />;

  return (
    <>
      <div className='Sale'>
        <SaleHeader />
        <DusaPurchased dusaPurchased={dusaPurchased} />
        <div className='px-4 sale__container'>
          <span className='py-2 lg:py-4 font-semibold text-xl text-center'>
            Choose a sale to invest in Dusa and get your DUSA tokens
          </span>
          <div className='flex flex-col gap-8'>
            <div className='sale__content'>{renderSalesInfo()}</div>
            <div className='flex flex-col gap-4'>
              <SimpleInfo
                icon={faWarning}
                text='To encourage participation in MAS, the price has been lowered by 10% compared to USDC, the quantity of DUSA in MAS has been limited.'
              />
              {isMobile && (
                <SimpleInfo
                  icon={faWarning}
                  text='On mobile, purchase DUSA is only available on Ethereum with USDC.'
                />
              )}
            </div>
          </div>

          <SaleDetails />
          <footer className='bottom-14 md:bottom-0 p-4 md:pt-8 md:pb-16 sale__footer'>
            <div className='flex justify-center w-full'>
              <div className='w-full md:w-[500px]'>
                <Button
                  text='Purchase'
                  variant='contained'
                  onClick={() => setShowModal(true)}
                />
              </div>
            </div>
          </footer>
        </div>
      </div>
      {showModal && (
        <>
          <Modal
            showModal={showModal}
            setShowModal={setShowModal}
            title='Purchase Dusa'
            variant='extra-large'
          >
            <div className='flex flex-col gap-2 lg:gap-8 mt-4'>
              <div className='hidden lg:flex flex-col gap-2'>
                <span className='py-2 lg:py-4 font-semibold text-xl text-center'>
                  Choose a sale to invest in Dusa and get your DUSA tokens
                </span>
                <div className='flex flex-row justify-between'>
                  {renderSalesInfo()}
                </div>
              </div>
              <div className='lg:hidden flex flex-row flex-wrap gap-2'>
                {salesInfo.map((saleModal, index) => {
                  const isSelected = sale === salesInfo[index];
                  const isSoldOut = index === 0 && isSeedSoldOut;
                  return (
                    <div
                      key={'modal' + saleModal.title}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 border border-[var(--secondary-color-transp)] rounded transition-colors grow',
                        isSoldOut ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                      onClick={() => {
                        if (isSoldOut) return;
                        setTokenSelected(USDC);
                        setSale(saleModal);
                        if (!amount) return;
                        handleSaleChange(saleModal, USDC);
                      }}
                    >
                      <div
                        className={clsx(
                          'relative flex justify-center items-center border rounded-full w-4 h-4',
                          isSoldOut && 'hidden'
                        )}
                      >
                        <div
                          className={clsx(
                            'z-20 brightness-125 rounded-full w-full h-full filter',
                            isSelected && 'bg-[var(--green)]'
                          )}
                        />
                      </div>
                      <div
                        className={clsx(
                          'flex items-center gap-1 font-medium text-sm whitespace-nowrap',
                          isSoldOut && 'opacity-50'
                        )}
                      >
                        {isSoldOut && (
                          <FontAwesomeIcon
                            icon={faBan}
                            className='ml-1 text-[1rem] text-red-500'
                          />
                        )}
                        <span
                          className={clsx(
                            isSoldOut &&
                              'line-through decoration-red-500 decoration-[2px]'
                          )}
                        >
                          {saleModal.title}
                        </span>
                        {isSoldOut && (
                          <span className='text-red-500'>(sold out)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {renderPurchase()}
            </div>
          </Modal>
          {showConfirmAddressModal && (
            <Modal
              showModal={showConfirmAddressModal}
              setShowModal={setShowConfirmAddressModal}
              title='Confirm your address'
              variant='medium'
            >
              <div className='flex flex-col gap-8 mt-4'>
                <span className='font-semibold text-lg'>
                  You are about to purchase DUSA on Ethereum.
                </span>
                <div className='flex flex-col gap-2'>
                  <span>
                    {connectedAddress
                      ? 'Please confirm this address is one of your Massa’s addresses:'
                      : 'Please connect your wallet:'}
                  </span>
                  {connectedAddress ? (
                    <>
                      <div className='flex flex-col gap-4 bg-[var(--hover-bg)] p-4 rounded-lg w-full font-light text-sm break-all'>
                        {connectedAddress}
                      </div>
                      <div className='flex'>
                        <div
                          className='flex items-center gap-2 bg-[var(--hover-bg)] hover:brightness-150 p-2 rounded-lg cursor-pointer'
                          onClick={() => setShowDrawer(true)}
                        >
                          <span>Change address</span>
                          <FontAwesomeIcon icon={faArrowsRotate} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <Button
                      text='Please connect your wallet to proceed.'
                      className='font-light text-sm'
                      onClick={() => setShowDrawer(true)}
                      variant='outlined'
                    />
                  )}
                </div>
                <div className='flex flex-col gap-2'>
                  <Warning text='Your Massa address is required to bridge your DUSA tokens to Massa after the end of the sale. Make sure this is one of your Massa’s addresses.' />
                  <div className='flex justify-center'>
                    <Button
                      text='Confirm & Purchase'
                      variant='contained'
                      disabled={!connectedAddress}
                      onClick={() => {
                        setShowConfirmAddressModal(false);
                        invest(amount ?? 0, connectedAddress);
                      }}
                    />
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </>
  );
};

export default Sale;
