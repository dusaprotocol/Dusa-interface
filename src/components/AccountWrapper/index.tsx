import { ReactNode, useState } from 'react';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAccount from 'hooks/useFetchAccount';

import useWalletProvider from 'hooks/useWalletProvider';

interface AccountWrapperProps {
  children: ReactNode;
}

const AccountWrapper = ({ children }: AccountWrapperProps) => {
  const [showDrawer, setShowDrawer] = useState(false);

  const providerService = useWalletProvider();
  const address = providerService.connectedAddress;
  const accountInfo = useFetchAccount(address);

  const closeDrawer = () => {
    setShowDrawer(false);
  };

  return (
    <AccountWrapperContext.Provider
      value={{
        ...accountInfo,
        showDrawer,
        setShowDrawer,
        refetch: accountInfo.refetch,
        closeDrawer,
        ...providerService
      }}
    >
      {children}
    </AccountWrapperContext.Provider>
  );
};

export default AccountWrapper;
