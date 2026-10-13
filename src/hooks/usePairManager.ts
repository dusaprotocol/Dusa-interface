import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Fraction,
  TokenAmount,
  TradeV2,
  parseUnits,
  QuoterHelper
} from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { CHAIN_ID, quoterV2SC } from 'utils/config';
import { ONE_MINUTE } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import { fetchPoolVersion } from 'utils/datastoreFetcher';
import {
  changeQuantityWithFixedPriceRaw,
  cleanAddress,
  getPriceFromId,
  printBigintIsh,
  toFraction,
  tokenAmountToSignificant
} from 'utils/methods';
import { MASSA, WMAS } from 'utils/tokens';
import { trpc } from 'utils/trpc';
import { Token, Version } from 'utils/types';
import { baseClientSale } from 'utils/w3';
import useFetchBalance from './useFetchBalance';
import { usePairAddress } from './useFetchData';
import usePairInformation from './useFetchData/pairInformation';

interface PairManagerProps {
  token0: Token | undefined;
  setToken0: React.Dispatch<React.SetStateAction<Token | undefined>>;
  token1: Token | undefined;
  setToken1: React.Dispatch<React.SetStateAction<Token | undefined>>;
  binStep: number | undefined;
  version?: Version | undefined;
  activeTab?: string;
  isDCA?: boolean;
}

export const usePairTokenValue = ({
  token0,
  token1
}: Pick<PairManagerProps, 'token0' | 'token1'>) => {
  const { data: dollarValue0 } = trpc.getTokenValue.useQuery(
    {
      tokenAddress: cleanAddress(token0?.address),
      tokenDecimals: token0?.decimals || 0
    },
    { enabled: !!token0?.address }
  );
  const { data: dollarValue1 } = trpc.getTokenValue.useQuery(
    {
      tokenAddress: cleanAddress(token1?.address),
      tokenDecimals: token1?.decimals || 0
    },
    { enabled: !!token1?.address }
  );

  return { dollarValue0, dollarValue1 };
};

