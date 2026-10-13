import { useEffect, useState } from 'react';
import { FEATURE_FLAGS } from 'utils/config';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  abs,
  formatNumberWithSubscriptZeros,
  printBigintIsh,
  toToken
} from 'utils/methods';
import { getRecentTransactions } from 'utils/storage';
import { trpc } from 'utils/trpc';
import { Transaction } from 'utils/types';

const useFetchTxs = (userAddress: string) => {
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);

  const getOperationsQuery = trpc.getOperations.useQuery(
    { address: userAddress, take: 100 },
    { enabled: !!userAddress && FEATURE_FLAGS.TXS_FROM_DB }
  );
  const operations = getOperationsQuery.data;
  const isGetTxsLoading =
    getOperationsQuery.isLoading || getOperationsQuery.isFetching;

  const sortTxs = (txs: Transaction[]) =>
    txs.sort((a, b) => b.timestamp - a.timestamp);

  const refreshTxsFn = () => {
    FEATURE_FLAGS.TXS_FROM_DB
      ? getOperationsQuery.refetch().then(() => normalizeTxs())
      : setRecentTxs(getRecentTransactions(userAddress));
  };

  const getLiquidityTxsFromDB = () => {
    if (!operations?.liquidityTxs.length) return [];

    const opsLiquidity: Transaction[] = [];
    for (const op of operations.liquidityTxs) {
      const token0 = getMasIfWmas(toToken(op.pool.token0));
      const token1 = getMasIfWmas(toToken(op.pool.token1));
      const amnt0 = BigInt(op.amount0);
      const amnt1 = BigInt(op.amount1);
      const amount0 = formatNumberWithSubscriptZeros(
        printBigintIsh(token0, abs(amnt0))
      );
      const amount1 = formatNumberWithSubscriptZeros(
        printBigintIsh(token1, abs(amnt1))
      );

      const isAdd = amnt0 > 0n || amnt1 > 0n;

      let description = `${isAdd ? 'Add ' : 'Remove '}`;
      if (amnt0 !== 0n) description += `${amount0} ${token0.symbol}`;
      if (amnt0 !== 0n && amnt1 !== 0n) description += ' and ';
      if (amnt1 !== 0n) description += `${amount1} ${token1.symbol}`;
      description += isAdd ? ' to ' : ' from ';
      description += `${token0.symbol}-${token1.symbol}-${op.pool.binStep} ${op.pool.version}`;

      opsLiquidity.push({
        targetFunction: (isAdd ? 'Add' : 'Remove') + ' Liquidity',
        status: 'confirmed',
        to: op.poolAddress,
        hash: op.txHash,
        timestamp: new Date(op.timestamp).getTime(),
        description,
        from: userAddress
      });
    }

    return opsLiquidity;
  };
  const getSwapTxsFromDB = () => {
    if (!operations?.swapTxs.length) return [];

    const opsSwap: Transaction[] = [];
    for (const op of operations.swapTxs) {
      const token0 = getMasIfWmas(toToken(op.pool.token0));
      const token1 = getMasIfWmas(toToken(op.pool.token1));
      const [tokenIn, tokenOut] = op.swapForY
        ? [token0, token1]
        : [token1, token0];
      const amountIn = formatNumberWithSubscriptZeros(
        printBigintIsh(tokenIn, op.amountIn)
      );
      const amountOut = formatNumberWithSubscriptZeros(
        printBigintIsh(tokenOut, op.amountOut)
      );
      const description = `Swap ${amountIn} ${tokenIn.symbol} for ${amountOut} ${tokenOut.symbol}`;

      const innerSwapIndex = opsSwap.findIndex((tx) => tx.hash === op.txHash);
      if (innerSwapIndex !== -1) {
        const innerSwap = opsSwap[innerSwapIndex];
        let newDescription = innerSwap.description.split('for ')[0];
        newDescription += `for ${amountOut} ${tokenOut.symbol}`;
        innerSwap.description = newDescription;
        continue;
      }
      opsSwap.push({
        targetFunction: 'Swap',
        status: 'confirmed',
        to: op.poolAddress,
        hash: op.txHash,
        timestamp: new Date(op.timestamp).getTime(),
        description,
        from: userAddress
      });
    }

    return opsSwap;
  };

  const normalizeTxs = () => {
    const opsLiquidity: Transaction[] = FEATURE_FLAGS.TXS_FROM_DB
      ? getLiquidityTxsFromDB()
      : [];
    const opsSwap: Transaction[] = FEATURE_FLAGS.TXS_FROM_DB
      ? getSwapTxsFromDB()
      : [];

    const txsFetched = [...opsLiquidity, ...opsSwap];
    const txsFetchedHashes = new Set(txsFetched.map((tx) => tx.hash));
    const txsFromLocalStorage = getRecentTransactions(userAddress);
    const txsFromLocalStorageFiltered = txsFromLocalStorage.filter(
      (tx) => !txsFetchedHashes.has(tx.hash)
    );
    const opsConcat = txsFromLocalStorageFiltered.concat(txsFetched);
    const ops = sortTxs(opsConcat);
    setRecentTxs(ops);
  };

  useEffect(() => {
    normalizeTxs();
  }, [operations]);

  return { recentTxs, isGetTxsLoading, refreshTxsFn };
};

export default useFetchTxs;
