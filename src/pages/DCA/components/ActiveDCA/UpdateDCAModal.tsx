import { useContext } from 'react';
import Button from 'components/Button';
import { SimpleInfo, Warning } from 'components/Info';
import Modal, { ModalProps } from 'components/Modal';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import './UpdateDCAModal.scss';
import { readArgs } from 'utils/portfolio';
import { setPendingDCAUpdate } from 'utils/storage';
import { ICallData } from 'utils/types';

interface UpdateDCAModalProps extends ModalProps {
  data: ICallData | undefined;
  setDCAsUpdating: React.Dispatch<React.SetStateAction<number[]>>;
}

const UpdateDCAModal = ({
  data,
  setDCAsUpdating,
  showModal,
  setShowModal
}: UpdateDCAModalProps) => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const { pending: pendingUpdate, submitTx: update } = useSendTransaction({
    data,
    onTxConfirmed: () => {
      setShowModal(false);
      const id = data ? Number(readArgs(data.parameter).nextU64()) : NaN;
      setPendingDCAUpdate(connectedAddress, id);
      setDCAsUpdating((prev) => [...prev, id]);
    }
  });

  if (!data) return <Spinner />;

  return (
    <Modal title='Update DCA' showModal={showModal} setShowModal={setShowModal}>
      <div className='UpdateDCAModal'>
        <Warning text='DCA has been paused, the trade route was not optimal.' />
        <SimpleInfo text='By relaunching it, it will select the optimal trade route automatically and the DCA will resume operation with the same parameters as before.' />
        <Button
          text='Update DCA'
          variant='contained'
          onClick={update}
          pending={pendingUpdate}
        />
      </div>
    </Modal>
  );
};

export default UpdateDCAModal;
