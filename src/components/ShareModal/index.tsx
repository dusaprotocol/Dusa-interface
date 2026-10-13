import {
  faCheck,
  faCopy,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'components/Button';
import { SimpleInfo } from 'components/Info';
import Modal, { ModalProps } from 'components/Modal';
import useClipboard from 'hooks/useClipboard';
import './index.scss';
import { Pool } from 'utils/types';

interface ShareModalProps extends ModalProps {
  pool: Pool;
}

const ShareModal = ({ showModal, setShowModal, pool }: ShareModalProps) => {
  const link =
    window.location.origin +
    `/pools/${pool.token0.address}/${pool.token1.address}/${pool.binStep}`;
  const { copy, copied } = useClipboard(link);
  return (
    <Modal
      title='Share pool'
      showModal={showModal}
      setShowModal={setShowModal}
      variant='large'
    >
      <div className='ShareModal'>
        <SimpleInfo
          text="If the pool isn't available by default on the Pools page, then by
          sharing it, people will know that it exists."
          icon={faInfoCircle}
        />
        <Button onClick={copy} text='' variant='contained'>
          <div className='copy-button'>
            <span>Copy pool URL</span>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          </div>
        </Button>
      </div>
    </Modal>
  );
};

export default ShareModal;
