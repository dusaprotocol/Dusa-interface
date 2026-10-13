import React, {
  memo,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback
} from 'react';
import { clsx } from 'clsx/lite';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import {
  formatNumberWithSubscriptZeros,
  getPriceFromId,
  printBigintIsh
} from 'utils/methods';
import { buildClaimFeesTx } from 'utils/transactionBuilder';
import { Bin, ClaimInfo, Token } from 'utils/types';

interface BatchFeesProps {
  token0: Token;
  token1: Token;
  binStep: number;
  liquidityBatch: Bin[];
  isBatchSelected: boolean;
  setBatchSelected: React.Dispatch<React.SetStateAction<number | undefined>>;
  index: number;
  executeTxTrigger?: boolean;
  setExecuteTxsTrigger?: React.Dispatch<
    React.SetStateAction<boolean[] | undefined>
  >;
  claimInfo: ClaimInfo[];
}

const BatchFees = ({
  token0,
  token1,
  binStep,
  liquidityBatch,
  isBatchSelected,
  setBatchSelected,
  index,
  executeTxTrigger,
  setExecuteTxsTrigger,
  claimInfo
}: BatchFeesProps) => {
  const [txConfirmed, setTxConfirmed] = useState(false);
  const { connectedAddress } = useContext(AccountWrapperContext);
  const {
    pairAddress,
    activeId: _activeId,
    fetchLiquidityAndTVL,
    fetchBalances
  } = useContext(PoolContext);

  // Memoized calculations for performance
  const binIds = useMemo(
    () => liquidityBatch.map((bin) => bin.id),
    [liquidityBatch]
  );

  const totalAmountX = useMemo(
    () => claimInfo.reduce((acc, info) => acc + info.amounts.amountX, 0n),
    [claimInfo]
  );

  const totalAmountY = useMemo(
    () => claimInfo.reduce((acc, info) => acc + info.amounts.amountY, 0n),
    [claimInfo]
  );

  const priceRange = useMemo(() => {
    if (liquidityBatch.length === 0) return { start: 0, end: 0 };
    const decimalsAdjustment = 10 ** (token0.decimals - token1.decimals);
    return {
      start: getPriceFromId(liquidityBatch[0].id, binStep) * decimalsAdjustment,
      end:
        getPriceFromId(liquidityBatch[liquidityBatch.length - 1].id, binStep) *
        decimalsAdjustment
    };
  }, [liquidityBatch, binStep, token0.decimals, token1.decimals]);

  const onTxConfirmed = useCallback(() => {
    setTxConfirmed(true);
    setBatchSelected(undefined);

    // Debounce refetch calls to avoid cascade
    setTimeout(() => {
      fetchLiquidityAndTVL();
      fetchBalances();
    }, 100);

    setExecuteTxsTrigger &&
      setExecuteTxsTrigger((prev) => {
        if (!prev) return;
        const newExecuteTxsTrigger = [...prev];
        newExecuteTxsTrigger[index] = false;
        return newExecuteTxsTrigger;
      });
  }, [
    fetchLiquidityAndTVL,
    fetchBalances,
    setBatchSelected,
    setExecuteTxsTrigger,
    index
  ]);

  if (!pairAddress) throw new Error('Pair address not found');

  const claimFeesTxData = useMemo(
    () => buildClaimFeesTx(pairAddress, connectedAddress, binIds),
    [pairAddress, connectedAddress, binIds]
  );

  const { pending, submitTx: claimFees } = useSendTransaction({
    data: claimFeesTxData,
    onTxConfirmed: onTxConfirmed,
    skipAutoRefetch: true
  });

  useEffect(() => {
    if (!executeTxTrigger) return;
    claimFees();
  }, [executeTxTrigger]);

  return (
    <div
      className={clsx(
        'batch',
        isBatchSelected && 'active',
        (pending || txConfirmed) && 'disabled'
      )}
      onClick={() => {
        if (txConfirmed) return;
        if (pending) return;
        setBatchSelected(index);
      }}
    >
      <div className='batch-title'>
        <span>Batch {index + 1} </span>
        <span>
          {txConfirmed && '(Fees claimed ✅)'}
          {pending && <Spinner size={20} />}
        </span>
      </div>
      <div className='batch-content'>
        <div className='batch-price-range'>
          <span>Price range: ({liquidityBatch.length} bins)</span>
          <span>
            {formatNumberWithSubscriptZeros(priceRange.start)} -{' '}
            {formatNumberWithSubscriptZeros(priceRange.end)}
          </span>
        </div>
        <div className='batch-price-range'>
          <span>Amounts:</span>
          <span>
            {formatNumberWithSubscriptZeros(
              printBigintIsh(token0, totalAmountX)
            )}{' '}
            {token0.symbol} -{' '}
            {formatNumberWithSubscriptZeros(
              printBigintIsh(token1, totalAmountY)
            )}{' '}
            {token1.symbol}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(BatchFees);
