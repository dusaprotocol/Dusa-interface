import { useEffect, useState } from 'react';
import {
  Fraction,
  LimitOrder,
  parseUnits,
  REAL_ID_SHIFT,
  TokenAmount
} from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import { ONE_DAY, U256_MAX } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fetchPairInformationOpti,
  getTokensFromPairAddress
} from 'utils/datastoreFetcher';
import {
  getIdFromPrice,
  getPriceFromId,
  roundFractionPriceAdaptive,
  toFraction,
  tokenAmountToSignificant
} from 'utils/methods';
import { findLimitOrderPool, validateLimitOrderSupport } from 'utils/methods';
import { PendingLimitOrder } from 'utils/storage';
import { MASSA } from 'utils/tokens';
import {
  buildAddOrderTx,
  buildIncreaseAllowanceTx,
  toBI
} from 'utils/transactionBuilder';
import { queryKeys, trpc } from 'utils/trpc';
import { Allowance, Token } from 'utils/types';
import useFetchAllowance from './useFetchAllowance';
import { useSendTransaction } from './useSendTransaction';

interface UseManageOrdersParams {
  userAddress: string | undefined;
  token0: Token | undefined;
  token1: Token | undefined;
  resetTokensInputs: () => void;
  amountIn: bigint;
  amountOut: bigint;
  quantityIn: string | undefined;
  allowedSlippage: Fraction;
  fetchBalances?: () => void;
}

