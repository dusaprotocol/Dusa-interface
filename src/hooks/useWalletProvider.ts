import { useState, useEffect } from 'react';
import { Provider } from '@massalabs/massa-web3';
import {
  getWallets,
  ListenerCtrl,
  Wallet,
  WalletName
} from '@massalabs/wallet-provider';
import { fetchAccountsBalance } from 'utils/datastoreFetcher';
import { clamp } from 'utils/methods';

export interface ProviderService {
  connected: boolean;
  connectedAddress: string;
  account: Provider | undefined;
  accounts: Provider[] | undefined;
  masBalances: number[] | undefined;
  connect(account: Provider, _accounts: Provider[]): Promise<void>;
  disconnect: () => void;
  fetchAccounts(provider: Wallet): Promise<Provider[] | undefined>;
  initClientWallet: (
    provider: Wallet,
    acc: Provider,
    _accounts: Provider[]
  ) => void;
  providerList: Wallet[] | undefined;
  selectedProvider: Wallet | undefined;
  setSelectedProvider: React.Dispatch<React.SetStateAction<Wallet | undefined>>;
  loadingProvider: string;
  errorMessage: string;
  client: Provider | undefined;
  network: string;
}

const NO_ACCOUNT_ERROR = 'No account found';
// const NOT_PROVIDER_SELECTED_ERROR = 'No provider selected';
const NO_PROVIDER_ERROR = 'No provider found. Run Wallet and reload page.';

const useWalletProvider = (): ProviderService => {
  const [accIndex, setAccIndex] = useState(
    Number(localStorage.getItem('accountIndex')) ?? 0
  );
  const [providerList, setProviderList] = useState<Wallet[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Wallet>();
  const [accounts, setAccounts] = useState<Provider[]>();
  const [masBalances, setMasBalances] = useState<number[]>();
  const [loadingProvider, setLoadingProvider] = useState(
    'Loading provider and wallet'
  );
  const [client, setClient] = useState<Provider>();
  const [network, setNetwork] = useState('');
  const [accountListener, setAccountListener] = useState<ListenerCtrl>();
  const [networkListener, setNetworkListener] = useState<ListenerCtrl>();

  const isBearbyProvider = selectedProvider?.name() === WalletName.Bearby;
  const isMetamaskProvider = selectedProvider?.name() === WalletName.Metamask;
  const account =
    accounts?.[isBearbyProvider || isMetamaskProvider ? 0 : accIndex];
  const connectedAddress = account?.address ?? '';
  const connected = !!connectedAddress;

  useEffect(() => {
    if (!selectedProvider) return;
    const isProviderIn = providerList.some(
      (provider) => provider.name() === selectedProvider.name()
    );
    !isProviderIn && disconnect();
  }, [providerList]);

  useEffect(() => {
    if (!connectedAddress) return;

    accountListener && accountListener.unsubscribe();
    if (!isBearbyProvider || isMetamaskProvider) return;
    const _listener = selectedProvider.listenAccountChanges((address) => {
      if (connectedAddress === address) return;
      fetchAccounts(selectedProvider);
    });

    setAccountListener(_listener);
  }, [connectedAddress]);

  useEffect(() => {
    networkListener && networkListener.unsubscribe();

    if (!selectedProvider) return;
    const _listener = selectedProvider.listenNetworkChanges((_network) => {
      if (_network.name === network) return;
      setNetwork(_network.name);
    });
    setNetworkListener(_listener);

    if (!accounts) return;
    fetchAccountsBalance(accounts).then(setMasBalances);
  }, [network, selectedProvider]);

  useEffect(() => {
    getProviderList().then((providers) => {
      const provider = providers.find(
        (p) => p.name() === localStorage.getItem('provider')
      );
      if (!provider) return;
      setSelectedProvider(provider);

      fetchAccounts(provider).then((_accounts) => {
        if (!_accounts) return;

        const accountIndex = clamp(accIndex, 0, _accounts.length - 1);
        initClientWallet(provider, _accounts[accountIndex], _accounts);
      });
    });
  }, []);

  useEffect(() => {
    if (!accounts) return;
    if (!selectedProvider) return;

    const accountIndex =
      isBearbyProvider || isMetamaskProvider
        ? 0
        : clamp(accIndex, 0, accounts.length - 1);
    initClientWallet(selectedProvider, accounts[accountIndex], accounts);
  }, [accounts]);

  const initClientWallet = async (
    provider: Wallet,
    acc: Provider,
    _accounts: Provider[]
  ) => {
    const cliAddress = client?.address;
    if (
      provider.name() === localStorage.getItem('provider') &&
      acc === account &&
      cliAddress === acc?.address
    )
      return;

    setClient(acc);
    localStorage.setItem('provider', provider.name());
    if (provider.name() !== WalletName.MassaWallet) return;
    connect(acc, _accounts);
  };

  async function getProviderList(): Promise<Wallet[]> {
    try {
      const providersList = await getWallets();
      if (!providersList.length) {
        setLoadingProvider('No provider detected');
        throw new Error(NO_PROVIDER_ERROR);
      }

      setProviderList(providersList);
      return providersList;
    } catch (error) {
      setErrorMessage((error as Error).message);
      return [];
    }
  }

  async function fetchAccounts(provider: Wallet) {
    try {
      const providerAccounts = await provider.accounts();
      fetchAccountsBalance(providerAccounts).then(setMasBalances);
      setAccounts(providerAccounts);
      if (!providerAccounts.length) {
        setLoadingProvider('No account detected.');
        setErrorMessage(NO_ACCOUNT_ERROR);
      }
      return providerAccounts;
    } catch (error) {
      setLoadingProvider('No account detected.');
      setErrorMessage(NO_ACCOUNT_ERROR);
    }
  }

  async function connect(acc: Provider, _accounts: Provider[]): Promise<void> {
    try {
      const index = _accounts?.findIndex((a) => a.address === acc.address) ?? 0;
      setAccIndex(index);
      if (acc.providerName === WalletName.MassaWallet)
        localStorage.setItem('accountIndex', index.toString());
      setErrorMessage('');
    } catch (error) {
      console.error('Error while connecting to Massa Station: ', error);
      resetAccountInfo();
      setErrorMessage(
        'Massa Station is not running or the wallet plugin is not installed.'
      );
    }
  }

  async function disconnect() {
    localStorage.removeItem('provider');
    resetAccountInfo();
  }

  function resetAccountInfo() {
    setAccounts(undefined);
    setClient(undefined);
  }

  return {
    connected,
    connectedAddress,
    account,
    errorMessage,
    connect,
    disconnect,
    fetchAccounts,
    initClientWallet,
    providerList,
    selectedProvider,
    setSelectedProvider,
    accounts,
    masBalances,
    loadingProvider,
    client,
    network
  };
};

export default useWalletProvider;
