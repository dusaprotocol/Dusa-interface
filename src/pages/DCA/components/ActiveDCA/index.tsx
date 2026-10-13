import React, { useContext, useEffect, useState } from 'react';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import dayjs from 'dayjs';
import DCAModal from 'components/DCAModal';
import Info from 'components/Info';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useManageDCA } from 'hooks/useManageDCA';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  getIntervalFromSeconds,
  getTokenFromAddress,
  printBigintIsh
} from 'utils/methods';
import { getPendingDCACreation } from 'utils/storage';
import { dCA } from 'utils/trpc';
import { RefetchDrawerElement } from 'utils/types';
import NoDCA from './NoDCA';
import CancelDCA from '../CancelDCA';
import './index.scss';

interface ActiveDCAProps {
  dcas: dCA[];
  refetch: ((elements?: RefetchDrawerElement[]) => void) | (() => void);
  isLoading: boolean;
  isDrawer?: boolean;
}

const ActiveDCA = ({
  dcas: _dcas,
  refetch,
  isLoading,
  isDrawer = false
}: ActiveDCAProps) => {
  const [showModal, setShowModal] = useState(false);
  const [dcaIdSelected, setDcaIdSelected] = useState<number | undefined>();
  const { connected, connectedAddress } = useContext(AccountWrapperContext);

  const dcas =
    _dcas &&
    _dcas
      .filter((dca) => dca.status === 'ACTIVE')
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

  const { dcasLoading, dcasRemoving, setDcasRemoving } = useManageDCA(
    dcas,
    connectedAddress
  );

  useEffect(() => {
    if (dcasLoading.length > 0 || dcasRemoving.length > 0) {
      const interval = setInterval(() => refetch(['dcas', 'balances']), 4000);
      return () => clearInterval(interval);
    }
  }, [dcasLoading.length, dcasRemoving.length]);

  if (!connected)
    return (
      <div className='connect-wallet'>
        Connect your wallet to see your DCAs.
      </div>
    );
  if (
    !dcas ||
    (isLoading && getPendingDCACreation(connectedAddress).length === 0)
  )
    return <Spinner />;

  const validDCAs = dcas
    .filter(
      (dca) =>
        (dca.execution.length < dca.nbOfDCA || !dca.nbOfDCA) &&
        (Date.now() - dca.startTime.getTime()) / dca.interval <
          dca.execution.length + 1 &&
        !dcasRemoving.includes(dca.id)
    )
    .sort((a, b) => b.id - a.id);

  return (
    <div className='ActiveDCA'>
      {validDCAs.length === 0 && dcasLoading.length === 0 ? (
        <NoDCA isActive isDCAPage />
      ) : (
        <>
          {dcasLoading.length > 0 &&
            dcasLoading.map((dca) => (
              <Info key={'loading dca' + dca} isLoading>
                <div className='flex flex-wrap gap-x-1'>
                  <span>DCA information is currently being loaded.</span>
                  <span>(it can take up to one minute)</span>
                </div>
              </Info>
            ))}
          {validDCAs.map((dca, index) => (
            <>
              <DCACard
                key={dca.endTime + '' + dca.id}
                dca={dca}
                dcasRemoving={dcasRemoving}
                setDcasRemoving={setDcasRemoving}
                setDcaIdSelected={setDcaIdSelected}
                setShowModal={setShowModal}
                isDrawer={isDrawer}
              />
              {index !== validDCAs.length - 1 && <div className='line'></div>}
            </>
          ))}
        </>
      )}
      {showModal && dcaIdSelected !== undefined && (
        <DCAModal
          dcas={validDCAs}
          dcaIdSelected={dcaIdSelected}
          setDcaIdSelected={setDcaIdSelected}
          showModal={showModal}
          setShowModal={setShowModal}
          isActiveDca={true}
        />
      )}
    </div>
  );
};

export default ActiveDCA;

interface DCACardProps {
  dca: dCA;
  dcasRemoving: number[];
  setDcasRemoving: React.Dispatch<React.SetStateAction<number[]>>;
  setShowModalUpdate?: (show: boolean) => void;
  setDcaIdSelected: (dcaId: number | undefined) => void;
  setShowModal: (show: boolean) => void;
  isDrawer?: boolean;
}

export const DCACard = ({
  dca,
  dcasRemoving,
  setDcasRemoving,
  setDcaIdSelected,
  setShowModal,
  isDrawer = false
}: DCACardProps) => {
  const tokenIn = getTokenFromAddress(dca.tokenIn);
  const tokenOut = getMasIfWmas(getTokenFromAddress(dca.tokenOut));
  const endTimeInvalid = !dayjs(dca.endTime).isValid();

  return (
    <div
      className={clsx('DCACard', isDrawer && 'dcaCard-remove-bg')}
      onClick={() => {
        setDcaIdSelected(dca.id);
        setShowModal(true);
      }}
    >
      <div className='asset-details'>
        <div className='dca-asset-header'>
          <div className='dca-tokens'>
            <img src={tokenIn.logoURI} alt='token URL' />
            <span>{tokenIn.symbol}</span>
            <FontAwesomeIcon icon={faArrowRight} />
            <img src={tokenOut.logoURI} alt='token URL' />
            <span>{tokenOut.symbol}</span>
          </div>
          <div className='dca-status-container'>
            <div className='dca-status'>
              <span>ACTIVE</span>
            </div>
            <CancelDCA
              dcaId={dca.id}
              dcasRemoving={dcasRemoving}
              setDcasRemoving={setDcasRemoving}
            />
          </div>
        </div>
        <div className='dca-asset-content'>
          <div className='dca-content-item'>
            <span>Id</span>
            <span>{dca.id}</span>
          </div>
          <div className='dca-content-item'>
            <span>Amount</span>
            <span>
              {printBigintIsh(tokenIn, dca.amountEachDCA)} {tokenIn.symbol}
            </span>
          </div>
          <div className='dca-content-item'>
            <span>Executed</span>
            <span>
              {dca.execution.length} / {dca.nbOfDCA || '∞'}
            </span>
          </div>
          <div className='dca-content-item'>
            <span>Interval</span>
            <span>{getIntervalFromSeconds(dca.interval / 1000)}</span>
          </div>
          <div className='dca-content-item'>
            <span>Ends</span>
            <span>
              {dayjs().year() + 15 < dayjs(dca.endTime).year() ||
              endTimeInvalid ||
              dca.nbOfDCA === 0 ? (
                '∞'
              ) : (
                <>{dayjs(dca.endTime).format('MMMM D, YYYY, h:mm:ss A')}</>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
