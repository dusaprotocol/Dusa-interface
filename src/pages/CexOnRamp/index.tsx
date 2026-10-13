import { useContext, useEffect } from 'react';
import { renderSendWidget } from '@cedelabs/widgets-universal';
import ConnectButton from 'components/ConnectButton';
import PageHeader from 'components/PageHeader';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import ErrorPage from 'pages/ErrorPage';
import { FEATURE_FLAGS } from 'utils/config';
import './index.scss';

const CexOnRamp = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  useEffect(() => {
    if (!connectedAddress || !FEATURE_FLAGS.CEDESTORE) return;
    renderSendWidget('#send-widget', {
      theme: {
        logoTheme: 'dark',
        mode: 'dark',
        primaryColor: '#060d18',
        primaryTextColor: '#ffffff',
        secondaryTextColor: '#ccc',
        logoBorderColor: '#2992D0',
        accentColor: '#2992D0',
        buttonTextColor: '#d35d26'
      },
      config: {
        tokenSymbol: 'MAS',
        network: 'massa',
        address: connectedAddress
      }
    });
  }, [connectedAddress]);

  if (!FEATURE_FLAGS.CEDESTORE) return <ErrorPage />;

  return (
    <div className='CexOnRamp'>
      <PageHeader
        title='Cex on-ramp'
        description='Transfer your CEX assets to your wallet'
      />
      <div className='cexOnRamp-container'>
        {connectedAddress ? (
          <div>
            <div id='send-widget'></div>
          </div>
        ) : (
          <div>
            <ConnectButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default CexOnRamp;