export const useManageOrders = (params: UseManageOrdersParams) => {
  const {
    userAddress,
    token0,
    token1,
    resetTokensInputs,
    amountIn,
    amountOut,
    quantityIn,
    allowedSlippage,
    fetchBalances
  } = params;

  // Use WMAS versions for pair calculations but keep original tokens for UI
  const token0ForPair = token0 ? getWmasIfMas(token0) : undefined;
  const token1ForPair = token1 ? getWmasIfMas(token1) : undefined;

  // Find the limit order pool for the selected tokens
  const limitOrderPool =
    token0ForPair && token1ForPair
      ? findLimitOrderPool(token0ForPair, token1ForPair)
      : undefined;

  // Get pool address and binStep from the found pool
  const pairAddress = limitOrderPool?.pairAddress;
  const binStep = limitOrderPool?.binStep || 0;
  const orderSC = limitOrderPool?.loSC;

  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const [targetId, setTargetId] = useState(REAL_ID_SHIFT);
  const [limitValueDiff, setLimitValueDiff] = useState(0);
  const [targetPrice, setTargetPrice] = useState<Fraction>(new Fraction(1n));
  const [date, setDate] = useState<number>(Date.now() + ONE_DAY * 7);
  const [expiryDate, setExpiryDate] = useState<boolean>(false);
  const [priceLODisplayed, setPriceLODisplayed] = useState('');

  // Pending order states
  const [ordersLoading, setOrdersLoading] = useState<PendingLimitOrder[]>([]);
  const [ordersRemoving, setOrdersRemoving] = useState<number[]>([]);
  const [priceLO, setPriceLO] = useState<Fraction | undefined>();
  const [isSellOrder, setIsSellOrder] = useState<boolean>(false);
  const [isPriceInverted, setIsPriceInverted] = useState<boolean>(false);
  const [limitOrderError, setLimitOrderError] = useState<string | null>(null);

  const tokensSet = !!token0ForPair && !!token1ForPair;

  // Check if limit orders are supported for the selected tokens
  useEffect(() => {
    if (tokensSet) {
      const validation = validateLimitOrderSupport(
        token0ForPair,
        token1ForPair
      );
      setLimitOrderError(validation.error || null);
    } else {
      setLimitOrderError(null);
    }
  }, [tokensSet, token0ForPair, token1ForPair]);

  // Fetch pair information using fetchPairInformationOpti instead of usePairManager
  const pairInfoQuery = useQuery(
    ['pairInformation', pairAddress],
    () => fetchPairInformationOpti(pairAddress!),
    { enabled: !!pairAddress }
  );
  const activeId = pairInfoQuery.data?.activeId;

  const tokensOrderQuery = useQuery(
    [queryKeys.tokensSorted, pairAddress],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => getTokensFromPairAddress(pairAddress!),
    { enabled: !!tokensSet && !!pairAddress }
  );
  const tokensOrder = tokensOrderQuery.data as [Token, Token] | undefined;

  // Auto-calculate default isSellOrder based on token order in pair
  useEffect(() => {
    if (tokensOrder && token0ForPair) {
      // Check if token0ForPair is TOKEN_X (first token in pair)
      const isToken0TokenX = tokensOrder[0].address === token0ForPair.address;
      // If token0ForPair is TOKEN_X, we're buying TOKEN_Y, otherwise we're selling token0ForPair
      const defaultIsSellOrder = !isToken0TokenX;

      setIsSellOrder(defaultIsSellOrder);
    }
  }, [tokensOrder, token0ForPair]);

  const orderType: 0 | 1 = isSellOrder ? 0 : 1;

  const activeOrdersQuery = trpc.getOrders.useQuery(
    { userAddress: userAddress! },
    { enabled: !!userAddress }
  );

  // Filter orders for the current pair if needed
  const activeOrders =
    activeOrdersQuery.data?.filter(
      (order) => order.poolAddress === pairAddress
    ) || [];

  const allowanceQuery = useFetchAllowance({
    tokenAddress: token0?.address,
    spenderAddress: orderSC || ''
  });
  const allowance = allowanceQuery.data || 0n;

  const setInputPrice = (id: number) => {
    if (!tokensSet || !activeId || !tokensOrder) return;

    const priceAsNumber = getPriceFromId(id, binStep);
    const priceAsFraction = toFraction(priceAsNumber);

    // Use tokensOrder for consistent decimal calculations
    const tokenX = tokensOrder[0]; // TOKEN_X
    const tokenY = tokensOrder[1]; // TOKEN_Y
    const decimalDiff = tokenX.decimals - tokenY.decimals;

    const multiplicator =
      decimalDiff > 0
        ? 10n ** BigInt(decimalDiff)
        : new Fraction(
            1n,
            10n ** BigInt(isNaN(-decimalDiff) ? 0 : -decimalDiff)
          );
    const priceAdjusted = priceAsFraction.multiply(multiplicator);

    // Base price for business logic (always consistent)
    const basePriceForLogic =
      isSellOrder && priceAdjusted.numerator !== 0n
        ? priceAdjusted.invert()
        : isSellOrder
          ? new Fraction(0n)
          : priceAdjusted;

    // Display price (can be inverted for UI)
    const displayPrice =
      isPriceInverted && basePriceForLogic.numerator !== 0n
        ? basePriceForLogic.invert()
        : basePriceForLogic;

    // Determine which tokens are displayed for adaptive decimals
    const baseToken = isSellOrder
      ? isPriceInverted
        ? token1!
        : token0!
      : isPriceInverted
        ? token1!
        : token0!;

    const adaptiveDisplayString = roundFractionPriceAdaptive(
      displayPrice,
      baseToken
    );

    setPriceLO(basePriceForLogic); // Keep business logic price
    setPriceLODisplayed(adaptiveDisplayString); // Use adaptive display price
  };

  useEffect(
    () => setInputPrice(targetId),
    [tokensOrder, activeId, targetId, isSellOrder, isPriceInverted]
  );

  // Initialize targetId to activeId when activeId first becomes available
  useEffect(() => {
    if (activeId !== undefined && targetId === REAL_ID_SHIFT) {
      setTargetId(activeId + (isSellOrder ? -3 : 3));
      setLimitValueDiff(0);
    }
  }, [activeId, targetId]);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  useEffect(() => setInputPrice(activeId!), [activeId]);

  useEffect(() => {
    if (tokensSet && tokensOrder) {
      const contractPrice = getPriceFromId(targetId, binStep);

      // Use tokensOrder for consistent calculations
      const tokenX = tokensOrder[0]; // TOKEN_X
      const tokenY = tokensOrder[1]; // TOKEN_Y
      const decimalDiff = tokenX.decimals - tokenY.decimals;

      let targetPriceAsNumber: number;
      if (isSellOrder) {
        // Pour sell order: prix token1/token0 = (1/contractPrice) * 10^(tokenX.decimals - tokenY.decimals)
        const invertedPrice = 1 / contractPrice;
        targetPriceAsNumber = invertedPrice * 10 ** decimalDiff;
      } else {
        // Pour buy order: prix token0/token1 = contractPrice * 10^(tokenX.decimals - tokenY.decimals)
        targetPriceAsNumber = contractPrice * 10 ** decimalDiff;
      }

      const targetPriceAsFraction = toFraction(targetPriceAsNumber);

      setTargetPrice(targetPriceAsFraction);
      setLimitValueDiff(getDiffPricePct(targetId));
    }
  }, [targetId, tokensOrder, isSellOrder]);

  // useEffect(()=> {
  //   roundFractionPrice(priceLO, false)
  // }, [displ])

  // Calculate normalized price without decimal adjustment for amount calculations
  const normalizedPrice =
    tokensSet && tokensOrder
      ? toFraction(getPriceFromId(targetId, binStep))
      : new Fraction(0n);

  const orderAmountIn =
    normalizedPrice.numerator === 0n ||
    normalizedPrice.denominator === 0n ||
    amountOut === 0n
      ? 0n
      : isSellOrder
        ? normalizedPrice.multiply(amountOut).quotient
        : normalizedPrice.numerator === 0n
          ? 0n
          : normalizedPrice.invert().multiply(amountOut).quotient;
  const orderAmountInDisplayed =
    token0 && orderAmountIn
      ? tokenAmountToSignificant(new TokenAmount(token0, orderAmountIn))
      : undefined;

  const orderAmountOut =
    tokensSet && normalizedPrice.denominator !== 0n && amountIn !== 0n
      ? isSellOrder
        ? normalizedPrice.numerator === 0n
          ? 0n
          : normalizedPrice.invert().multiply(amountIn).quotient
        : normalizedPrice.multiply(amountIn).quotient
      : undefined;

  const orderAmountOutMin = orderAmountOut
    ? orderAmountOut -
      (orderAmountOut * allowedSlippage.numerator) / allowedSlippage.denominator
    : undefined;
  const orderAmountOutDisplayed =
    token1 && orderAmountOut
      ? tokenAmountToSignificant(new TokenAmount(token1, orderAmountOut))
      : undefined;

  const invalidAmountLimitOrder = !orderAmountIn || !orderAmountOut;

  const getDiffPricePct = (newId: number) => {
    const actualPrice = getPriceFromId(activeId ?? 0, binStep);
    const newPrice = getPriceFromId(newId, binStep);
    //take into account that the price is inverted if isSellOrder
    const pctDiff =
      (isSellOrder ? actualPrice / newPrice : newPrice / actualPrice) * 100 -
      100;

    return pctDiff;
  };

  const getCurrentBaseId = (): number => {
    // If no tokens or no displayed price, use targetId
    if (!tokensSet || !tokensOrder || !priceLODisplayed) {
      return targetId;
    }

    // Calculate what the displayed price should be for the current targetId
    const expectedPriceForTargetId = getPriceFromId(targetId, binStep);
    const tokenX = tokensOrder[0];
    const tokenY = tokensOrder[1];
    const decimalDiff = tokenX.decimals - tokenY.decimals;

    // Calculate expected display price using same logic as setInputPrice
    const expectedPriceAdjusted = toFraction(expectedPriceForTargetId).multiply(
      decimalDiff > 0
        ? 10n ** BigInt(decimalDiff)
        : new Fraction(1n, 10n ** BigInt(-decimalDiff))
    );

    const expectedBasePriceForLogic =
      isSellOrder && expectedPriceAdjusted.numerator !== 0n
        ? expectedPriceAdjusted.invert()
        : isSellOrder
          ? new Fraction(0n)
          : expectedPriceAdjusted;

    const expectedDisplayPrice =
      isPriceInverted && expectedBasePriceForLogic.numerator !== 0n
        ? expectedBasePriceForLogic.invert()
        : expectedBasePriceForLogic;

    // Use adaptive display string for comparison
    const baseToken = isSellOrder
      ? isPriceInverted
        ? token1!
        : token0!
      : isPriceInverted
        ? token0!
        : token1!;
    const expectedDisplayString = roundFractionPriceAdaptive(
      expectedDisplayPrice,
      baseToken
    );

    // If displayed price matches expected or is very close (tolerance for precision differences), use current targetId
    const displayedPrice = parseFloat(priceLODisplayed);
    const expectedPrice = parseFloat(expectedDisplayString);

    // Use relative tolerance (0.001% difference) for price comparison instead of exact string matching
    const relativeThreshold = Math.max(
      Math.abs(expectedPrice) * 0.00001,
      1e-10
    );

    if (
      !isNaN(displayedPrice) &&
      !isNaN(expectedPrice) &&
      Math.abs(displayedPrice - expectedPrice) <= relativeThreshold
    ) {
      return targetId;
    }

    // Otherwise, calculate ID from the displayed price (same logic as handleBlur)
    const userPrice = parseFloat(priceLODisplayed);
    if (isNaN(userPrice) || userPrice <= 0) {
      return targetId;
    }

    // Use handleBlur logic to convert displayed price to contract price
    let basePriceForLogic: number;
    if (isPriceInverted) {
      basePriceForLogic = 1 / userPrice;
    } else {
      basePriceForLogic = userPrice;
    }

    let rawContractPrice: number;
    if (isSellOrder) {
      rawContractPrice = 1 / basePriceForLogic;
    } else {
      rawContractPrice = basePriceForLogic;
    }

    const contractPrice = rawContractPrice / 10 ** decimalDiff;
    const calculatedId = getIdFromPrice(contractPrice, binStep);

    return calculatedId;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(new Date(e.target.value).getTime());
  };

  const handleKeyDownLimit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    // Handle Enter key - trigger handleBlur
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      return;
    }

    // Handle Arrow keys
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

    e.preventDefault();
    const up = e.key === 'ArrowUp';
    let direction = up ? 1 : -1;

    // If display is inverted, user expects opposite behavior
    if (isPriceInverted) {
      direction = -direction;
    }

    // Use intelligent base ID that considers user input
    const baseId = getCurrentBaseId();
    const newId = baseId + (isSellOrder ? -direction : direction);

    setLimitValueDiff(getDiffPricePct(newId));
    setTargetId(newId);
  };

  const handleBlur = () => {
    if (!!tokensOrder && priceLODisplayed) {
      const userPrice = parseFloat(priceLODisplayed);
      if (isNaN(userPrice) || userPrice <= 0) return;

      // Use tokensOrder for consistent calculations
      const tokenX = tokensOrder[0]; // TOKEN_X
      const tokenY = tokensOrder[1]; // TOKEN_Y
      const decimalDiff = tokenX.decimals - tokenY.decimals;

      // Convert user input back to contract price - reverse of setInputPrice logic

      // Step 1: Convert displayPrice back to basePriceForLogic
      let basePriceForLogic: number;
      if (isPriceInverted) {
        // If display is inverted, user entered inverted price, so we invert it back
        basePriceForLogic = 1 / userPrice;
      } else {
        // Display is normal, user price is already basePriceForLogic
        basePriceForLogic = userPrice;
      }

      // Step 2: Convert basePriceForLogic back to raw contract price
      let rawContractPrice: number;
      if (isSellOrder) {
        // In setInputPrice, we do: isSellOrder ? priceAdjusted.invert() : priceAdjusted
        // So to reverse: if isSellOrder, we need to invert basePriceForLogic to get priceAdjusted
        rawContractPrice = 1 / basePriceForLogic;
      } else {
        // For buy orders, basePriceForLogic = priceAdjusted
        rawContractPrice = basePriceForLogic;
      }

      // Step 3: Remove decimal adjustment to get the actual contract price
      const contractPrice = rawContractPrice / 10 ** decimalDiff;

      const id = getIdFromPrice(contractPrice, binStep);

      setTargetId(id);
      setInputPrice(id); // Force immediate update of displayed price
    }
  };

  const resetLimitValue = () => {
    activeId && setTargetId(activeId);
    setLimitValueDiff(0);
  };

  useEffect(() => {
    if (activeId && targetId !== REAL_ID_SHIFT) {
      // Only adjust targetId if it's already been initialized (not at REAL_ID_SHIFT)
      // Calculate current difference between targetId and activeId
      const currentDiff = targetId - activeId;
      // Use absolute difference, with minimum fallback of 3 if no difference exists
      const absDiff = Math.abs(currentDiff) || 3;

      // Apply difference according to order type:
      // BUY ORDER: targetId = activeId - diff (buying at lower price)
      // SELL ORDER: targetId = activeId + diff (selling at higher price)
      const baseId = activeId + (isSellOrder ? -absDiff : absDiff);

      setTargetId(baseId);
      setLimitValueDiff(getDiffPricePct(baseId));
    }
  }, [activeId, isSellOrder, pairAddress]);

  // Reset targetId when pairAddress changes to ensure proper synchronization with new tokens
  useEffect(() => {
    if (pairAddress) {
      // Reset targetId to REAL_ID_SHIFT to trigger reinitialization for new pair
      setTargetId(REAL_ID_SHIFT);
      setLimitValueDiff(0);
    }
  }, [pairAddress]);

  // Determine if we should use MAS transaction
  const shouldUseMas = token0?.equals(MASSA) || false;
  const limitOrderData = buildAddOrderTx(
    new LimitOrder(
      toBI(orderType),
      toBI(targetId),
      token0 ? parseUnits(quantityIn || '0', token0.decimals) : 0n
    ),
    orderSC || '',
    shouldUseMas
  );

  const { submitTx: submitLimitOrderTx, pending: pendingLimitOrder } =
    useSendTransaction({
      data: limitOrderData,
      onTxConfirmed: () => {
        resetTokensInputs();
        if (fetchBalances) fetchBalances();
      }
    });

  const { submitTx: submitIncreaseAllowanceTx, pending: pendingAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token0?.address || '',
        orderSC || '',
        allowanceType === 'increaseMax' ? U256_MAX : amountIn - allowance
      ),
      onTxConfirmed: () => {
        allowanceQuery.refetch();
      }
    });

  return {
    // Transaction functions
    submitLimitOrderTx,
    pendingLimitOrder,
    submitIncreaseAllowanceTx,
    pendingAllowance,

    // State management
    resetLimitValue,
    setAllowanceType,

    // Order data
    activeOrders,
    orderType,
    isSellOrder,
    setIsSellOrder,
    isPriceInverted,
    setIsPriceInverted,

    // Pending order states
    ordersLoading,
    setOrdersLoading,
    ordersRemoving,
    setOrdersRemoving,

    // Price and amount calculations
    targetId,
    setTargetId,
    targetPrice,
    limitValueDiff,
    setLimitValueDiff,
    orderAmountIn,
    orderAmountOut,
    orderAmountInDisplayed,
    orderAmountOutDisplayed,
    orderAmountOutMin,
    invalidAmountLimitOrder,

    // Price handling
    priceLO,
    setPriceLO,
    priceLODisplayed,
    setPriceLODisplayed,
    handleKeyDownLimit,
    handleBlur,
    setInputPrice,

    // Date handling
    date,
    setDate,
    expiryDate,
    setExpiryDate,
    handleDateChange,

    // Allowance data
    allowance,
    allowanceType,

    // Error handling
    limitOrderError,
    isLimitOrderSupported: !!limitOrderPool
  };
};
