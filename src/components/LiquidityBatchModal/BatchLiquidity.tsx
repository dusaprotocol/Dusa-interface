import React, {
  memo,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback
} from 'react';
import {
  getBidAskDistributionFromBinRange,
  getCurveDistributionFromBinRange,
  getUniformDistributionFromBinRange,
  TokenAmount
} from '@dusalabs/sdk';
import { clsx } from 'clsx/lite';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  formatNumberWithSubscriptZeros,
  getIdFromPrice,
  getPriceFromId,
  printBigintIsh
} from 'utils/methods';
import { MASSA } from 'utils/tokens';
import {
  buildAddLiquidityTx,
  buildRemoveLiquidityTx
} from 'utils/transactionBuilder';
import { Bin, LiquidityShape, Token, Version } from 'utils/types';

interface BatchLiquidityProps {
  token0: Token;
  token1: Token;
  binStep: number;
  version: Version;
  liquidityBatch: Bin[];
  activeIdDesired: number;
  isAddLiquidity: boolean;
  isBatchSelected: boolean;
  setBatchSelected: React.Dispatch<React.SetStateAction<number | undefined>>;
  index: number;
  chosenShape?: LiquidityShape;
  executeTxTrigger?: boolean;
  setExecuteTxsTrigger?: React.Dispatch<
    React.SetStateAction<boolean[] | undefined>
  >;
}

