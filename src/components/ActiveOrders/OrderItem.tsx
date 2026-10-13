import { useMemo, useState } from 'react';
import {
  faArrowRight,
  faArrowRightArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import { useOrderAction } from 'hooks/useOrderAction';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  getPriceFromId,
  printBigintIsh,
  printUSD,
  getPoolByLOAddress
} from 'utils/methods';
import { Order } from 'utils/trpc';
import { Token } from 'utils/types';

type Variant = 'active' | 'history';

type TokenLike = {
  symbol: string;
  decimals: number;
  logoURI?: string;
};

type OrderCardProps = {
  order: Order;
  variant: Variant;
  buttonText?: string;
  buttonVariant?: 'cancel' | 'claim';
};

const CN_MAP = {
  active: {
    header: 'order-content-header',
    headerLeft: 'order-content-header-left',
    content: 'order-content',
    item: 'order-content-item',
    actionBtn: (variant: 'cancel' | 'claim') =>
      `order-action-button ${variant === 'claim' ? 'claim-order' : 'cancel-order'}`
  },
  history: {
    header: 'order-history-header',
    headerLeft: 'order-history-header-left',
    content: 'order-history-content',
    item: 'order-history-content-item',
    actionBtn: () => '' // not used
  }
} as const;

/**
 * Shared query for tokens + price.
 * Keeps the exact pricing semantics from your originals.
 */
function useOrderMeta(order: Order | undefined) {
  return useQuery(
    [
      'orderMeta',
      order?.poolAddress,
      order?.limitOrderAddress,
      order?.binId,
      order?.isSellOrder
    ],
    async () => {
      if (!order) return null;

      const pool = getPoolByLOAddress(order.limitOrderAddress);
      if (!pool) return null;

      const { token0, token1, binStep } = pool;

      const tokenIn = order.isSellOrder ? token0 : token1;
      const tokenOut = order.isSellOrder ? token1 : token0;

      const tokens: [Token, Token] = [
        getMasIfWmas(tokenIn),
        getMasIfWmas(tokenOut)
      ];

      const basePriceFromProtocol = getPriceFromId(order.binId, binStep);

      // Preserve previous price calculation exactly
      const price = order.isSellOrder
        ? basePriceFromProtocol *
          10 ** (tokens[0].decimals - tokens[1].decimals)
        : (1 / basePriceFromProtocol) *
          10 ** (tokens[0].decimals - tokens[1].decimals);

      return { tokens, price, binStep };
    },
    { enabled: !!order }
  );
}

/**
 * Computes expected/claimed tokenOut in raw units.
 * NOTE: mirrors your original Number(...) + Math.floor approach for parity.
 * Consider moving to a decimal lib (big.js) for large values/precision later.
 */
function computeTokenOutRaw(
  amountIn: bigint | number | string,
  price: number,
  t0?: TokenLike,
  t1?: TokenLike
): bigint | null {
  if (!t0 || !t1 || !price || !isFinite(price)) return null;

  try {
    const numerator = Number(amountIn) * price;
    const denom = 10 ** (t0.decimals - t1.decimals);
    const raw = Math.floor(numerator / denom);
    if (!isFinite(raw)) return null;
    return BigInt(raw);
  } catch {
    return null;
  }
}

const TokenPairHeader = ({
  tokens,
  isLoading
}: {
  tokens?: [TokenLike, TokenLike];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <>
        <div className='bg-gray-300 rounded-full w-6 h-6' />
        <Skeleton style={{ width: '40px', height: '16px' }} />
        <FontAwesomeIcon icon={faArrowRight} />
        <div className='bg-gray-300 rounded-full w-6 h-6' />
        <Skeleton style={{ width: '40px', height: '16px' }} />
      </>
    );
  }

  if (!tokens) return null;

  return (
    <>
      {/* token in */}
      <img src={tokens[0].logoURI} alt={`${tokens[0].symbol} logo`} />
      <span>{tokens[0].symbol}</span>
      <FontAwesomeIcon icon={faArrowRight} />
      {/* token out */}
      <img src={tokens[1].logoURI} alt={`${tokens[1].symbol} logo`} />
      <span>{tokens[1].symbol}</span>
    </>
  );
};

