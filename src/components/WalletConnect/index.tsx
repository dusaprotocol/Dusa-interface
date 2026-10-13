import React, { useContext } from 'react';
import { faWallet } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { printAddress } from 'utils/methods';
import './index.scss';

const WalletConnect = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);
  const { setShowDrawer } = useContext(AccountWrapperContext);

  const openAccountModal = () => {
    setShowDrawer(true);
  };

  return (
    <>
      {connectedAddress ? (
        <button className='WalletConnect' onClick={openAccountModal}>
          <span>{printAddress(connectedAddress)}</span>
        </button>
      ) : (
        <button className='WalletConnect red-notif' onClick={openAccountModal}>
          <FontAwesomeIcon icon={faWallet} />
          <span>Connect {innerWidth > 640 && 'Wallet'}</span>
        </button>
      )}
    </>
  );
};

export default WalletConnect;
