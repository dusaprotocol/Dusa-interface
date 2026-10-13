import React, { useContext, useEffect, useState } from 'react';
import { faArrowRight, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import { parseUnits } from 'ethers';
import DCAModal from 'components/DCAModal';
import Spinner from 'components/Spinner';
import TokenLogo from 'components/TokenLogo';
import Tooltip from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useManageDCA } from 'hooks/useManageDCA';
import usePairManager from 'hooks/usePairManager';
import { getMasIfWmas } from 'utils/coreMethods';
import { fetchDCA } from 'utils/datastoreFetcher';
import {
  getIntervalFromSeconds,
  getTokenFromAddress,
  printBigintIsh,
  roundTokenAmount
} from 'utils/methods';
import './index.scss';
import { pools } from 'utils/pools';
import { getPendingDCAUpdate, setPendingDCAUpdateRemove } from 'utils/storage';
import { buildUpdateDCATx } from 'utils/transactionBuilder';
import { dCA, trpc } from 'utils/trpc';
import { ICallData, RefetchDrawerElement } from 'utils/types';
import NoDCA from '../ActiveDCA/NoDCA';
import UpdateDCAModal from '../ActiveDCA/UpdateDCAModal';
import CancelDCA from '../CancelDCA';

interface DCAHistoryProps {
  dcas: dCA[];
  refetch: ((elements?: RefetchDrawerElement[]) => void) | (() => void);
  isLoading: boolean;
}

const DCAHistory = ({ dcas, refetch, isLoading }: DCAHistoryProps) => {
  const { connected, connectedAddress } = useContext(AccountWrapperContext);
  const [showModal, setShowModal] = useState(false);
  const [showModalUpdate, setShowModalUpdate] = useState(false);
  const [dcaIdSelected, setDcaIdSelected] = useState<number | undefined>();
  const [dataDCA, setDataDCA] = useState<ICallData | undefined>();

  const dcasExecution =
    dcas &&
    dcas
      .filter(
        (dca) =>
          dca.status !== 'ACTIVE' ||
          dca.execution.length === dca.nbOfDCA ||
          (Date.now() - dca.startTime.getTime()) / dca.interval >=
            dca.execution.length + 1
      )
      .map((dca) => {
        return {
          ...dca,
          endTime: new Date(
            dca.startTime.getTime() + dca.interval * dca.execution.length
          )
        };
      })
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

  const { dcasRemoving, dcasUpdating, setDcasRemoving, setDcasUpdating } =
    useManageDCA(dcasExecution, connectedAddress);

  useEffect(() => {
    if (dcasUpdating.length > 0) {
      if (dcas && dcas.length > 0) {
        dcas.forEach((dca) => {
          if (dcasUpdating.includes(dca.id)) {
            const interval = setInterval(() => {
              if (dca.status === 'ERRORED_QUOTER') {
                refetch(['dcas', 'balances']);
              } else {
                setPendingDCAUpdateRemove(
                  connectedAddress,
                  dcasUpdating.filter(
                    (dcaUpdating) =>
                      dcas.find((d) => d.id === dcaUpdating) === undefined
                  )
                );
                setDcasUpdating(getPendingDCAUpdate(connectedAddress));
                clearInterval(interval);
              }
            }, 4000);
          }
        });
      }
    }
  }, [dcas, dcasUpdating.length]);

  if (!connected)
    return (
      <div className='connect-wallet'>
        Connect your wallet to see your DCA history.
      </div>
    );
  if (!dcasExecution || isLoading) return <Spinner />;

  return (
    <div className='DCAHistory'>
      {!dcasExecution.length ? (
        <NoDCA isActive={false} isDCAPage />
      ) : (
        <>
          {dcasExecution.map((dca) => {
            return (
              <DCACardHistory
                key={dca.endTime + '' + dca.id}
                dca={dca}
                dcasUpdating={dcasUpdating}
                dcasRemoving={dcasRemoving}
                setShowModalUpdate={setShowModalUpdate}
                setDcasRemoving={setDcasRemoving}
                setDcaIdSelected={setDcaIdSelected}
                setShowModal={setShowModal}
                setDataDCA={setDataDCA}
              />
            );
          })}
        </>
      )}
      {showModal && dcaIdSelected ? (
        <DCAModal
          dcas={dcasExecution}
          dcaIdSelected={dcaIdSelected}
          setDcaIdSelected={setDcaIdSelected}
          showModal={showModal}
          setShowModal={setShowModal}
        />
      ) : (
        showModalUpdate && (
          <UpdateDCAModal
            data={dataDCA}
            setDCAsUpdating={setDcasUpdating}
            showModal={showModalUpdate}
            setShowModal={setShowModalUpdate}
          />
        )
      )}
    </div>
  );
};

