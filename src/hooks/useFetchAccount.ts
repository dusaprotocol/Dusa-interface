import { TokenAmount } from '@dusalabs/sdk';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AccountService } from 'context/AccountWrapperContext';
import { FEATURE_FLAGS } from 'utils/config';
import {
  fetchAllTokensBalance,
  fetchRollBalance,
  fetchLocks,
  fetchUserLiquidityFees,
  fetchUserLiquidityBins
} from 'utils/datastoreFetcher';
import {
  roundTokenAmount,
  sortTokens,
  sumBinAmounts,
  toFraction
} from 'utils/methods';
import { getImportedTokens, getPendingDCADelete } from 'utils/storage';
import { tokens as _tokens, DUSA_MAIN, MASSA, ntDUSA } from 'utils/tokens';
import { PoolLiquidity, TokenInfo, RefetchDrawerElement } from 'utils/types';
import { fetchALBatch } from './useFetchAL';
import useFetchAllPools from './useFetchAllPools';
import { usePairAddresses } from './useFetchData';
import { useTokenValues } from './useFetchData/tokenValue';
import { useFetchDCAs } from './useFetchDCAs';
import { useFetchOrders } from './useFetchOrders';

const filterPool = (p: Pick<PoolLiquidity, 'amount0' | 'amount1'>) =>
  p.amount0 > 0 || p.amount1 > 0;

