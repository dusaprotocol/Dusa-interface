import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';

const StakingModal = ({ showModal, setShowModal }: ModalProps) => {
  return (
    <Modal
      title='Stake your DUSA'
      showModal={showModal}
      setShowModal={setShowModal}
    >
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2 mt-4'>
          <span className='opacity-90'>
            • Thanks for claiming the DUSA tokens you earned by using the
            protocol during the 1st season
          </span>
          <span className='opacity-90'>
            • You can now stake your DUSA at a juicy APR while awaiting their
            future utiliy
          </span>
        </div>
        <Button
          text='Close'
          variant='outlined'
          onClick={() => setShowModal(false)}
        />
      </div>
    </Modal>
  );
};

export default StakingModal;
