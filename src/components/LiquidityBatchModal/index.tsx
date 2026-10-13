import React, { useContext, useEffect, useState } from 'react';
import Button from 'components/Button';
import Checkbox from 'components/Checkbox';
import Modal, { ModalProps } from 'components/Modal';
import { SimpleTooltip } from 'components/Tooltip';
import { PoolContext } from 'pages/Pool';
import LiquidityBars from 'pages/Pool/components/LiquidityBars';
import { Bin, ClaimInfo, LiquidityShape } from 'utils/types';
import BatchFees from './BatchFees';
import BatchLiquidity from './BatchLiquidity';
import './index.scss';

interface LiquidityBatchModalProps extends ModalProps {
  method: 'add' | 'remove' | 'claim';
  bins: Bin[];
  simulatedBins: Bin[];
  stackCurrentPosition?: boolean;
  setStackCurrentPosition?: React.Dispatch<React.SetStateAction<boolean>>;
  activeIdDesired?: number;
  chosenShape?: LiquidityShape;
  claimInfo?: ClaimInfo[];
  resetTokensInputs?: () => void;
}

const LiquidityBatchModal = ({
  showModal,
  setShowModal,
  method,
  bins,
  simulatedBins,
  stackCurrentPosition,
  setStackCurrentPosition,
  activeIdDesired,
  chosenShape,
  claimInfo,
  resetTokensInputs
}: LiquidityBatchModalProps) => {
  const [batchSelected, setBatchSelected] = useState<number>();
  const [executeTxsTrigger, setExecuteTxsTrigger] = useState<boolean[]>();
  const [liquidityBatches, setLiquidityBatches] = useState<Bin[][]>([]);
  const [claimBatches, setClaimBatches] = useState<ClaimInfo[][]>([]);

  const {
    token0,
    token1,
    binStep,
    version,
    activeId: _activeId
  } = useContext(PoolContext);

  useEffect(() => {
    const chunkSize = Math.ceil(
      bins.length /
        Math.ceil(
          bins.length / (method === 'add' ? 61 : method === 'remove' ? 80 : 150)
        )
    );
    const _liquidityBatches: Bin[][] = [];
    const _claimBatches: ClaimInfo[][] = [];
    for (let i = 0; i < bins.length; i += chunkSize) {
      _liquidityBatches.push(bins.slice(i, i + chunkSize));
      claimInfo && _claimBatches.push(claimInfo.slice(i, i + chunkSize));
    }
    setLiquidityBatches(_liquidityBatches);
    claimInfo && setClaimBatches(_claimBatches);

    const status = new Array(_liquidityBatches.length).fill(false);
    setExecuteTxsTrigger(status);
  }, []);

  return (
    <Modal
      title={
        method === 'add'
          ? 'Add Liquidity'
          : method === 'remove'
            ? 'Remove Liquidity'
            : 'Claim Fees'
      }
      showModal={showModal}
      setShowModal={setShowModal}
      variant='large'
      onClose={() => resetTokensInputs && resetTokensInputs()}
    >
      <div className='LiquidityBatchModal'>
        <div className='simulated-position-content'>
          {method === 'add' && (
            <button
              onClick={() =>
                setStackCurrentPosition &&
                setStackCurrentPosition(!stackCurrentPosition)
              }
            >
              <Checkbox
                checked={stackCurrentPosition ?? false}
                onChange={setStackCurrentPosition}
              />
              <SimpleTooltip
                title='Stack current position'
                description='See the target distribution on top of your current position.'
              />
            </button>
          )}
          {simulatedBins.length > 0 && (
            <LiquidityBars
              bins={simulatedBins}
              aspect={3}
              batchSelected={
                batchSelected !== undefined
                  ? liquidityBatches[batchSelected].map((bin) => bin.id)
                  : undefined
              }
            />
          )}
        </div>
        <div className='batch-container'>
          {liquidityBatches.map((batch, i) => {
            if (!executeTxsTrigger) return;

            return (
              <>
                {method === 'claim' && claimInfo ? (
                  <BatchFees
                    token0={token0}
                    token1={token1}
                    binStep={binStep}
                    liquidityBatch={batch}
                    isBatchSelected={batchSelected === i}
                    setBatchSelected={setBatchSelected}
                    index={i}
                    executeTxTrigger={executeTxsTrigger[i]}
                    setExecuteTxsTrigger={setExecuteTxsTrigger}
                    claimInfo={claimBatches[i]}
                  />
                ) : (
                  <BatchLiquidity
                    key={'batch ' + i}
                    token0={token0}
                    token1={token1}
                    binStep={binStep}
                    version={version}
                    liquidityBatch={batch}
                    activeIdDesired={activeIdDesired ?? 0}
                    isAddLiquidity={method === 'add'}
                    isBatchSelected={batchSelected === i}
                    setBatchSelected={setBatchSelected}
                    chosenShape={chosenShape}
                    index={i}
                    executeTxTrigger={executeTxsTrigger[i]}
                    setExecuteTxsTrigger={setExecuteTxsTrigger}
                  />
                )}
              </>
            );
          })}
        </div>
        <Button
          text={
            method === 'add'
              ? 'Add Liquidity'
              : method === 'remove'
                ? 'Remove Liquidity'
                : 'Claim Fees'
          }
          variant='contained'
          onClick={() => {
            if (batchSelected === undefined) return;
            if (executeTxsTrigger) {
              const newExecuteTxsTrigger = new Array(
                liquidityBatches.length
              ).fill(false);
              newExecuteTxsTrigger[batchSelected] = true;
              setExecuteTxsTrigger(newExecuteTxsTrigger);
            }
          }}
          disabled={
            batchSelected === undefined ||
            (executeTxsTrigger && executeTxsTrigger[batchSelected] === true) ||
            undefined
          }
        />
      </div>
    </Modal>
  );
};

export default LiquidityBatchModal;