const OrderItem = ({
  order,
  variant,
  buttonText = 'Cancel order',
  buttonVariant = 'cancel'
}: OrderCardProps) => {
  const [invertPrice, setInvertPrice] = useState(false);
  const meta = useOrderMeta(order);
  const tokens = meta.data?.tokens;
  const price = meta.data?.price ?? 0;

  const isLoading = !tokens?.length;

  const tokenOutRaw = useMemo(
    () => computeTokenOutRaw(order.amountIn, price, tokens?.[0], tokens?.[1]),
    [order.amountIn, price, tokens]
  );

  const CN = CN_MAP[variant];

  const priceDisplay = useMemo(() => {
    const p = invertPrice ? (price ? 1 / price : 0) : price;
    if (!p || !isFinite(p)) return '—';
    return printUSD(p, true, 4);
  }, [invertPrice, price]);

  const orderAction = useOrderAction(order);

  const isCancel = buttonVariant === 'cancel';

  const [pendingTx, submitTx] = isCancel
    ? [orderAction.isCancelPending, orderAction.cancelOrder]
    : [orderAction.isClaimPending, orderAction.claimOrder];

  return (
    <div
      className={clsx(
        'relative flex flex-col gap-2 bg-[var(--hover-bg)] p-4 border hover:border-[var(--secondary-color)] border-transparent rounded-lg overflow-hidden',
        isLoading && 'order-item-loading'
      )}
    >
      <div className={CN.header}>
        <div className={CN.headerLeft}>
          <TokenPairHeader tokens={tokens} isLoading={isLoading} />
        </div>

        {variant === 'active' && !isLoading && (
          <div
            className={CN.actionBtn(buttonVariant)}
            onClick={() => submitTx()}
          >
            {buttonText}
          </div>
        )}
      </div>

      <div className={CN.content}>
        <div className={CN.item}>
          <span>Id</span>
          <span>{order.id}</span>
        </div>

        <div className={CN.item}>
          <span>Amount</span>
          {isLoading ? (
            <Skeleton style={{ width: '80px', height: '16px' }} />
          ) : (
            <span>
              {printBigintIsh(tokens![0], order.amountIn)} {tokens![0].symbol}
            </span>
          )}
        </div>

        <div
          className={clsx(CN.item, 'cursor-pointer')}
          onClick={() => setInvertPrice((v) => !v)}
        >
          <span>
            Price <FontAwesomeIcon icon={faArrowRightArrowLeft} />
          </span>
          {isLoading ? (
            <Skeleton style={{ width: '100px', height: '16px' }} />
          ) : (
            <span className='item-invert-price'>
              1 {invertPrice ? tokens![1].symbol : tokens![0].symbol} ≃{' '}
              {priceDisplay}{' '}
              {invertPrice ? tokens![0].symbol : tokens![1].symbol}
            </span>
          )}
        </div>

        {variant === 'active' && (
          <div className={CN.item}>
            <span>Expected output</span>
            {isLoading ? (
              <Skeleton style={{ width: '90px', height: '16px' }} />
            ) : (
              <span>
                {tokenOutRaw !== null
                  ? `${printBigintIsh(tokens![1], tokenOutRaw)} ${tokens![1].symbol}`
                  : 'Calculating...'}
              </span>
            )}
          </div>
        )}

        {variant === 'history' && order.status === 'CLAIMED' && (
          <div className={CN.item}>
            <span>Amount Claimed</span>
            {isLoading ? (
              <Skeleton style={{ width: '90px', height: '16px' }} />
            ) : (
              <span>
                {tokenOutRaw !== null
                  ? `${printBigintIsh(tokens![1], tokenOutRaw)} ${tokens![1].symbol}`
                  : 'Calculating...'}
              </span>
            )}
          </div>
        )}

        {variant === 'history' && (
          <div className={CN.item}>
            <span>Status</span>
            <span>
              {order.status.charAt(0).toUpperCase() +
                order.status.slice(1).toLowerCase()}
            </span>
          </div>
        )}
      </div>
      {pendingTx && (
        <div
          className={clsx(
            'top-0 right-0 bottom-0 left-0 absolute flex justify-center items-center gap-2 backdrop-blur-sm rounded-lg',
            !isCancel && 'bg-[#3ef58128]'
          )}
        >
          <Spinner size={20} />
          <span className='font-semibold text-sm'>
            {isCancel ? 'Canceling' : 'Claiming'} order...
          </span>
        </div>
      )}
    </div>
  );
};

export default OrderItem;