const usePairManager = ({
  token0,
  setToken0,
  token1,
  setToken1,
  binStep,
  version,
  activeTab,
  isDCA = false
}: PairManagerProps) => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const tokensSet = !!token0 && !!token1;

  const balance0Query = useFetchBalance(token0?.address, connectedAddress);
  const balance0 = balance0Query.data;
  const balance1Query = useFetchBalance(token1?.address, connectedAddress);
  const balance1 = balance1Query.data;

  const [quantity0, setQuantity0] = useState<string>();
  const [quantity1, setQuantity1] = useState<string>();
  const [notEnoughLiq, setNotEnoughLiq] = useState(false);
  const [bestTrade, setBestTrade] = useState<TradeV2>();
  const [fetchingTrade, setFetchingTrade] = useState(false);

  // Use refs to track current quantities for the interval
  const quantity0Ref = useRef(quantity0);
  const quantity1Ref = useRef(quantity1);

  useEffect(() => {
    quantity0Ref.current = quantity0;
    quantity1Ref.current = quantity1;
  }, [quantity0, quantity1]);

  const { dollarValue0, dollarValue1 } = usePairTokenValue({ token0, token1 });

  const token0ForPair = token0 ? getWmasIfMas(token0) : undefined;
  const token1ForPair = token1 ? getWmasIfMas(token1) : undefined;

  // Auto-detect pool version if not provided
  const versionQuery = useQuery(
    ['poolVersion', token0ForPair?.address, token1ForPair?.address, binStep],
    () =>
      fetchPoolVersion(
        token0ForPair!.address,
        token1ForPair!.address,
        binStep!
      ),
    {
      enabled:
        !version &&
        !!token0ForPair?.address &&
        !!token1ForPair?.address &&
        !!binStep,
      retry: false
    }
  );

  const resolvedVersion = version || versionQuery.data;

  const pairAddressQuery = usePairAddress({
    token0: token0ForPair,
    token1: token1ForPair,
    binStep,
    version: resolvedVersion
  });

  const pairAddress = pairAddressQuery.data || '';
  const pairInfoQuery = usePairInformation(pairAddress);
  const activeId = pairInfoQuery.data?.activeId;

  const priceAsNumber =
    activeId && binStep ? getPriceFromId(activeId, binStep) : 0;
  const priceAsFraction = toFraction(priceAsNumber);
  const price = priceAsFraction;

  const decimalDiff = tokensSet ? token0.decimals - token1.decimals : 0;
  const multiplicator = isNaN(decimalDiff)
    ? 0n
    : decimalDiff > 0
      ? 10n ** BigInt(decimalDiff)
      : new Fraction(1n, 10n ** BigInt(-decimalDiff));
  const priceAdjusted = price.multiply(multiplicator);

  const changeQuantity = (qty: string | undefined, isToken0: boolean) => {
    if (!qty) {
      resetTokensInputs();
      return;
    }

    isToken0 ? setQuantity0(qty) : setQuantity1(qty);
  };

  /**
   * Fetch best trade for a given quantity
   * @param qty stringified quantity (e.g. '1.2)
   * @param isToken0 boolean to know if the quantity is for token0 or token1
   * @returns
   */
  const fetchBestTrade = async (
    qty: string | undefined,
    isToken0: boolean,
    maxHops = 3,
    checkLegacy = false
  ) => {
    if (!qty || !tokensSet) {
      setBestTrade(undefined);
      setNotEnoughLiq(false);
      return;
    }
    setFetchingTrade(true);
    const quantity = parseUnits(qty, (isToken0 ? token0 : token1).decimals);
    const t0 = getWmasIfMas(token0);
    const t1 = getWmasIfMas(token1);

    const trade = await QuoterHelper.findBestPath(
      t0,
      token0.equals(MASSA),
      t1,
      token1.equals(MASSA),
      new TokenAmount(isToken0 ? token0 : token1, quantity),
      isToken0,
      maxHops,
      baseClientSale,
      CHAIN_ID,
      quoterV2SC,
      checkLegacy
    )
      .catch((error) => console.log(error))
      .finally(() => setFetchingTrade(false));

    if (!trade || trade.executionPrice.denominator === 0n) {
      quantity !== undefined && quantity > 0 && setNotEnoughLiq(true);
      isToken0 ? setQuantity1(undefined) : setQuantity0(undefined);
      setBestTrade(undefined);

      // Retry with checkLegacy=true if we haven't tried it yet
      if (!checkLegacy) {
        return fetchBestTrade(qty, isToken0, maxHops, true);
      }

      // Retry with reduced maxHops if we've already tried with legacy
      if (maxHops > 1) {
        return fetchBestTrade(qty, isToken0, maxHops - 1, false);
      }

      return;
    }

    setNotEnoughLiq(false);
    const token = isToken0 ? token1 : token0;
    const amount = isToken0 ? trade.outputAmount : trade.inputAmount;
    const newQty = printBigintIsh(token, amount.raw, token.decimals);
    isToken0 ? setQuantity1(newQty) : setQuantity0(newQty);
    setBestTrade(trade);
  };

  const changeQuantityWithFixedPrice = (
    quantity: string | undefined,
    isToken0: boolean,
    targetPrice: Fraction = price
  ) => {
    // prettier-ignore
    const {qty0, qty1} = changeQuantityWithFixedPriceRaw(quantity, isToken0, targetPrice, token0, token1);
    setQuantity0(qty0);
    setQuantity1(qty1);
  };

  const changeQuantityAlone = (
    quantity: string | undefined,
    isToken0: boolean
  ) => {
    isToken0 ? setQuantity0(quantity) : setQuantity1(quantity);
  };

  const changeQuantityWrapped = (quantity: string | undefined) => {
    setQuantity0(quantity);
    setQuantity1(quantity);
  };

  const changeToken = async (token: Token, isToken0: boolean) => {
    if (isToken0)
      if (token1 && token.equals(token1)) invertTokens();
      else setToken0(token);
    else if (token0 && token.equals(token0)) invertTokens();
    else setToken1(token);
  };

  const invertTokens = async () => {
    setToken0(token1);
    setToken1(token0);
  };

  const resetTokensInputs = () => {
    setQuantity0(undefined);
    setQuantity1(undefined);
    setBestTrade(undefined);
    setNotEnoughLiq(false);
  };

  // fetch best trade when selecting/changing token and auto-refresh every 5 minutes
  useEffect(() => {
    if (!tokensSet) return;
    if (activeTab === 'Limit') return;
    if (
      (token0.equals(WMAS) && token1.equals(MASSA)) ||
      (token0.equals(MASSA) && token1.equals(WMAS))
    )
      return;

    const maxHops = 3;

    const fetchTrade = () => {
      const currentQty0 = quantity0Ref.current;
      const currentQty1 = quantity1Ref.current;
      if (currentQty0) {
        const q0 = parseUnits(currentQty0, token0.decimals);
        const amount0 = tokenAmountToSignificant(new TokenAmount(token0, q0));
        setQuantity0(amount0);
        fetchBestTrade(amount0, true, maxHops);
      } else if (currentQty1) {
        const q1 = parseUnits(currentQty1, token1.decimals);
        const amount1 = tokenAmountToSignificant(new TokenAmount(token1, q1));
        setQuantity1(amount1);
        fetchBestTrade(amount1, false, maxHops);
      }
    };

    // Initial fetch only when tokens change
    if (quantity0Ref.current || quantity1Ref.current) {
      fetchTrade();
    }

    // Auto-refresh every 60 seconds
    const refreshInterval = setInterval(fetchTrade, ONE_MINUTE);

    return () => clearInterval(refreshInterval);
  }, [token0, token1, activeTab]);

  return {
    balance0,
    balance1,
    dollarValue0,
    dollarValue1,
    quantity0,
    quantity1,
    activeId,
    price,
    priceAdjusted,
    bestTrade,
    fetchingTrade,
    pairAddress: pairAddressQuery.data, // keep as string | undefined
    pairAddressLoading: pairAddressQuery.isLoading,
    notEnoughLiq,
    resetTokensInputs,
    fetchBalances: () => {
      balance0Query.refetch();
      balance1Query.refetch();
    },
    changeQuantity,
    changeQuantityWithFixedPrice,
    changeQuantityAlone,
    changeQuantityWrapped,
    fetchBestTrade,
    changeToken,
    invertTokens
  };
};

export default usePairManager;
