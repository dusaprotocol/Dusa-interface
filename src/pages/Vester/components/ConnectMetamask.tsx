import Button, { ButtonProps } from 'components/Button';
import useWeb3 from 'hooks/sale/useWeb3';
import { IS_BUILDNET } from 'utils/config';
import { isMobile as isMobileFunction, printAddress } from 'utils/methods';
import { switchToEthereum, switchToSepoliaTestnet } from 'utils/web3';

const ConnectMetamask = (props: Partial<ButtonProps>) => {
  const { provider, account, connect, isCorrectNetwork, isLoading } = useWeb3();
  const isMobile = isMobileFunction();

  const deepLinkMetamask = () => {
    const url = `https://metamask.app.link/dapp/${window.location.host}/sale`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleClick = async () => {
    if (!provider) {
      if (isMobile) deepLinkMetamask();
      else connect();
      return;
    }

    if (!account) {
      connect();
      return;
    }

    if (!isCorrectNetwork) {
      try {
        if (IS_BUILDNET) {
          await switchToSepoliaTestnet();
        } else {
          await switchToEthereum();
        }
      } catch (err) {
        console.error('Erreur switch réseau', err);
      }
    }
  };

  const text = !provider
    ? isMobile
      ? 'Launch MetaMask'
      : 'Install MetaMask'
    : !account
      ? 'Connect Ethereum Wallet'
      : !isCorrectNetwork
        ? `Switch to ${IS_BUILDNET ? 'Ethereum testnet' : 'Ethereum'}`
        : printAddress(account);

  const isDisabled = (account && isCorrectNetwork) || undefined;

  return (
    <Button
      text={text}
      onClick={handleClick}
      pending={isLoading}
      disabled={isDisabled}
      variant='contained'
      {...props}
    />
  );
};

export default ConnectMetamask;
