import { useContext, useEffect, useState } from 'react';
import { ILBPair } from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import Button from 'components/Button';
import LiquidityBatchModal from 'components/LiquidityBatchModal';
import RangeSlider from 'components/RangeSlider';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import { routerSC, routerV2SC } from 'utils/config';
import { getWmasIfMas } from 'utils/coreMethods';
import {
  fillEmptyBinsOnRange,
  formatNumberWithSubscriptZeros,
  getPriceFromId,
  printBigintIsh,
  roundPrice
} from 'utils/methods';
import { MASSA } from 'utils/tokens';
import {
  buildRemoveLiquidityTx,
  buildSetApprovalForAll
} from 'utils/transactionBuilder';
import { baseClient } from 'utils/w3';
import LiquidityBars from '../LiquidityBars';
import './index.scss';

const RemoveLiquidity = () => {
  const [, /* amountActiveId */ setAmountActiveId] = useState<[bigint, bigint]>(
    [0n, 0n]
  );
  const [showBatchModal, setShowBatchModal] = useState(false);

  const { amountLiquiditySlippage } = useContext(SettingsContext);
  const { connectedAddress } = useContext(AccountWrapperContext);
  const {
    loading,
    invertPrice,
    token0,
    token1,
    binStep,
    version,
    liquidityBins: bins,
    pairAddress,
    activeId,
    fetchLiquidityAndTVL
  } = useContext(PoolContext);
  const liquidityBins = bins ?? [];

  const router = version === 'V1' ? routerSC : routerV2SC;

  const { data: isApproved, refetch } = useQuery(
    ['isApprovedForAll', pairAddress, connectedAddress],
    () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      new ILBPair(pairAddress!, baseClient).isApprovedForAll(
        connectedAddress,
        router
      ),
    { enabled: !!pairAddress && !!connectedAddress }
  );

  useEffect(() => {
    if (!liquidityBins.length) return;
    const activeBin = liquidityBins.find((bin) => bin.id === activeId);
    activeBin
      ? setAmountActiveId([activeBin.amount0, activeBin.amount1])
      : setAmountActiveId([0n, 0n]);
  }, [liquidityBins]);

  const depositIds = liquidityBins.map((bin) => bin.id);
  const [rangeValue, setRangeValue] = useState<[number, number]>([
    depositIds[0],
    depositIds[depositIds.length - 1]
  ]);

  useEffect(() => {
    if (
      !depositIds.length ||
      (rangeValue[0] === depositIds[0] &&
        rangeValue[1] === depositIds[depositIds.length - 1])
    )
      return;
    setRangeValue([depositIds[0], depositIds[depositIds.length - 1]]);
  }, [liquidityBins]);

  const numBins = rangeValue[1] - rangeValue[0] + 1;
  const idsRange = Array.from({ length: numBins }, (_, i) => i + rangeValue[0]);

  // const idsWithToken0 = depositIds.filter(
  //   (_id, i) => liquidityBins[i].amount0 > 0n && liquidityBins[i].amount1 === 0n
  // );
  // const idsWithToken1 = depositIds.filter(
  //   (_id, i) => liquidityBins[i].amount1 > 0n && liquidityBins[i].amount0 === 0n
  // );
  // const rangeToken0: [number, number] = [
  //   idsWithToken0[0],
  //   idsWithToken0[idsWithToken0.length - 1]
  // ];
  // const rangeToken1: [number, number] = [
  //   idsWithToken1[0],
  //   idsWithToken1[idsWithToken1.length - 1]
  // ];

  const amountX = idsRange.reduce((acc, id) => {
    const activeBin = liquidityBins.find((bin) => bin.id === id);
    return acc + (activeBin?.amount0 || 0n);
  }, 0n);
  const amountY = idsRange.reduce((acc, id) => {
    const activeBin = liquidityBins.find((bin) => bin.id === id);
    return acc + (activeBin?.amount1 || 0n);
  }, 0n);

  const amountsRange = idsRange.map(
    (id) => liquidityBins.find((bin) => bin.id === id)?.amountLBT || 0n
  );

  const ids = idsRange.filter(
    (id) => liquidityBins.find((bin) => bin.id === id)?.amountLBT ?? 0 > 0
  );
  const simulatedBins = liquidityBins.filter((bin) => ids.includes(bin.id));
  const amounts = amountsRange.filter((amount) => amount > 0n);

  const amountXMin =
      (amountX * BigInt(10000 - amountLiquiditySlippage)) / BigInt(10000),
    amountYMin =
      (amountY * BigInt(10000 - amountLiquiditySlippage)) / BigInt(10000);

  const methodForRemoveLiquidity =
    (token0.equals(MASSA) && amountX > 0n) ||
    (token1.equals(MASSA) && amountY > 0n)
      ? 'removeLiquidityMAS'
      : 'removeLiquidity';

  const removeLiquidityData = buildRemoveLiquidityTx(
    getWmasIfMas(token0).address,
    getWmasIfMas(token1).address,
    binStep,
    amountXMin,
    amountYMin,
    ids,
    amounts,
    connectedAddress,
    methodForRemoveLiquidity,
    version
  );

  const approveData = buildSetApprovalForAll(pairAddress ?? '', router);

  const { pending: pendingRemove, submitTx: removeLiquidity } =
    useSendTransaction({
      data: removeLiquidityData,
      onTxConfirmed: () => fetchLiquidityAndTVL()
    });

  const { pending: pendingApprove, submitTx: approve } = useSendTransaction({
    data: approveData,
    onTxConfirmed: () => refetch()
  });

  const lowerPrice =
    getPriceFromId(rangeValue[0], binStep) *
    10 ** (token0.decimals - token1.decimals);
  const higherPrice =
    getPriceFromId(rangeValue[1], binStep) *
    10 ** (token0.decimals - token1.decimals);
  const lowerPriceDisplayed = roundPrice(
    invertPrice ? lowerPrice : 1 / lowerPrice
  );
  const higherPriceDisplayed = roundPrice(
    invertPrice ? higherPrice : 1 / higherPrice
  );
  const allBins = fillEmptyBinsOnRange(simulatedBins, rangeValue);

  if (loading) return <Spinner />;

  return (
    <>
      <div className='RemoveLiquidity'>
        <div className='remove-container'>
          <>
            {depositIds[0] && depositIds[depositIds.length - 1] && (
              <RangeSlider
                value={rangeValue}
                setValue={setRangeValue}
                min={depositIds[0]}
                max={depositIds[depositIds.length - 1]}
              />
            )}

            {!depositIds[0] && !depositIds[depositIds.length - 1] ? (
              <span>You have no liquidity in this range.</span>
            ) : (
              <div className='infos-container'>
                {allBins.find((bin) => bin.amountLBT > 0n) && (
                  <LiquidityBars bins={allBins} aspect={3} />
                )}
                <span>You will receive</span>
                <div className='token-amount'>
                  <div>
                    <img src={token0.logoURI} alt='token-logo' />
                    <span>{token0.symbol}</span>
                    <span>
                      {formatNumberWithSubscriptZeros(
                        printBigintIsh(token0, amountX)
                      )}
                    </span>
                  </div>
                  <span>.</span>
                  <div>
                    <img src={token1.logoURI} alt='token-logo' />
                    <span>{token1.symbol}</span>
                    <span>
                      {formatNumberWithSubscriptZeros(
                        printBigintIsh(token1, amountY)
                      )}
                    </span>
                  </div>
                </div>
                <div className='remove-details'>
                  <div>
                    <span>Price Range</span>
                    <span>
                      {formatNumberWithSubscriptZeros(lowerPriceDisplayed)} -{' '}
                      {formatNumberWithSubscriptZeros(higherPriceDisplayed)}{' '}
                      {invertPrice ? token1.symbol : token0.symbol} per{' '}
                      {invertPrice ? token0.symbol : token1.symbol}
                    </span>
                  </div>
                  <div>
                    <span>Minimum Expected {token0.symbol}</span>
                    <span>
                      {formatNumberWithSubscriptZeros(
                        printBigintIsh(token0, amountXMin)
                      )}
                    </span>
                  </div>
                  <div>
                    <span>Minimum Expected {token1.symbol}</span>
                    <span>
                      {formatNumberWithSubscriptZeros(
                        printBigintIsh(token1, amountYMin)
                      )}
                    </span>
                  </div>
                </div>
                <div className='btns'>
                  {isApproved !== true && (
                    <Button
                      text='Approve LBT'
                      variant='contained'
                      onClick={approve}
                      pending={pendingApprove}
                      disabled={isApproved === undefined}
                    />
                  )}
                  <Button
                    text='Remove Liquidity'
                    variant='contained'
                    onClick={() => {
                      if (simulatedBins.length > 80) setShowBatchModal(true);
                      else removeLiquidity();
                    }}
                    pending={pendingRemove}
                    disabledText={
                      (!isApproved && 'Approve LBT first') ||
                      (amountX === 0n &&
                        amountY === 0n &&
                        'No liquidity to remove') ||
                      undefined
                    }
                  />
                </div>
              </div>
            )}
          </>
        </div>
      </div>
      {showBatchModal && (
        <LiquidityBatchModal
          showModal={showBatchModal}
          setShowModal={setShowBatchModal}
          method='remove'
          bins={simulatedBins}
          simulatedBins={allBins}
        />
      )}
    </>
  );
};

export default RemoveLiquidity;