export default DCAHistory;

interface DCACardHistoryProps {
  dca: dCA;
  dcasUpdating: number[];
  dcasRemoving: number[];
  setDcasRemoving: React.Dispatch<React.SetStateAction<number[]>>;
  setShowModalUpdate?: (show: boolean) => void;
  setDataDCA: (data: ICallData) => void;
  setDcaIdSelected: (dcaId: number | undefined) => void;
  setShowModal: (show: boolean) => void;
  isDrawer?: boolean;
}

const DCACardHistory = ({
  dca,
  dcasUpdating,
  dcasRemoving,
  setDcasRemoving,
  setShowModalUpdate,
  setDataDCA,
  setDcaIdSelected,
  setShowModal
}: DCACardHistoryProps) => {
  const tokenIn = getTokenFromAddress(dca.tokenIn);
  const tokenOut = getMasIfWmas(getTokenFromAddress(dca.tokenOut));
  const isTransferError = dca.status === 'ERRORED_TRANSFER';
  const isQuoterError = dca.status === 'ERRORED_QUOTER';
  const isEnded = dca.status === 'ENDED';
  const isStopped = isTransferError || dca.status === 'STOPPED';
  const [threshold, setThreshold] = useState<number>();
  const { connectedAddress } = useContext(AccountWrapperContext);

  const { bestTrade, fetchBestTrade } = usePairManager({
    token0: tokenIn,
    token1: tokenOut,
    setToken0: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
    setToken1: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
    binStep: 0
  });

  const { data: price } = trpc.getTokenValue.useQuery(
    { tokenAddress: tokenIn.address, tokenDecimals: tokenIn.decimals },
    { enabled: !!tokenIn }
  );

  const quantityDollarValue =
    price && dca.amountEachDCA
      ? price * roundTokenAmount(tokenIn, dca.amountEachDCA)
      : undefined;

  useEffect(() => {
    fetchBestTrade(
      roundTokenAmount(tokenIn, dca.amountEachDCA).toString(),
      true
    );
  }, []);

  useEffect(() => {
    async function fetchData() {
      const dcaFetched = await fetchDCA(connectedAddress, dca.id);
      setThreshold(dcaFetched?.threshold);
    }
    fetchData();
  }, [connectedAddress, dca.id]);

  const isDCAUpdating = dcasUpdating.includes(dca.id);
  const isBigPool = bestTrade?.quote.pairs.includes(pools[0].pairAddress); // WMAS-USDC pool TODO rajouter BTC USDC pool

  return (
    <div
      className='w-full dca-history-item'
      key={dca.endTime + '' + dca.id}
      onClick={() => {
        setDcaIdSelected(dca.id);
        setShowModal(true);
      }}
    >
      <div className='flex flex-wrap justify-between items-center gap-2'>
        <div>
          <div className='flex items-center gap-1 text-sm'>
            <TokenLogo logoURI={tokenIn.logoURI} />
            <span>{tokenIn.symbol}</span>
            <FontAwesomeIcon icon={faArrowRight} />
            <TokenLogo logoURI={tokenOut.logoURI} />
            <span>{tokenOut.symbol}</span>
          </div>
        </div>
        <div>
          <div className='flex items-center gap-2 w-full'>
            <div
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-xl font-medium text-xs',
                isEnded
                  ? 'bg-[#0056ad]'
                  : isStopped
                    ? 'bg-[#ad1d00]'
                    : isQuoterError
                      ? 'bg-[#ad8f00]'
                      : 'bg-[#ad1d00]'
              )}
            >
              {isTransferError
                ? 'STOPPED'
                : isQuoterError
                  ? 'PAUSED'
                  : isEnded
                    ? 'ENDED'
                    : 'STOPPED'}
              {(isTransferError || isQuoterError) && (
                <Tooltip
                  trigger={<FontAwesomeIcon icon={faCircleInfo} />}
                  position='left bottom'
                >
                  <div className='min-w-[180px]'>
                    {isTransferError ? (
                      <span className=''>
                        DCA stopped due to insufficient balance or allowance.
                      </span>
                    ) : (
                      <span className=''>
                        DCA paused due to insufficient pool liquidity. The DCA
                        is relaunchable.
                      </span>
                    )}
                  </div>
                </Tooltip>
              )}
            </div>
            {isQuoterError && (
              <>
                <span>(</span>
                <Tooltip
                  trigger={
                    <button
                      className={clsx(
                        'flex items-center gap-1 bg-[#357813] hover:brightness-110 px-2 py-1 rounded-xl font-medium text-xs cursor-pointer',
                        (bestTrade === undefined || isDCAUpdating) &&
                          'opacity-50'
                      )}
                      disabled={bestTrade === undefined || isDCAUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModalUpdate && setShowModalUpdate(true);
                        setDataDCA(
                          buildUpdateDCATx({
                            id: dca.id,
                            amountEachDCA: parseUnits(
                              dca.amountEachDCA,
                              tokenIn.decimals
                            ),
                            interval: dca.interval,
                            nbOfDCA: dca.nbOfDCA,
                            tokenPath:
                              bestTrade?.route.path.map(
                                (token) => token.address
                              ) ?? [],
                            threshold: threshold ?? 10,
                            startIn: 0,
                            moreGas: quantityDollarValue
                              ? isBigPool
                                ? quantityDollarValue >= 100
                                : quantityDollarValue >= 50
                              : true
                          })
                        );
                      }}
                    >
                      {isDCAUpdating && (
                        <>
                          <Spinner size={15} />{' '}
                        </>
                      )}
                      RELAUNCH
                    </button>
                  }
                  position='left bottom'
                >
                  <div className='min-w-[250px]'>
                    You can relaunch this DCA with the exact same parameters.
                  </div>
                </Tooltip>
                <span>/</span>
                <Tooltip
                  trigger={
                    <CancelDCA
                      dcaId={dca.id}
                      dcasRemoving={dcasRemoving}
                      setDcasRemoving={setDcasRemoving}
                      isRemove
                    />
                  }
                  position='left bottom'
                >
                  <div className='min-w-[250px]'>
                    DCA paused due to insufficient pool liquidity. Remove it to
                    free chain storage space.
                  </div>
                </Tooltip>
                <span>)</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className='dca-history-content'>
        <div className='dca-history-content-item'>
          <span>Id</span>
          <span>{dca.id}</span>
        </div>
        <div className='dca-history-content-item'>
          <span>Amount</span>
          <span>
            {printBigintIsh(tokenIn, dca.amountEachDCA)} {tokenIn.symbol}
          </span>
        </div>
        <div className='dca-history-content-item'>
          <span>Interval</span>
          <span>{getIntervalFromSeconds(dca.interval / 1000)}</span>
        </div>
        <div className='dca-history-content-item'>
          <span>Executed</span>
          <span>
            {dca.execution.length}/{dca.nbOfDCA || '∞'}
          </span>
        </div>
        <div className='dca-history-content-item'>
          <span>End Date</span>
          <span>{new Date(dca.endTime).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