const useFetchAccount = (userAddress: string): AccountService => {
  const connected = !!userAddress;
  const opts = { enabled: connected };

  const tokens = sortTokens(_tokens.concat(getImportedTokens()))
    .filter((t) => !!t.address)
    .filter(
      (token, index, self) =>
        index === self.findIndex((t) => t.address === token.address) ||
        !_tokens.some(
          (originalToken) => originalToken.address === token.address
        )
    );
  const tokenValues = useTokenValues(tokens);
  const masIndex = tokens.findIndex((t) => t.address === MASSA.address);

  const allPoolsV1Query = useFetchAllPools();
  const allPoolsV2Query = useFetchAllPools(false);
  const allPoolsV1 = allPoolsV1Query.data || [];
  const allPoolsV2 = allPoolsV2Query.data || [];
  const allPools = allPoolsV1.concat(allPoolsV2);
  const { poolAddresses, poolAddressesReady } = usePairAddresses(allPools);

  const tokenAddresses = tokens.map((t) => t.address);
  const balancesQuery = useQuery(
    ['balances', userAddress, tokenAddresses.join()],
    () => fetchAllTokensBalance(tokenAddresses, userAddress),
    opts
  );
  // TODO: refactor to use useQueries? duplicate fetch in usePairManager
  const balances = balancesQuery.data || [];

  const poolsOwnQuery = useQueries({
    queries: poolAddresses.map((poolAddress, i) => ({
      queryKey: ['liquidity', poolAddress, userAddress],
      queryFn: () =>
        fetchUserLiquidityBins(
          userAddress,
          poolAddress,
          allPools[i].token0,
          allPools[i].token1,
          allPools[i].binStep
        ),
      enabled: connected && !!poolAddress && !!allPools[i]
    }))
  });
  const amounts = poolsOwnQuery.map((p) => sumBinAmounts(p.data || []));
  const poolsOwnReady = poolsOwnQuery.every((p) => p.data);
  const poolsOwn = poolsOwnReady
    ? poolsOwnQuery
        .map((p, i) => ({
          ...allPools[i],
          ...amounts[i],
          fees0: 0n,
          fees1: 0n
        }))
        .filter((p) => p.amount0 > 0 || p.amount1 > 0)
    : [];
  const refetchPoolsOwn = () => poolsOwnQuery.forEach((p) => p.refetch());

  const autoPoolsOwnQuery = useQuery(
    ['autoPoolsOwn', userAddress],
    () => fetchALBatch(userAddress).then((r) => r.filter(filterPool)),
    { enabled: connected && FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY }
  );
  const autoPoolsOwn = autoPoolsOwnQuery.data || [];

  const {
    orders,
    refetch: refetchOrders,
    isLoading: isLoadingOrders,
    isFetched: isFetchedOrders
  } = useFetchOrders(userAddress);

  const {
    dcas,
    refetch: refetchDCAs,
    isLoading: isLoadingDCAs,
    isFetched: isFetchedDCAs
  } = useFetchDCAs(userAddress);

  const activeDCAs = dcas
    .filter(
      (dca) =>
        dca.status === 'ACTIVE' &&
        (dca.execution.length < dca.nbOfDCA || !dca.nbOfDCA) &&
        (Date.now() - dca.startTime.getTime()) / dca.interval <
          dca.execution.length + 1 &&
        !getPendingDCADelete(userAddress).includes(dca.id)
    )
    .sort((a, b) => b.id - a.id);

  const dcasHistory = dcas
    .map((dca) => {
      return {
        ...dca,
        endTime: new Date(
          dca.startTime.getTime() + dca.interval * dca.execution.length
        )
      };
    })
    .filter(
      (dca) =>
        dca.status !== 'ACTIVE' ||
        dca.execution.length === dca.nbOfDCA ||
        (Date.now() - dca.startTime.getTime()) / dca.interval >=
          dca.execution.length + 1
    )
    .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

  const rollsQuery = useQuery(
    ['roll', userAddress],
    () => fetchRollBalance(userAddress),
    { enabled: connected }
  );
  const rolls = rollsQuery.data || 0;

  const locksQuery = useQuery(
    ['locks', userAddress],
    () => fetchLocks(userAddress),
    { enabled: connected && FEATURE_FLAGS.GOVERNANCE_V2 }
  );
  const locks = locksQuery.data;
  const dusaIndex = tokens.findIndex((t) => t.address === DUSA_MAIN.address);
  const dusaValue = tokenValues?.[dusaIndex] || 0;
  const locksValue =
    locks?.reduce(
      (acc, lock) =>
        acc +
        Number(
          new TokenAmount(DUSA_MAIN, lock.amount)
            .multiply(toFraction(dusaValue))
            .toSignificant(2)
        ),
      0
    ) || 0;

  const calcPoolValue = (pool: PoolLiquidity) => {
    const { token0, token1 } = pool;
    const token0Index = tokens.findIndex((t) => t.equals(token0));
    const token1Index = tokens.findIndex((t) => t.equals(token1));
    const token0Value = tokenValues && tokenValues[token0Index];
    const token1Value = tokenValues && tokenValues[token1Index];
    if (!token0Value || !token1Value) return 0;

    const token0Amount = new TokenAmount(token0, pool.amount0 + pool.fees0);
    const token1Amount = new TokenAmount(token1, pool.amount1 + pool.fees1);
    const value = Number(
      token0Amount
        .multiply(toFraction(token0Value))
        .add(token1Amount.multiply(toFraction(token1Value)))
        .toSignificant(6)
    );
    return value;
  };

  const poolsValue =
    poolsOwn?.reduce((acc, curr) => acc + calcPoolValue(curr), 0) ?? 0;
  const autopoolsValue =
    autoPoolsOwn?.reduce((acc, curr) => acc + calcPoolValue(curr), 0) ?? 0;
  const tokensValue =
    tokens?.reduce((acc, _curr, i) => {
      if (!balances.length) return 0;
      return acc + roundTokenAmount(_curr, balances[i]) * tokenValues[i];
    }, 0) ?? 0;
  const rollsValue = rolls * 100 * tokenValues[masIndex];
  const portfolioValue =
    tokensValue + poolsValue + autopoolsValue + rollsValue + locksValue;

  const tokensInfo: TokenInfo[] | undefined =
    balances.length && tokenValues.length
      ? tokens
          .map((token, i) => ({
            balance: balances[i],
            price: tokenValues[i],
            token
          }))
          .filter(
            (tokenInfo) =>
              !(tokenInfo.token.equals(ntDUSA) && tokenInfo.balance === 0n)
          )
          .sort((a, b) => {
            const aVal = roundTokenAmount(a.token, a.balance) * a.price;
            const bVal = roundTokenAmount(b.token, b.balance) * b.price;
            return bVal - aVal;
          })
      : undefined;

  const refetch = (elements?: RefetchDrawerElement[]) => {
    if (elements === undefined) {
      balancesQuery.isFetched && balancesQuery.refetch();
      poolsOwnReady && refetchPoolsOwn();
      autoPoolsOwnQuery.isFetched && autoPoolsOwnQuery.refetch();
      isFetchedDCAs && refetchDCAs();
      isFetchedOrders && refetchOrders();
      rollsQuery.isFetched && rollsQuery.refetch();
      locksQuery.isFetched && locksQuery.refetch();
      return;
    }
    elements.forEach((element) => {
      switch (element) {
        case 'balances':
          balancesQuery.isFetched && balancesQuery.refetch();
          break;
        case 'poolsOwn':
          poolsOwnReady && refetchPoolsOwn();
          break;
        case 'autoPoolsOwn':
          autoPoolsOwnQuery.isFetched && autoPoolsOwnQuery.refetch();
          break;
        case 'dcas':
          isFetchedDCAs && refetchDCAs();
          break;
        case 'orders':
          isFetchedOrders && refetchOrders();
          break;
        case 'rolls':
          rollsQuery.isFetched && rollsQuery.refetch();
          break;
        case 'locks':
          locksQuery.isFetched && locksQuery.refetch();
          break;
        default:
          break;
      }
    });
  };

  const isLoading = (elements?: RefetchDrawerElement[]) => {
    if (elements === undefined) {
      return (
        balancesQuery.isLoading ||
        !poolsOwnReady ||
        (FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && autoPoolsOwnQuery.isLoading) ||
        (FEATURE_FLAGS.DCA && isLoadingDCAs) ||
        (FEATURE_FLAGS.LIMIT && isLoadingOrders) ||
        rollsQuery.isLoading ||
        locksQuery.isLoading
      );
    }
    return elements.some((element) => {
      switch (element) {
        case 'balances':
          return balancesQuery.isLoading;
        case 'poolsOwn':
          return !poolsOwnReady;
        case 'autoPoolsOwn':
          return (
            FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && autoPoolsOwnQuery.isLoading
          );
        case 'dcas':
          return FEATURE_FLAGS.DCA && isLoadingDCAs;
        case 'orders':
          return FEATURE_FLAGS.LIMIT && isLoadingOrders;
        case 'rolls':
          return rollsQuery.isLoading;
        case 'locks':
          return locksQuery.isLoading;
        default:
          return false;
      }
    });
  };

  return {
    tokensInfo,
    rolls,
    rollsValue,
    activeDCAs,
    dcasHistory,
    orders,
    poolsOwn,
    autoPoolsOwn,
    poolsValue,
    autopoolsValue,
    tokensValue,
    locks,
    locksValue,
    portfolioValue,
    isLoading,
    refetch
  };
};

export default useFetchAccount;
