import { faEye, faLock, faHeart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import WalletConnect from 'components/WalletConnect';
import './index.scss';

const WalletConnectWrapper = () => {
  return (
    <div className='WalletConnectWrapper'>
      <WalletConnect />
      <div className='WalletConnectWrapper-bottom'>
        <div>
          <FontAwesomeIcon icon={faEye} />
          <div>
            View only permissions. We will never do anything without your
            approval.
          </div>
        </div>
        <div>
          <FontAwesomeIcon icon={faLock} />
          <div>
            Open-source{' '}
            <a
              href='https://github.com/dusaprotocol/smart-contracts'
              target='_blank'
              rel='noopener noreferrer'
            >
              Smart Contracts
            </a>
          </div>
        </div>
        <div>
          <FontAwesomeIcon icon={faHeart} />
          <div>Trusted by 1234 customers</div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectWrapper;
