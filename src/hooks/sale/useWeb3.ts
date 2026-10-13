// src/hooks/useWeb3.ts
import { useState, useEffect } from 'react';
import { BrowserProvider, JsonRpcProvider, JsonRpcSigner } from 'ethers';
import { SALE_CHAIN_ID } from 'utils/configSale';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function useWeb3() {
  const [provider, setProvider] = useState<BrowserProvider>();
  const [signer, setSigner] = useState<JsonRpcSigner>();
  const [account, setAccount] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);

  const readOnlyProvider = new JsonRpcProvider(
    'https://ethereum-sepolia-rpc.publicnode.com'
  );

  useEffect(() => {
    if (!window.ethereum) {
      setIsLoading(false);
      return;
    }

    const prov = new BrowserProvider(window.ethereum);
    setProvider(prov);

    (async () => {
      const net = await prov.getNetwork();
      setChainId(Number(net.chainId));

      const accounts: string[] = await prov.send('eth_accounts', []);
      if (accounts.length) {
        setAccount(accounts[0]);
        setSigner(await prov.getSigner());
      }
      setIsLoading(false);
    })();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length) {
        setAccount(accounts[0]);
        setSigner(await prov.getSigner());
      } else {
        setAccount(undefined);
        setSigner(undefined);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const handleDisconnect = (error: { code: number; message: string }) => {
      console.warn('MetaMask provider disconnected', error);
      setAccount(undefined);
      setSigner(undefined);
    };

    let prevAccounts: string[] = [];
    const intervalId = setInterval(async () => {
      try {
        const accounts: string[] = await prov.send('eth_accounts', []);
        if (
          accounts.length !== prevAccounts.length ||
          accounts[0] !== prevAccounts[0]
        ) {
          prevAccounts = accounts;
          if (accounts.length) {
            setAccount(accounts[0]);
            setSigner(await prov.getSigner());
          } else {
            setAccount(undefined);
            setSigner(undefined);
          }
        }
      } catch (err) {
        console.error('Erreur polling eth_accounts', err);
      }
    }, 3000);

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener(
          'accountsChanged',
          handleAccountsChanged
        );
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('handleDisconnect', handleDisconnect);
        clearInterval(intervalId);
      }
    };
  }, []);

  const connect = async () => {
    if (!provider) {
      setIsLoading(false);
      window.open('https://metamask.io/download.html');
      throw new Error('No metamask provider found');
    }
    const accounts: string[] = await provider.send('eth_requestAccounts', []);
    if (accounts.length) {
      setAccount(accounts[0]);
      setSigner(await provider.getSigner());
      const net = await provider.getNetwork();
      setChainId(Number(net.chainId));
    }
    setIsLoading(false);
  };

  const disconnect = () => {
    setAccount(undefined);
    setSigner(undefined);
  };

  const isCorrectNetwork = chainId === parseInt(SALE_CHAIN_ID, 16);

  return {
    provider,
    readOnlyProvider,
    signer,
    account,
    chainId,
    connect,
    disconnect,
    isCorrectNetwork,
    isLoading
  };
}
