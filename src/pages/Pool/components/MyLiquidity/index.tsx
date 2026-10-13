import React, { useContext, useEffect, useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import Button from 'components/Button';
import { Warning } from 'components/Info';
import LiquidityBatchModal from 'components/LiquidityBatchModal';
import LiquidityRangeInfo from 'components/LiquidityRangeInfo';
import Spinner from 'components/Spinner';
import TokenPledgeModal from 'components/TokenPledgeModal';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import { FEATURE_FLAGS } from 'utils/config';
import { fetchPendingFeesIds } from 'utils/datastoreFetcher';
import {
  fillMissingBins,
  formatNumberWithSubscriptZeros,
  printBigintIsh,
  printUSD,
  toFraction
} from 'utils/methods';
import { getClaimedFeesToDonate, setClaimedFeesToDonate } from 'utils/storage';
import { buildClaimFeesTx } from 'utils/transactionBuilder';
import { Bin } from 'utils/types';
import LiquidityBars from '../LiquidityBars';
import './index.scss';

const MyLiquidity = () => {
  const { connected, connectedAddress } = useContext(AccountWrapperContext);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showButtonOpenPledge, setShowButtonOpenPledge] = useState(false);
  const [showTokenPledgeModal, setShowTokenPledgeModal] = useState(false);
  const [claimableFeesState, setClaimableFeesState] = useState({
    amount0: 0n,
    amount1: 0n
  });
  const [feesToDonate, setFeesToDonate] = useState({
    amount0: 0n,
    amount1: 0n
  });
  const [isFeesClaimed, setIsFeesClaimed] = useState(false);

  const {
    token0,
    token1,
    pairAddress,
    version,
    liquidityBins,
    claimableFees,
    autonomousLiquidityBins,
    dollarValue0,
    dollarValue1,
    depositALBalance,
    depositBalance,
    fetchLiquidityAndTVL
  } = useContext(PoolContext);

  useEffect(() => {
    if (!claimableFees || isFeesClaimed) return;
    setClaimableFeesState({
      amount0: claimableFees.amount0,
      amount1: claimableFees.amount1
    });
  }, [claimableFees]);

  useEffect(() => {
    if (!connected || !pairAddress) return;
    const claimedFeesToDonate = getClaimedFeesToDonate(
      connectedAddress,
      pairAddress
    );
    setFeesToDonate({
      amount0: claimedFeesToDonate.amount0,
      amount1: claimedFeesToDonate.amount1
    });
    if (claimedFeesToDonate.amount0 > 0n || claimedFeesToDonate.amount1 > 0n)
      setShowButtonOpenPledge(true);
  }, [connectedAddress, pairAddress]);

  const calcValue = (amount0: bigint, amount1: bigint) =>
    Number(
      new TokenAmount(token0, amount0)
        .multiply(toFraction(dollarValue0 || 0))
        .add(
          new TokenAmount(token1, amount1).multiply(
            toFraction(dollarValue1 || 0)
          )
        )
        .toSignificant(6)
    );

  const balanceValue =
    calcValue(depositBalance.amount0, depositBalance.amount1) +
    calcValue(depositALBalance.amount0, depositALBalance.amount1);
  const feesValue = calcValue(claimableFees.amount0, claimableFees.amount1);

  const fetchClaimInfo = async () => {
    if (!liquidityBins || !pairAddress) return;
    return fetchPendingFeesIds(pairAddress, connectedAddress, liquidityBins);
  };
  const claimInfoQuery = useQuery(
    [
      'claimInfo',
      pairAddress,
      connectedAddress,
      liquidityBins?.map((b) => b.id)
    ],
    fetchClaimInfo,
    {
      enabled: connected && !!liquidityBins
    }
  );
  const claimInfo = claimInfoQuery.data || [];
  const idsToClaim: number[] = claimInfo.map((item) => item.id);
  const binsToClaim =
    liquidityBins?.filter((bin) => idsToClaim.includes(bin.id)) || [];

  if (!pairAddress) throw new Error('Pair address not found');

  const { pending, submitTx: claimFees } = useSendTransaction({
    data: buildClaimFeesTx(pairAddress, connectedAddress, idsToClaim),
    onTxConfirmed: () => {
      fetchLiquidityAndTVL();
      setIsFeesClaimed(true);
      claimInfoQuery.refetch();
      if (!FEATURE_FLAGS.TOKEN_PLEDGE) return;
      const claimableFeesStorage = getClaimedFeesToDonate(
        connectedAddress,
        pairAddress
      );
      const fees0 = claimableFeesStorage.amount0 + claimableFeesState.amount0;
      const fees1 = claimableFeesStorage.amount1 + claimableFeesState.amount1;
      setFeesToDonate({
        amount0: fees0,
        amount1: fees1
      });
      setClaimedFeesToDonate(connectedAddress, pairAddress, {
        amount0: fees0,
        amount1: fees1
      });
      setShowButtonOpenPledge(true);
    }
  });

  const loading = !claimableFees || !liquidityBins || !autonomousLiquidityBins;
  const noLiquidity =
    !liquidityBins?.length &&
    (!autonomousLiquidityBins?.length || !FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY);
  const hasManual = liquidityBins?.length !== 0;
  const hasAutonomous =
    autonomousLiquidityBins?.length !== 0 && FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY;
  const hasClaimableFees =
    claimableFees && claimableFees.amount0 + claimableFees.amount1 !== 0n;

  const renderLiquidity = (manual: boolean, bins: Bin[]) => {
    return (
      <>
        {FEATURE_FLAGS.AUTONOMOUS_LIQUIDITY && (
          <span>{manual ? 'Manual' : 'Autonomous'} Liquidity</span>
        )}
        <LiquidityBars aspect={3} bins={bins} />
      </>
    );
  };

  return (
    <>
      <div className='MyLiquidity feature'>
        <div className='container-feature'>
          <div className='liquidity-container'>
            {!connected ? (
              <div className='no-liquidity'>
                Connect wallet to see your position
              </div>
            ) : loading ? (
              <div className='no-liquidity'>
                <Spinner />
              </div>
            ) : noLiquidity ? (
              <div className='no-liquidity'>No liquidity found</div>
            ) : (
              <div className='liquidity'>
                <LiquidityRangeInfo
                  isIn={
                    liquidityBins.find((bin) => bin.amount0 > 0n) &&
                    liquidityBins.find((bin) => bin.amount1 > 0n)
                      ? true
                      : false
                  }
                />
                {hasManual ? (
                  <>{renderLiquidity(true, fillMissingBins(liquidityBins))}</>
                ) : null}
                {hasAutonomous ? (
                  <>
                    {renderLiquidity(
                      false,
                      fillMissingBins(autonomousLiquidityBins, 5)
                    )}
                  </>
                ) : null}
                <div className='liquidity-section'>
                  <div className='liquidity-section-title'>
                    <span>Deposit Balance</span>
                    <span>Value: ${printUSD(balanceValue)}</span>
                  </div>

                  {[token0, token1].map((token, i) => {
                    const manualAmount =
                      i === 0 ? depositBalance.amount0 : depositBalance.amount1;
                    const autonomousAmount =
                      i === 0
                        ? depositALBalance.amount0
                        : depositALBalance.amount1;
                    return (
                      <React.Fragment key={i}>
                        <div className='liquidity-section-item'>
                          <div className='tokenInfo'>
                            <img src={token.logoURI} alt='token-logo' />
                            <span>{token.symbol}</span>
                          </div>
                          <div className='tokenDeposit'>
                            {hasManual ? (
                              <>
                                {formatNumberWithSubscriptZeros(
                                  printBigintIsh(token, manualAmount)
                                )}{' '}
                                {hasAutonomous && '(Manual) + '}
                              </>
                            ) : null}
                            {hasAutonomous ? (
                              <>
                                {formatNumberWithSubscriptZeros(
                                  printBigintIsh(token, autonomousAmount)
                                )}{' '}
                                {hasManual && '(Autonomous)'}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
                {version !== 'V2' &&
                  (hasClaimableFees || hasManual ? (
                    <>
                      <div className='liquidity-section'>
                        <div className='liquidity-section-title'>
                          <span>Claimable Fees</span>
                          <span>Value: ${printUSD(feesValue)}</span>
                        </div>
                        <div className='liquidity-section-item'>
                          <div className='tokenInfo'>
                            <img src={token0.logoURI} alt='token-logo' />
                            <span>{token0.symbol}</span>
                          </div>
                          <div className='tokenDeposit'>
                            {formatNumberWithSubscriptZeros(
                              printBigintIsh(token0, claimableFees.amount0)
                            )}
                          </div>
                        </div>
                        <div className='liquidity-section-item'>
                          <div className='tokenInfo'>
                            <img src={token1.logoURI} alt='token-logo' />
                            <span>{token1.symbol}</span>
                          </div>
                          <div className='tokenDeposit'>
                            {formatNumberWithSubscriptZeros(
                              printBigintIsh(token1, claimableFees.amount1)
                            )}
                          </div>
                        </div>
                      </div>
                      {claimInfo.length > 250 && (
                        <Warning text='Claiming fees on a large range of bins requires more than one transaction' />
                      )}
                      <Button
                        variant='contained'
                        text='Claim Fees'
                        onClick={() => {
                          if (claimInfo.length > 250) {
                            setShowBatchModal(true);
                            return;
                          }
                          claimFees();
                        }}
                        pending={pending}
                        disabled={!hasClaimableFees || isFeesClaimed}
                      />
                      {showButtonOpenPledge &&
                        (feesToDonate.amount0 > 0n ||
                          feesToDonate.amount1 > 0n) && (
                          <Button
                            variant='contained'
                            text='Donate to charity ❤️'
                            onClick={() => setShowTokenPledgeModal(true)}
                          />
                        )}
                    </>
                  ) : hasAutonomous ? (
                    <span className='info-al-fees'>
                      <em>
                        In autonomous liquidity the fees generated are
                        automatically claimed and added to your current position
                      </em>
                    </span>
                  ) : null)}
              </div>
            )}
          </div>
        </div>
      </div>
      {showBatchModal && (
        <LiquidityBatchModal
          showModal={showBatchModal}
          setShowModal={setShowBatchModal}
          method='claim'
          bins={binsToClaim}
          simulatedBins={[]}
          claimInfo={claimInfo}
        />
      )}
      {showTokenPledgeModal && (
        <TokenPledgeModal
          showModal={showTokenPledgeModal}
          setShowModal={setShowTokenPledgeModal}
          token0={token0}
          token1={token1}
          amounts={feesToDonate}
          setAmounts={setFeesToDonate}
        />
      )}
    </>
  );
};

export default MyLiquidity;