const BatchLiquidity = ({
  token0,
  token1,
  binStep,
  version,
  liquidityBatch,
  activeIdDesired,
  isAddLiquidity,
  isBatchSelected,
  setBatchSelected,
  index,
  chosenShape,
  executeTxTrigger,
  setExecuteTxsTrigger
}: BatchLiquidityProps) => {
  const [txConfirmed, setTxConfirmed] = useState(false);
  const { connectedAddress } = useContext(AccountWrapperContext);
  const {
    activeId: _activeId,
    fetchLiquidityAndTVL,
    fetchBalances
  } = useContext(PoolContext);
  const { amountLiquiditySlippage, priceLiquiditySlippage } =
    useContext(SettingsContext);

  const activeId = _activeId ?? 0;

  const amountX = liquidityBatch.reduce((acc, bin) => acc + bin.amount0, 0n);
  const amountY = liquidityBatch.reduce((acc, bin) => acc + bin.amount1, 0n);
  const amountXMin =
    (amountX * BigInt(10000 - amountLiquiditySlippage)) / BigInt(10000);
  const amountYMin =
    (amountY * BigInt(10000 - amountLiquiditySlippage)) / BigInt(10000);

  const methodForAddLiquidity =
    (token0.equals(MASSA) && amountX > 0n) ||
    (token1.equals(MASSA) && amountY > 0n)
      ? 'addLiquidityMAS'
      : 'addLiquidity';

  const methodForRemoveLiquidity =
    (token0.equals(MASSA) && amountX > 0n) ||
    (token1.equals(MASSA) && amountY > 0n)
      ? 'removeLiquidityMAS'
      : 'removeLiquidity';

  const lowerBoundId = isAddLiquidity
    ? getIdFromPrice(
        getPriceFromId(activeIdDesired, binStep) *
          (1 -
            (priceLiquiditySlippage === 10000 ? 9999 : priceLiquiditySlippage) /
              10000),
        binStep
      )
    : 0;
  const idSlippage = isAddLiquidity
    ? activeIdDesired !== activeId
      ? Math.abs(activeIdDesired - activeId)
      : activeId - lowerBoundId
    : 0;

  const rangeValue = useMemo(
    () => [liquidityBatch[0].id, liquidityBatch[liquidityBatch.length - 1].id],
    [liquidityBatch]
  );

  const parsedAmounts = useMemo(
    () => [new TokenAmount(token0, amountX), new TokenAmount(token1, amountY)],
    [token0, token1, amountX, amountY]
  );

  const { deltaIds, distributionX, distributionY } = useMemo(() => {
    if (!isAddLiquidity) {
      return { deltaIds: [0], distributionX: [0n], distributionY: [0n] };
    }

    switch (chosenShape) {
      case LiquidityShape.SPOT:
        return getUniformDistributionFromBinRange(activeId, rangeValue);
      case LiquidityShape.CURVE:
        return getCurveDistributionFromBinRange(
          activeId,
          rangeValue,
          parsedAmounts
        );
      default:
        return getBidAskDistributionFromBinRange(
          activeId,
          rangeValue,
          parsedAmounts
        );
    }
  }, [isAddLiquidity, chosenShape, activeId, rangeValue, parsedAmounts]);

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

  const addLiquidityTxData = useMemo(
    () =>
      buildAddLiquidityTx(
        getWmasIfMas(token0).address,
        getWmasIfMas(token1).address,
        binStep,
        amountX,
        amountY,
        amountXMin,
        amountYMin,
        activeIdDesired ?? 0,
        idSlippage,
        deltaIds,
        distributionX,
        distributionY,
        connectedAddress,
        methodForAddLiquidity,
        version
      ),
    [
      token0,
      token1,
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
    ]
  );

  const { pending: pendingAdd, submitTx: addLiquidity } = useSendTransaction({
    data: addLiquidityTxData,
    onTxConfirmed: onTxConfirmed,
    skipAutoRefetch: true
  });

  const removeLiquidityTxData = useMemo(
    () =>
      buildRemoveLiquidityTx(
        getWmasIfMas(token0).address,
        getWmasIfMas(token1).address,
        binStep,
        amountXMin,
        amountYMin,
        liquidityBatch.map((bin) => bin.id),
        liquidityBatch
          .map((bin) => bin.amountLBT)
          .filter((amount) => amount > 0n),
        connectedAddress,
        methodForRemoveLiquidity,
        version
      ),
    [
      token0,
      token1,
      binStep,
      amountXMin,
      amountYMin,
      liquidityBatch,
      connectedAddress,
      methodForRemoveLiquidity,
      version
    ]
  );

  const { pending: pendingRemove, submitTx: removeLiquidity } =
    useSendTransaction({
      data: removeLiquidityTxData,
      onTxConfirmed: onTxConfirmed,
      skipAutoRefetch: true
    });

  useEffect(() => {
    if (!executeTxTrigger) return;
    isAddLiquidity ? addLiquidity() : removeLiquidity();
  }, [executeTxTrigger]);

  return (
    <div
      className={clsx(
        'batch',
        isBatchSelected && 'active',
        (pendingAdd || pendingRemove || txConfirmed) && 'disabled'
      )}
      onClick={() => {
        if (txConfirmed) return;
        if (pendingAdd || pendingRemove) return;
        setBatchSelected(index);
      }}
    >
      <div className='batch-title'>
        <span>Batch {index + 1} </span>
        <span>
          {txConfirmed &&
            (isAddLiquidity
              ? '(Liquidity added ✅)'
              : '(Liquidity removed ✅)')}
          {(pendingAdd || pendingRemove) && <Spinner size={20} />}
        </span>
      </div>
      <div className='batch-content'>
        <div className='batch-price-range'>
          <span>Price range:</span>
          <span>
            {formatNumberWithSubscriptZeros(
              getPriceFromId(liquidityBatch[0].id, binStep) *
                10 ** (token0.decimals - token1.decimals)
            )}{' '}
            -{' '}
            {formatNumberWithSubscriptZeros(
              getPriceFromId(
                liquidityBatch[liquidityBatch.length - 1].id,
                binStep
              ) *
                10 ** (token0.decimals - token1.decimals)
            )}
          </span>
        </div>
        <div className='batch-price-range'>
          <span>Amounts:</span>
          <span>
            {formatNumberWithSubscriptZeros(
              printBigintIsh(
                token0,
                liquidityBatch.reduce((acc, bin) => acc + bin.amount0, 0n)
              )
            )}{' '}
            {token0.symbol} -{' '}
            {formatNumberWithSubscriptZeros(
              printBigintIsh(
                token1,
                liquidityBatch.reduce((acc, bin) => acc + bin.amount1, 0n)
              )
            )}{' '}
            {token1.symbol}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(BatchLiquidity);
