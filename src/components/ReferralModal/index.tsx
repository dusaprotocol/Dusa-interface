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

interface ReferralModalProps extends ModalProps {
  userAddress: string;
}

const ReferralModal = ({
  showModal,
  setShowModal,
  userAddress
}: ReferralModalProps) => {
  const link = `${window.location.origin}/trade?ref=${userAddress}`;
  const { copy, copied } = useClipboard(link);

  return (
    <Modal
      title='Referral Link'
      showModal={showModal}
      setShowModal={setShowModal}
      variant='large'
    >
      <div className='ReferralModal'>
        <SimpleInfo
          text="Share your referral link with others. When they use your link to trade, you'll both benefit from the referral program."
          icon={faInfoCircle}
        />
        <div className='referral-link-preview'>
          <span>Your referral link:</span>
          <code>{link}</code>
        </div>
        <Button onClick={copy} text='' variant='contained'>
          <div className='copy-button'>
            <span>Copy referral link</span>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          </div>
        </Button>
      </div>
    </Modal>
  );
};

export default ReferralModal;
