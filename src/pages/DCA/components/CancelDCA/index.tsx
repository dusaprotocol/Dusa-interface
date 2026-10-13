import { useContext } from 'react';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { setPendingDCADelete } from 'utils/storage';
import { buildStopDCATx } from 'utils/transactionBuilder';
import './index.scss';

interface CancelDCAProps {
  dcaId: number;
  dcasRemoving: number[];
  setDcasRemoving: React.Dispatch<React.SetStateAction<number[]>>;
  isRemove?: boolean;
}

const CancelDCA = ({
  dcaId,
  dcasRemoving,
  setDcasRemoving,
  isRemove = false
}: CancelDCAProps) => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const { submitTx } = useSendTransaction({
    data: buildStopDCATx(dcaId),
    onTxConfirmed: () => {
      setPendingDCADelete(connectedAddress, dcaId);
      setDcasRemoving([...dcasRemoving, dcaId]);
    }
  });

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        submitTx();
      }}
      className='CancelDCA'
    >
      <span>{isRemove ? 'REMOVE' : 'CANCEL'}</span>
    </div>
  );
};

export default CancelDCA;
